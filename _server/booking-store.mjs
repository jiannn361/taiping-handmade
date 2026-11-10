import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const bookingCode = 'BK-[0-9A-F]{32}';

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function matchesSecret(actual, expected) {
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

export const hexKey = /^[0-9a-f]{64}$/i;

export function settingIssue(name, pattern) {
  const value = process.env[name]?.trim();
  if (!value) return `${name}: missing`;
  if (pattern && !pattern.test(value)) return `${name}: invalid format`;
  return null;
}

export function sheetsSetupIssues() {
  return [
    settingIssue('BOOKING_SHEETS_URL', /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/),
    settingIssue('BOOKING_SHEETS_SECRET', hexKey)
  ].filter(Boolean);
}

export async function bookings(action, data) {
  if (sheetsSetupIssues().length) throw new Error('Missing Google Sheets setup');
  const payload = JSON.stringify({ action, data, sentAt: Date.now() });
  const signature = createHmac('sha256', process.env.BOOKING_SHEETS_SECRET.trim()).update(payload).digest('base64');
  const url = process.env.BOOKING_SHEETS_URL.trim();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, signature }),
    signal: AbortSignal.timeout(15000)
  }).catch(error => {
    console.warn(`Booking Sheets (${action}): ${error.name === 'TimeoutError' ? 'request_timeout' : 'connection_failed'}`);
    throw new Error('Google Sheets connection failed');
  });
  if (response.url.startsWith('https://accounts.google.com/') || [401, 403].includes(response.status)) {
    console.warn(`Booking Sheets (${action}): google_access_denied`);
    throw new Error('Google Sheets access denied');
  }
  if (!response.ok) {
    console.warn(`Booking Sheets (${action}): HTTP ${response.status}`);
    throw new Error('Google Sheets request failed');
  }
  const result = await response.json().catch(() => {
    console.warn(`Booking Sheets (${action}): unexpected_response`);
    throw new Error('Unexpected Google Sheets response');
  });
  if (!result?.ok) {
    console.warn(`Booking Sheets (${action}): ${scriptFailureReason(result?.reason)}`);
    throw new Error('Google Sheets request rejected');
  }
  return result.data;
}

function scriptFailureReason(reason) {
  const known = ['script_secret_missing', 'signature_mismatch', 'sheet_not_initialized', 'sheet_tab_missing', 'sheet_headers_changed', 'script_failed'];
  return known.includes(reason) ? reason : 'script_rejected';
}
