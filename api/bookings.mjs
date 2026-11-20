import { randomUUID } from 'node:crypto';
import '../config.js';
import '../holidays.js';
import availability from '../availability.js';
import card from '../booking-card.js';
import { bookingCode, bookings, hexKey, json, matchesSecret, settingIssue, sheetsSetupIssues } from '../_server/booking-store.mjs';

const experiences = ['手拉胚', '陶杯刻畫', '植物槌染'];
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fullCodePattern = new RegExp(`^${bookingCode}$`);
const shortCodePattern = /^BK-[0-9A-F]{12}$/;

function bookingLocation(experience) {
  return experience === '植物槌染' ? '雲梯廣場第一涼亭處' : '無二窯藝術空間';
}

async function lookup(request) {
  const body = await request.text();
  if (body.length > 512) return json({}, 413);
  const input = JSON.parse(body);
  const code = typeof input?.code === 'string' ? input.code.trim().toUpperCase() : '';
  const phone = input?.phone;
  if ((!shortCodePattern.test(code) && !fullCodePattern.test(code)) ||
      typeof phone !== 'string' || !/^09[0-9]{8}$/.test(phone)) {
    return json({ error: '請輸入正確的預約編號與手機號碼。' }, 400);
  }
  const shortCode = card.shortBookingCode(code);
  let rows = await bookings('lookup', { code: shortCode, phone });
  // Older Apps Script deployments return null for the lookup action.
  if (rows == null) {
    const legacyRows = await bookings('list', { code });
    if (Array.isArray(legacyRows)) rows = legacyRows.filter(row => row.phone === phone);
  }
  if (!Array.isArray(rows)) return json({ error: '查詢服務暫時無法使用。' }, 503);
  const matches = fullCodePattern.test(code) ? rows.filter(row => row.code === code) : rows;
  if (matches.length !== 1) {
    return json({ error: '查無符合的預約，請確認預約編號與手機號碼。' }, 404);
  }
  const { experience, date, time, people, status } = matches[0];
  return json({ booking: { code: shortCode, experience, date, time, people, status,
    ...(status === 'confirmed' ? { location: bookingLocation(experience) } : {}) } });
}

async function updateBooking(request, code) {
  const body = await request.text();
  if (body.length > 512) return json({}, 413);
  const { action = 'confirm', date, time } = (body ? JSON.parse(body) : {}) ?? {};
  if (!['confirm', 'reschedule'].includes(action) || ((date !== undefined || time !== undefined) &&
      (action !== 'confirm' || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(date + 'T00:00:00Z').toJSON()?.slice(0, 10) !== date ||
      typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))) {
    return json({ error: '請確認預約狀態及日期時間格式。' }, 400);
  }
  const booking = await bookings(action === 'confirm' ? 'confirmAndNotify' : action, { code, date, time, retryKey: randomUUID() });
  if (!booking) return json({ error: '查無預約，或 Apps Script 尚未更新。' }, 404);
  if (booking.conflict) return json({ error: '這筆預約已確認，請重新整理名單。' }, 409);
  if (action === 'reschedule') return json({ ok: true });
  if (!booking.code) return json({ error: '請先將 Apps Script 更新至最新版。' }, 503);
  if (booking.notified) return json({ notification: 'sent' });
  if (!booking.userId) return json({ notification: 'unlinked' });
  if (Date.now() - booking.attemptedAt >= 23 * 3600000) return json({ notification: 'manual' });

  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    if (!token) throw new Error('Missing LINE token');
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Line-Retry-Key': booking.retryKey },
      body: JSON.stringify({ to: booking.userId, messages: [card.bookingCard({
        ...booking, location: bookingLocation(booking.experience), lookupUrl: card.bookingLookupUrl(request.url, code)
      }, true)] }),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok && !(response.status === 409 && response.headers.has('x-line-accepted-request-id'))) {
      throw new Error('LINE push rejected');
    }
    if (!await bookings('notificationSent', { code, retryKey: booking.retryKey })) throw new Error('Notification record not saved');
    return json({ notification: 'sent' });
  } catch {
    return json({ notification: 'failed' });
  }
}

async function linkLineBooking(request) {
  const body = await request.text();
  if (body.length > 4096) return json({}, 413);
  let input;
  try { input = JSON.parse(body); } catch { return json({}, 400); }
  const { code, idToken } = input ?? {};
  if (typeof code !== 'string' || !fullCodePattern.test(code) || typeof idToken !== 'string' || !idToken) return json({}, 400);

  const verify = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    body: new URLSearchParams({ id_token: idToken, client_id: globalThis.BOOKING_CONFIG.liffId.split('-')[0] }),
    signal: AbortSignal.timeout(5000)
  });
  if (!verify.ok) return json({}, 401);
  const profile = await verify.json();
  if (typeof profile.sub !== 'string' || !/^U[0-9a-f]{32}$/.test(profile.sub)) return json({}, 401);
  const booking = await bookings('link', {
    code, userId: profile.sub, displayName: typeof profile.name === 'string' ? profile.name.slice(0, 100) : null,
    timestamp: Date.now()
  });
  return booking ? json({ linked: true }) : json({}, 409);
}

