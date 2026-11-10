const BOOKING_TAB = '預約名單';
const BOOKING_HEADERS = [
  '預約編號', '體驗項目', '預約日期', '預約時間', '人數', '姓名', '手機', '預約狀態',
  '建立時間', 'LINE 帳號識別碼', 'LINE 暱稱', 'LINE 訊息收到時間'
];

function setupBookingSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(BOOKING_TAB) || spreadsheet.insertSheet(BOOKING_TAB);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  checkHeaders(sheet);
  PropertiesService.getScriptProperties().setProperty('BOOKING_SPREADSHEET_ID', spreadsheet.getId());
}

function doPost(event) {
  try {
    const body = event?.postData?.contents || '';
    if (body.length > 4096) return output({ ok: false });
    const { payload, signature } = JSON.parse(body);
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('BOOKING_SHEETS_SECRET');
    if (!secret || typeof payload !== 'string' || typeof signature !== 'string') return output({ ok: false });
    const expected = Utilities.base64Encode(Utilities.computeHmacSha256Signature(payload, secret));
    if (signature.length !== expected.length) return output({ ok: false });
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (difference) return output({ ok: false });
    const { action, data, sentAt } = JSON.parse(payload);
    if (!Number.isInteger(sentAt) || Math.abs(Date.now() - sentAt) > 90000) return output({ ok: false });

    const lock = LockService.getScriptLock();
    lock.waitLock(4000);
    try {
      const sheet = SpreadsheetApp.openById(props.getProperty('BOOKING_SPREADSHEET_ID')).getSheetByName(BOOKING_TAB);
      checkHeaders(sheet);
      const result = runBookingAction(sheet, action, data);
      SpreadsheetApp.flush();
      return output({ ok: true, data: result });
    } finally {
      lock.releaseLock();
    }
  } catch {
    return output({ ok: false });
  }
}

function output(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function checkHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).getDisplayValues()[0];
  if (headers.some((header, index) => header !== BOOKING_HEADERS[index])) throw new Error('Unexpected columns');
}

function findBookingRow(sheet, code) {
  const size = sheet.getLastRow() - 1;
  if (size < 1) return null;
  return sheet.getRange(2, 1, size, 1).createTextFinder(code).matchEntireCell(true).findNext()?.getRow() ?? null;
}

function literalText(value) {
  return /^[\s]*[=+\-@']/.test(value) ? "'" + value : value;
}

function adminBooking(row) {
  const [code, experience, date, time, people, name, phone, status, , , line_display_name, line_linked_at] = row;
  return { code, experience, date, time, people: Number(people), name, phone,
    status: status === '已確認' ? 'confirmed' : 'pending', line_display_name, line_linked_at };
}

function runBookingAction(sheet, action, data) {
  const rowNumber = data.code ? findBookingRow(sheet, data.code) : null;
  const lastRow = sheet.getLastRow();
  if (action === 'create') {
    if (rowNumber) return true;
    if (lastRow === sheet.getMaxRows()) sheet.insertRowsAfter(lastRow, 1);
    const range = sheet.getRange(lastRow + 1, 1, 1, BOOKING_HEADERS.length);
    range.setNumberFormat('@').setValues([[data.code, data.experience, data.date, data.time, data.people,
      literalText(data.name), data.phone, '待確認', new Date().toISOString(), '', '', '']]);
    return true;
  }

  if (action === 'list') {
    const count = Math.min(lastRow - 1, 50);
    if (data.code) return rowNumber ? [adminBooking(sheet.getRange(rowNumber, 1, 1, BOOKING_HEADERS.length).getDisplayValues()[0])] : [];
    return count ? sheet.getRange(lastRow - count + 1, 1, count, BOOKING_HEADERS.length).getDisplayValues().reverse().map(adminBooking) : [];
  }

  if (!rowNumber) return null;
  if (action === 'confirm') {
    sheet.getRange(rowNumber, 8).setValue('已確認');
    return true;
  }
  if (action !== 'link') return null;

  const row = sheet.getRange(rowNumber, 1, 1, BOOKING_HEADERS.length).getDisplayValues()[0];
  const createdAt = Date.parse(row[8]);
  if (!Number.isFinite(createdAt) || data.timestamp < createdAt || data.timestamp - createdAt > 7 * 86400000) return null;
  const linkedUser = row[9];
  if (linkedUser && linkedUser !== data.userId) return null;
  if (!linkedUser) {
    sheet.getRange(rowNumber, 10, 1, 3).setValues([[data.userId, literalText(data.displayName || ''), new Date(data.timestamp).toISOString()]]);
  }
  return { code: row[0], experience: row[1], date: row[2], time: row[3], people: Number(row[4]) };
}
