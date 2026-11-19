const adminLogin = document.getElementById('admin-login');
const keyInput = document.getElementById('admin-key');
const adminPanel = document.getElementById('admin-panel');
const results = document.getElementById('admin-results');
const adminStatus = document.getElementById('admin-status');
const search = document.getElementById('admin-search');
const codeInput = document.getElementById('admin-code');
let adminSession;

function logout() {
  adminSession = undefined;
  adminPanel.hidden = true;
  adminLogin.hidden = false;
  results.replaceChildren();
  closureForm.reset();
  closureList.replaceChildren();
  closureStatus.textContent = '';
  keyInput.value = '';
  codeInput.value = '';
  adminStatus.textContent = '';
}

function adminBookingCard(row, session) {
  const card = document.createElement('article');
  card.className = 'kiln-result';
  const heading = document.createElement('h2');
  heading.textContent = shortBookingCode(row.code);
  heading.style.overflowWrap = 'anywhere';
  card.append(heading);

  const details = [
    `${row.experience}｜${row.date} ${row.time}｜${row.people} 人`,
    `預約人：${row.name}｜${row.phone}`,
    row.line_linked_at ? `已收到 LINE 訊息${row.line_display_name ? `｜LINE 名稱：${row.line_display_name}` : ''}` : '尚未收到 LINE 訊息',
    { confirmed: '已確認預約', reschedule: '需另約時段', pending: '待確認預約' }[row.status],
    ...(row.status === 'confirmed' ? [row.lineNotified ? 'LINE 已受理確認通知' : '尚無 LINE 確認通知紀錄'] : [])
  ];
  for (const detail of details) {
    const paragraph = document.createElement('p');
    paragraph.textContent = detail;
    card.append(paragraph);
  }

  if (row.status !== 'confirmed') {
    const form = document.createElement('form');
    form.className = 'booking-confirm-form';
    for (const [type, labelText, value] of [
      ['date', '確認日期', row.date], ['time', '確認時間', row.time]
    ]) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = type;
      input.name = type;
      input.value = value;
      input.required = true;
      label.append(labelText + ' ', input);
      form.append(label);
    }
    const confirm = document.createElement('button');
    confirm.className = 'secondary';
    confirm.textContent = '確認預約並發送 LINE 通知';
    form.append(confirm);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      confirm.disabled = true;
      await loadBookings(session, { code: row.code, ...Object.fromEntries(new FormData(form)) });
      confirm.disabled = false;
    });
    card.append(form);
    if (row.status !== 'reschedule') {
      const reschedule = document.createElement('button');
      reschedule.type = 'button';
      reschedule.className = 'secondary';
      reschedule.textContent = '標記為需另約時段';
      reschedule.addEventListener('click', () => loadBookings(session, { code: row.code, action: 'reschedule' }));
      card.append(reschedule);
    }
  } else if (!row.lineNotified && row.line_linked_at) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'secondary';
    retry.textContent = '發送 LINE 確認通知';
    retry.addEventListener('click', () => loadBookings(session, { code: row.code }));
    card.append(retry);
  }
  return card;
}

async function loadBookings(session, change) {
  if (!session || adminSession !== session || session.loading) return;
  session.loading = true;
  adminStatus.textContent = '讀取中…';
  const headers = { Authorization: `Bearer ${session.key}` };
  try {
    let updateMessage;
    if (change) {
      const { code, ...details } = change;
      const update = await fetch(`/api/bookings?code=${encodeURIComponent(code)}`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(details)
      });
      const result = await update.json();
      if (!update.ok) throw new Error(result.error || '無法更新預約。');
      updateMessage = {
        sent: '預約已確認，LINE 已受理確認通知。',
        unlinked: '預約已確認。客人尚未連結 LINE，請用其他方式通知。',
        failed: '預約已確認。LINE 發送結果未確認，可在名單重試。',
        manual: '預約已確認。請先到 LINE 聊天室核對通知紀錄，再視需要手動聯絡。'
      }[result.notification] || '已標記為需另約時段，請聯絡客人協調。';
    }
    const code = codeInput.value.trim();
    const response = await fetch(`/api/bookings?code=${encodeURIComponent(code)}`, { headers, cache: 'no-store' });
    if (adminSession !== session) return;
    if (response.status === 401) {
      logout();
      adminStatus.textContent = '管理金鑰不正確。';
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '無法讀取預約。');
    if (adminSession !== session) return;
    adminLogin.hidden = true;
    adminPanel.hidden = false;
    results.replaceChildren(...result.rows.map(row => adminBookingCard(row, session)));
    adminStatus.textContent = updateMessage || (result.rows.length ? `顯示 ${result.rows.length} 筆預約。` : '查無預約。');
  } catch (error) {
    if (adminSession === session) {
      adminStatus.textContent = error.message || '已登入，但名單暫時無法讀取。';
    }
  } finally {
    session.loading = false;
  }
}

