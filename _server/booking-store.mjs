import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const bookingCode = 'BK-[0-9A-F]{32}';

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function matchesSecret(actual, expected) {
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

export function sheetsConfigured() {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(process.env.BOOKING_SHEETS_URL ?? '') &&
    /^[0-9a-f]{64}$/i.test(process.env.BOOKING_SHEETS_SECRET ?? '');
}

export async function bookings(action, data) {
  if (!sheetsConfigured()) throw new Error('Missing Google Sheets setup');
  const payload = JSON.stringify({ action, data, sentAt: Date.now() });
  const signature = createHmac('sha256', process.env.BOOKING_SHEETS_SECRET).update(payload).digest('base64');
  const url = process.env.BOOKING_SHEETS_URL;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, signature }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Google Sheets request failed');
  const result = await response.json();
  if (!result.ok) throw new Error('Google Sheets request rejected');
  return result.data;
}