async function save(request) {
  const body = await request.text();
  if (body.length > 2048) return json({ error: '預約資料過長。' }, 413);
  let input;
  try { input = JSON.parse(body); } catch { return json({ error: '預約資料格式錯誤。' }, 400); }
  const { requestId, experience, date, time, people, name, phone } = input ?? {};
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId) ||
      !experiences.includes(experience) || !Number.isInteger(people) || people < 1 || people > 999 ||
      typeof name !== 'string' || !name.trim() || name.length > 50 ||
      typeof phone !== 'string' || !/^09[0-9]{8}$/.test(phone) ||
      typeof date !== 'string' || typeof time !== 'string') {
    return json({ error: '請確認姓名、手機與預約內容。' }, 400);
  }

  const dateReason = availability.bookingDateReason(date, globalThis.BOOKING_CONFIG, availability.today(), experience);
  if (dateReason) return json({ error: dateReason }, 400);
  if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
      !availability.allowedBookingTimes(date, experience).includes(time)) {
    return json({ error: '請重新選擇日期與時段。' }, 400);
  }

  const code = 'BK-' + requestId.replaceAll('-', '').toUpperCase();
  const created = await bookings('create', { code, experience, date, time, people, name: name.trim(), phone });
  if (created === false) return json({ error: '此體驗當日暫停預約，請選擇其他日期。' }, 409);
  return json({ code }, 201);
}

export default {
  async fetch(request) {
    const params = new URL(request.url).searchParams;
    const publicClosures = request.method === 'GET' && params.has('availability');
    const publicLookup = request.method === 'POST' && params.has('lookup');
    const adminRequest = !publicClosures && (request.method === 'GET' || request.method === 'PATCH');
    if (adminRequest) {
      if (settingIssue('BOOKING_ADMIN_KEY', hexKey)) return json({ error: '管理金鑰尚未設定，或格式不正確。' }, 503);
      const adminKey = process.env.BOOKING_ADMIN_KEY.trim();
      if (!matchesSecret(request.headers.get('authorization') ?? '', `Bearer ${adminKey}`)) return json({}, 401);
      if (request.method === 'GET' && params.has('check')) return json({ authenticated: true });
    }
    const issues = [
      ...sheetsSetupIssues(),
      ...(adminRequest || publicClosures || publicLookup ? [] : [settingIssue('LINE_CHANNEL_SECRET'), settingIssue('LINE_CHANNEL_ACCESS_TOKEN')])
    ].filter(Boolean);
    if (issues.length) {
      console.warn(`Booking setup: ${issues.join(', ')}`);
      return json({ error: '預約系統尚未完成設定。' }, 503);
    }

    try {
      if (publicLookup) return await lookup(request);
      if (request.method === 'POST') return params.has('link') ? await linkLineBooking(request) : await save(request);
      if (publicClosures || (adminRequest && request.method === 'GET' && params.has('closures'))) {
        const closures = await bookings('listClosures', { from: availability.today() });
        if (!Array.isArray(closures)) return json({ error: '暫停預約功能尚未就緒。請在 Google Apps Script 更新 Bookings.gs，並將現有的網頁應用程式部署為新版本。' }, 503);
        return json({ closures });
      }
      if (!adminRequest) return json({}, 405);
      if (request.method === 'PATCH' && params.has('closures')) {
        const body = await request.text();
        if (body.length > 512) return json({}, 413);
        let input;
        try { input = JSON.parse(body); } catch { return json({ error: '日期設定格式不正確。' }, 400); }
        const { date, experience, closed } = input ?? {};
        const from = availability.today();
        if (!experiences.includes(experience) || typeof closed !== 'boolean' || typeof date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < from ||
            new Date(date + 'T00:00:00Z').toJSON()?.slice(0, 10) !== date) {
          return json({ error: '請選擇今天或之後的有效日期與體驗。' }, 400);
        }
        const closures = await bookings('setClosure', { date, experience, closed, from });
        if (!Array.isArray(closures)) return json({ error: '無法確認暫停設定。請確認現有的 Apps Script 網頁應用程式已部署最新版 Bookings.gs，再重新整理後台查看。' }, 503);
        return json({ closures });
      }

      const code = params.get('code')?.trim().toUpperCase();
      if (request.method === 'PATCH') {
        if (!code || !fullCodePattern.test(code)) return json({ error: '預約編號格式不正確。' }, 400);
        return await updateBooking(request, code);
      }
      if (code && !fullCodePattern.test(code) && !shortCodePattern.test(code)) return json({ error: '預約編號格式不正確。' }, 400);
      const rows = await bookings('list', { code });
      return json({ rows });
    } catch (error) {
      if (error instanceof SyntaxError) return json({ error: '資料格式不正確。' }, 400);
      if (adminRequest && params.has('closures')) {
        return json({ error: '暫停預約服務暫時無法連線。請確認 Apps Script 已部署最新版 Bookings.gs，並查看 Vercel Logs 中的 Booking Sheets 訊息。' }, 503);
      }
      const sheetMessage = {
        sheet_not_initialized: 'Apps Script 尚未連結預約試算表，請在預約試算表的指令碼專案執行 setupBookingSheet。',
        sheet_tab_missing: '找不到「預約名單」分頁，請確認當初設定的預約試算表。',
        sheet_headers_changed: '「預約名單」前 12 欄的欄名或順序與程式不符，請核對 Bookings.gs 的 BOOKING_HEADERS。'
      }[error.code];
      return json({ error: adminRequest ? sheetMessage || '管理金鑰已驗證，但暫時無法讀寫 Google 試算表。' : '暫時無法處理預約，請稍後重試。' }, 503);
    }
  }
};
