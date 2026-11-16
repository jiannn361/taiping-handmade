import '../config.js';
import '../holidays.js';
import availability from '../availability.js';
import { bookingCode, bookings, hexKey, json, matchesSecret, settingIssue, sheetsSetupIssues } from '../_server/booking-store.mjs';

const experiences = ['手拉胚', '陶杯刻畫', '植物槌染'];
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fullCodePattern = new RegExp(`^${bookingCode}$`);
const shortCodePattern = /^BK-[0-9A-F]{12}$/;

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
    const adminRequest = !publicClosures && (request.method === 'GET' || request.method === 'PATCH');
    if (adminRequest) {
      if (settingIssue('BOOKING_ADMIN_KEY', hexKey)) return json({ error: '管理金鑰尚未設定，或格式不正確。' }, 503);
      const adminKey = process.env.BOOKING_ADMIN_KEY.trim();
      if (!matchesSecret(request.headers.get('authorization') ?? '', `Bearer ${adminKey}`)) return json({}, 401);
      if (request.method === 'GET' && params.has('check')) return json({ authenticated: true });
    }
    const issues = [
      ...sheetsSetupIssues(),
      ...(adminRequest || publicClosures ? [] : [settingIssue('LINE_CHANNEL_SECRET'), settingIssue('LINE_CHANNEL_ACCESS_TOKEN')])
    ].filter(Boolean);
    if (issues.length) {
      console.warn(`Booking setup: ${issues.join(', ')}`);
      return json({ error: '預約系統尚未完成設定。' }, 503);
    }

    try {
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
        const updated = await bookings('confirm', { code });
        return updated ? json({ ok: true }) : json({ error: '查無預約。' }, 404);
      }
      if (code && !fullCodePattern.test(code) && !shortCodePattern.test(code)) return json({ error: '預約編號格式不正確。' }, 400);
      const rows = await bookings('list', { code });
      return json({ rows });
    } catch {
      if (adminRequest && params.has('closures')) {
        return json({ error: '暫停預約服務暫時無法連線。請確認 Apps Script 已部署最新版 Bookings.gs，並查看 Vercel Logs 中的 Booking Sheets 訊息。' }, 503);
      }
      return json({ error: adminRequest ? '管理金鑰已驗證，但暫時無法讀寫 Google 試算表。' : '暫時無法處理預約，請稍後重試。' }, 503);
    }
  }
};
