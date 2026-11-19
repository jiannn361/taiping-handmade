const lookupForm = document.getElementById('booking-lookup');
const bookingCodeInput = document.getElementById('booking-code');
const bookingPhoneInput = document.getElementById('booking-phone');
const bookingMessage = document.getElementById('booking-message');
const bookingResult = document.getElementById('booking-result');
const linkCode = new URLSearchParams(location.search).get('code');
if (/^BK-[0-9A-F]{12}$/.test(linkCode)) bookingCodeInput.value = linkCode;

lookupForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = lookupForm.querySelector('button');
  if (button.disabled) return;
  button.disabled = true;
  bookingResult.hidden = true;
  bookingResult.replaceChildren();
  bookingMessage.textContent = '正在查詢預約…';
  try {
    const response = await fetch('/api/bookings?lookup=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: bookingCodeInput.value, phone: bookingPhoneInput.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '暫時無法查詢，請稍後再試。');
    const booking = result.booking;
    bookingMessage.textContent = {
      pending: '待確認｜已收到申請，請等候工作室確認。',
      confirmed: '已確認｜請依下列確認時段抵達集合地點。',
      reschedule: '需另約時段｜原申請時段無法安排，請留意工作室聯繫。'
    }[booking.status];
    const details = [
      ['預約編號', booking.code],
      ['體驗項目', booking.experience],
      [booking.status === 'confirmed' ? '確認時段' : '申請時段', `${booking.date} ${booking.time}`],
      ['人數', `${booking.people} 人`]
    ];
    if (booking.location) details.push(['集合地點', booking.location]);
    for (const [label, value] of details) {
      const line = document.createElement('p');
      line.textContent = `${label}｜${value}`;
      bookingResult.append(line);
    }
    bookingResult.hidden = false;
  } catch (error) {
    bookingMessage.textContent = error instanceof TypeError || error instanceof SyntaxError
      ? '暫時無法查詢，請稍後再試。' : error.message;
  } finally {
    button.disabled = false;
  }
});