adminLogin.addEventListener('submit', async event => {
  event.preventDefault();
  const key = keyInput.value.replace(/\s/g, '');
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    adminStatus.textContent = '管理金鑰應是 64 個英文字母 a–f 或數字。請貼上 BOOKING_ADMIN_KEY 的值。';
    return;
  }
  const session = { key };
  adminSession = session;
  adminStatus.textContent = '驗證管理金鑰中…';
  try {
    const response = await fetch('/api/bookings?check=1', {
      headers: { Authorization: `Bearer ${key}` }, cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (adminSession !== session) return;
    if (!response.ok || !result.authenticated) {
      adminStatus.textContent = response.status === 401
        ? '管理金鑰不符合正式站的 BOOKING_ADMIN_KEY。'
        : result.error || '暫時無法驗證管理金鑰，請稍後重試。';
      return;
    }
    keyInput.value = '';
    adminLogin.hidden = true;
    adminPanel.hidden = false;
    await Promise.all([loadBookings(session), loadClosures(session)]);
  } catch {
    if (adminSession === session) adminStatus.textContent = '連不到預約系統，請稍後重試。';
  }
});
search.addEventListener('submit', event => {
  event.preventDefault();
  loadBookings(adminSession);
});
document.getElementById('admin-logout').addEventListener('click', logout);
window.addEventListener('pagehide', logout);

const closureForm = document.getElementById('admin-closure-form');
const closureList = document.getElementById('admin-closures');
const closureStatus = document.getElementById('admin-closure-status');

async function loadClosures(session, change) {
  if (!session || adminSession !== session || session.closuresLoading) return;
  session.closuresLoading = true;
  const submit = closureForm.querySelector('button');
  submit.disabled = true;
  closureStatus.textContent = change ? '儲存中…' : '讀取暫停日期中…';
  const headers = { Authorization: 'Bearer ' + session.key, 'Content-Type': 'application/json' };
  const endpoint = '/api/bookings?closures=1';
  try {
    const response = await fetch(endpoint, change
      ? { method: 'PATCH', headers, body: JSON.stringify(change) }
      : { headers, cache: 'no-store' });
    const result = await response.json();
    if (adminSession !== session) return;
    if (!response.ok) throw new Error(result.error || '暫時無法讀寫暫停日期。');
    closureList.replaceChildren(...result.closures.map(({ date, experience }) => {
      const item = document.createElement('li');
      item.textContent = date + '｜' + experience;
      const reopen = document.createElement('button');
      reopen.type = 'button';
      reopen.className = 'secondary';
      reopen.textContent = '取消這筆暫停設定';
      reopen.setAttribute('aria-label', '取消 ' + date + ' ' + experience + ' 的暫停設定');
      reopen.addEventListener('click', () => loadClosures(session, { date, experience, closed: false }));
      item.append(reopen);
      return item;
    }));
    closureStatus.textContent = change ? '已儲存日期設定。'
      : result.closures.length ? '下方是已設定的臨時暫停日期。' : '目前尚未新增臨時暫停日期。';
  } catch (error) {
    if (adminSession === session) closureStatus.textContent = error.message || '暫時無法讀寫暫停日期。';
  } finally {
    session.closuresLoading = false;
    if (adminSession === session) submit.disabled = false;
  }
}

closureForm.addEventListener('submit', event => {
  event.preventDefault();
  const date = document.getElementById('admin-closure-date').value;
  const experience = document.getElementById('admin-closure-experience').value;
  loadClosures(adminSession, { date, experience, closed: true });
});
