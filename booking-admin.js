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
    row.status === 'confirmed' ? '已確認預約' : '待確認預約'
  ];
  for (const detail of details) {
    const paragraph = document.createElement('p');
    paragraph.textContent = detail;
    card.append(paragraph);
  }

  if (row.status !== 'confirmed') {
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'secondary';
    confirm.textContent = '標記為已確認';
    confirm.addEventListener('click', async () => {
      confirm.disabled = true;
      await loadBookings(session, row.code);
      confirm.disabled = false;
    });
    card.append(confirm);
  }
  return card;
}

async function loadBookings(session, confirmCode) {
  if (adminSession !== session || session.loading) return;
  session.loading = true;
  adminStatus.textContent = '讀取中…';
  const headers = { Authorization: `Bearer ${session.key}` };
  try {
    if (confirmCode) {
      const update = await fetch(`/api/bookings?code=${encodeURIComponent(confirmCode)}`, { method: 'PATCH', headers });
      if (!update.ok) throw new Error('無法更新預約。');
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
    adminStatus.textContent = result.rows.length ? `顯示 ${result.rows.length} 筆預約。` : '查無預約。';
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
    await loadBookings(session);
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
