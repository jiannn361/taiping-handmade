import { createHmac } from 'node:crypto';
import bookingCard from '../booking-card.js';
import { bookingCode, bookings, json, matchesSecret } from '../_server/booking-store.mjs';

const bookingMessage = new RegExp(`^(?:預約編號[：:\\s]*)?(${bookingCode})(（已附小卡）)?$`, 'i');

async function displayName(userId) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) return null;
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) return null;
    const profile = await response.json();
    return typeof profile.displayName === 'string' ? profile.displayName.slice(0, 100) : null;
  } catch {
    return null;
  }
}

async function replyBookingCard(replyToken, booking) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('Missing LINE access token');
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages: [bookingCard(booking)] }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    // LINE may redeliver an event after its single-use reply token was used.
    if (response.status === 400 && result.message === 'Invalid reply token') return;
    throw new Error('LINE reply failed');
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({}, 405);
    const secret = process.env.LINE_CHANNEL_SECRET?.trim();
    if (!secret) return json({}, 503);
    const body = Buffer.from(await request.arrayBuffer());
    const signature = createHmac('sha256', secret).update(body).digest('base64');
    if (!matchesSecret(request.headers.get('x-line-signature') ?? '', signature)) return json({}, 401);

    try {
      const { events } = JSON.parse(body.toString('utf8'));
      if (!Array.isArray(events)) return json({}, 400);
      for (const event of events) {
        if (event.type !== 'message' || event.message?.type !== 'text' || event.source?.type !== 'user') continue;
        const userId = event.source.userId;
        const match = event.message.text?.trim().match(bookingMessage);
        const code = match?.[1].toUpperCase();
        if (!code || typeof userId !== 'string' || !/^U[0-9a-f]{32}$/.test(userId) || !Number.isSafeInteger(event.timestamp)) continue;

        const booking = await bookings('link', { code, userId, displayName: await displayName(userId), timestamp: event.timestamp });
        if (booking && event.replyToken && !match[2]) await replyBookingCard(event.replyToken, booking);
      }
      return json({ ok: true });
    } catch {
      return json({}, 503);
    }
  }
};
