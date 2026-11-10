let bookingAttempt;
let savingBooking = false;
const lineClient = connectBookingLine();

async function connectBookingLine() {
  if (location.protocol === 'file:') return null;
  let timeout;
  try {
    const connect = async () => {
      if (!window.liff) await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      const client = window.liff;
      await client.init({ liffId: window.BOOKING_CONFIG.liffId });
      return client.isInClient() && client.getContext()?.type === 'utou' ? client : null;
    };
    return await Promise.race([connect(), new Promise(resolve => { timeout = setTimeout(() => resolve(null), 6000); })]);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendBookingCode(code) {
  const client = await lineClient;
  if (!client) return false;
  try {
    await client.sendMessages([{ type: 'text', text: `預約編號 ${code}` }]);
    return true;
  } catch {
    return false;
  }
}

$('form').addEventListener('submit', event => {
  event.preventDefault();
  if (savingBooking || !validateBookingDate() || !$('form').reportValidity() || !validateBookingTime()) return;
  const name = $('name').value.trim();
  if (!name) {
    $('name').setCustomValidity('請填寫姓名');
    $('name').reportValidity();
    return;
  }

  const item = selection();
  const booking = {
    experience: item.value,
    date: $('date').value,
    time: $('time').value,
    people: Number($('people').value),
    name,
    phone: $('phone').value.trim()
  };
  const payload = JSON.stringify(booking);
  if (bookingAttempt?.payload !== payload) bookingAttempt = { booking, payload };
  $('message').textContent = [
    `體驗：${booking.experience}`,
    `地點：${item.dataset.location}`,
    `日期與時間：${booking.date} ${booking.time}`,
    `人數：${booking.people} 人`,
    `姓名：${booking.name}`,
    `手機：${booking.phone}`,
    `預估費用：${money(Number(item.dataset.price) * booking.people)}`
  ].join('\n');
  $('save-booking').disabled = false;
  $('save-booking').textContent = '儲存預約申請';
  $('save-booking').hidden = false;
  $('official-chat').hidden = true;
  $('copy').hidden = true;
  $('status').textContent = '確認資料後，請先儲存預約申請。';
  if (bookingAttempt.code) showBookingCode(bookingAttempt.code);
  $('review').showModal();
});

$('name').addEventListener('input', () => $('name').setCustomValidity(''));
$('review').addEventListener('close', () => { $('message').textContent = ''; });

function showBookingCode(code) {
  const account = encodeURIComponent(window.BOOKING_CONFIG.officialAccount);
  const message = encodeURIComponent(`預約編號 ${code}`);
  const sentToLine = bookingAttempt.sentToLine;
  const chat = `https://line.me/R/oaMessage/${account}`;
  $('official-chat').href = sentToLine ? chat : `${chat}/?${message}`;
  $('official-chat').textContent = sentToLine ? '回到官方 LINE 查看小卡 ↗' : '到官方 LINE 傳送預約編號 ↗';
  $('official-chat').hidden = false;
  $('copy').hidden = Boolean(sentToLine);
  $('save-booking').hidden = true;
  $('message').textContent = `預約編號：${code}`;
  $('status').textContent = sentToLine
    ? '申請已存檔，預約編號已傳回原聊天室。請回官方 LINE 查看小卡。'
    : '申請已存檔。請開啟官方 LINE 並按送出，讓工作室確認預約。';
}

$('save-booking').addEventListener('click', async () => {
  if (savingBooking || !bookingAttempt || bookingAttempt.code) return;
  if (location.protocol === 'file:') {
    $('status').textContent = '目前是本機預覽，請到正式網站儲存預約。';
    return;
  }
  savingBooking = true;
  $('save-booking').disabled = true;
  $('save-booking').textContent = '儲存中…';
  $('status').textContent = '正在儲存預約申請。';
  try {
    bookingAttempt.requestId ??= crypto.randomUUID();
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bookingAttempt.booking, requestId: bookingAttempt.requestId })
    });
    const result = await response.json();
    if (!response.ok || !result.code) {
      $('status').textContent = result.error || '預約暫時無法儲存，請稍後重試。';
      return;
    }
    bookingAttempt.code = result.code;
    $('status').textContent = '申請已存檔，正在嘗試傳回 LINE 聊天室。';
    bookingAttempt.sentToLine = await sendBookingCode(result.code);
    if ($('review').open) showBookingCode(result.code);
  } catch {
    $('status').textContent = '預約儲存結果未確認，請重試。';
  } finally {
    savingBooking = false;
    $('save-booking').disabled = false;
    $('save-booking').textContent = '儲存預約申請';
  }
});

$('copy').addEventListener('click', async () => {
  if (!bookingAttempt?.code) return;
  try {
    await navigator.clipboard.writeText(`預約編號 ${bookingAttempt.code}`);
    $('status').textContent = '已複製預約編號，請貼到工作室官方 LINE 私聊並送出。';
  } catch {
    $('status').textContent = '請選取上方的預約編號，複製到工作室官方 LINE 私聊並送出。';
  }
});
