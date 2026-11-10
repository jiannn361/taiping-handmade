import '../config.js';
import '../holidays.js';
import availability from '../availability.js';
import { bookingCode, bookings, hexKey, json, matchesSecret, settingIssue, sheetsSetupIssues } from '../_server/booking-store.mjs';

const experiences = ['手拉胚', '陶杯刻畫', '植物槌染'];
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  await bookings('create', { code, experience, date, time, people, name: name.trim(), phone });
  return json({ code }, 201);
}

export default {
  async fetch(request) {
    const issues = [
      ...sheetsSetupIssues(),
      settingIssue('BOOKING_ADMIN_KEY', hexKey),
      settingIssue('LINE_CHANNEL_SECRET'),
      settingIssue('LINE_CHANNEL_ACCESS_TOKEN')
    ].filter(Boolean);
    if (issues.length) {
      console.warn(`Booking setup: ${issues.join(', ')}`);
      return json({ error: '預約系統尚未完成設定。' }, 503);
    }

    try {
      if (request.method === 'POST') return await save(request);
      if (request.method !== 'GET' && request.method !== 'PATCH') return json({}, 405);
      const adminKey = process.env.BOOKING_ADMIN_KEY.trim();
      if (!matchesSecret(request.headers.get('authorization') ?? '', `Bearer ${adminKey}`)) return json({}, 401);

      const code = new URL(request.url).searchParams.get('code')?.trim().toUpperCase();
      if (code && !new RegExp(`^${bookingCode}$`).test(code)) return json({ error: '預約編號格式不正確。' }, 400);
      if (request.method === 'PATCH') {
        if (!code) return json({}, 400);
        const updated = await bookings('confirm', { code });
        return updated ? json({ ok: true }) : json({ error: '查無預約。' }, 404);
      }
      const rows = await bookings('list', { code });
      return json({ rows });
    } catch {
      return json({ error: '暫時無法處理預約，請稍後重試。' }, 503);
    }
  }
};
