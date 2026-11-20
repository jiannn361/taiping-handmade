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

async function sendBookingToLine(code, booking) {
  const client = await lineClient;
  if (!client) return false;
  const card = bookingCard({ ...booking, code, lookupUrl: bookingLookupUrl(location.href, code) });
  try {
    await client.sendMessages([card]);
  } catch {
    return false;
  }

  bookingAttempt.cardSent = true;
  try {
    const idToken = client.getIDToken?.();
    if (idToken) {
      const response = await fetch('/api/bookings?link=1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, idToken })
      });
      if (response.ok) return true;
    }
  } catch {
    // Use the existing LINE message pairing when token verification is unavailable.
  }
  try {
    await client.sendMessages([{ type: 'text', text: pairingMessage(code) }]);
    return true;
  } catch {
    return false;
  }
}

function pairingMessage(code) {
  return `預約編號 ${code}${bookingAttempt.cardSent ? '（已附小卡）' : ''}`;
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
  const details = [
    ['體驗時段', [
      ['體驗', booking.experience],
      ['申請時段', `${booking.date.replaceAll('-', '/')} ${booking.time}`],
      ['地點', item.dataset.location],
      ['人數', `${booking.people} 人`],
      ['預估費用', money(Number(item.dataset.price) * booking.people)]
    ]],
    ['聯絡資料', [['姓名', booking.name], ['手機', booking.phone]]]
  ];
  $('message').replaceChildren(...details.map(([title, rows]) => {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const list = document.createElement('dl');
    for (const [label, value] of rows) {
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      list.append(term, description);
    }
    section.append(heading, list);
    return section;
  }));
  $('save-booking').disabled = false;
  $('save-booking').textContent = '儲存預約申請';
  $('save-booking').hidden = false;
  $('official-chat').hidden = true;
  $('copy').hidden = true;
  $('review-title').textContent = '確認你的預約申請';
  $('review-instructions').hidden = false;
  $('status').textContent = '';
  if (bookingAttempt.code) showBookingCode(bookingAttempt.code);
  $('review').showModal();
});

$('name').addEventListener('input', () => $('name').setCustomValidity(''));
$('review').addEventListener('close', () => { $('message').textContent = ''; });

function showBookingCode(code) {
  const account = encodeURIComponent(window.BOOKING_CONFIG.officialAccount);
  const message = encodeURIComponent(pairingMessage(code));
  const sentToLine = bookingAttempt.sentToLine;
  const chat = `https://line.me/R/oaMessage/${account}`;
  $('official-chat').href = sentToLine ? chat : `${chat}/?${message}`;
  $('official-chat').textContent = sentToLine ? '回到官方 LINE 查看小卡 ↗' : '到官方 LINE 傳送預約編號 ↗';
  $('official-chat').hidden = false;
  $('copy').hidden = Boolean(sentToLine);
  $('save-booking').hidden = true;
  $('review-title').textContent = '預約申請已收到';
  $('review-instructions').hidden = true;
  $('message').textContent = `預約編號：${shortBookingCode(code)}`;
  $('status').textContent = sentToLine
    ? '已收到預約申請，請留意官方 LINE 回覆。收到工作室確認後，預約才正式成立。'
    : '已收到預約申請。請點下方按鈕，在官方 LINE 送出預約編號，再等候工作室確認。';
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
      if (response.status === 409) loadExperienceClosures();
      $('status').textContent = result.error || '預約暫時無法儲存，請稍後重試。';
      return;
    }
    bookingAttempt.code = result.code;
    $('status').textContent = '申請已存檔，正在嘗試傳回 LINE 聊天室。';
    bookingAttempt.sentToLine = await sendBookingToLine(result.code, bookingAttempt.booking);
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
    await navigator.clipboard.writeText(pairingMessage(bookingAttempt.code));
    $('status').textContent = '已複製預約編號，請貼到工作室官方 LINE 私聊並送出。';
  } catch {
    $('status').textContent = '無法複製。請用「到官方 LINE 傳送預約編號」開啟私聊並送出。';
  }
});
