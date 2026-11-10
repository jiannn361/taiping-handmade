const BOOKING_TAB = '預約名單';
const BOOKING_TIME_FORMAT = 'yyyy-mm-dd hh:mm:ss';
const BOOKING_HEADERS = [
  '預約編號', '體驗項目', '預約日期', '預約時間', '人數', '姓名', '手機', '預約狀態',
  '建立時間', 'LINE 帳號識別碼', 'LINE 暱稱', 'LINE 訊息收到時間'
];

function setupBookingSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = spreadsheet.getSheetByName(BOOKING_TAB) || spreadsheet.insertSheet(BOOKING_TAB);
    if (!sheet.getLastRow()) {
      sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    if (!hasBookingHeaders(sheet)) throw new Error('Unexpected columns');
    spreadsheet.setSpreadsheetTimeZone('Asia/Taipei');
    updateBookingTimestamps(sheet);
    PropertiesService.getScriptProperties().setProperty('BOOKING_SPREADSHEET_ID', spreadsheet.getId());
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function updateBookingTimestamps(sheet) {
  const rows = sheet.getLastRow() - 1;
  if (rows < 1) return;
  for (const column of [9, 12]) {
    const range = sheet.getRange(2, column, rows, 1);
    const values = range.getValues();
    const formulas = range.getFormulas();
    range.setNumberFormat(BOOKING_TIME_FORMAT);
    values.forEach(([value], index) => {
      if (formulas[index][0] || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return;
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) range.getCell(index + 1, 1).setValue(date);
    });
  }
}

function doPost(event) {
  try {
    const body = event?.postData?.contents || '';
    if (body.length > 4096) return output({ ok: false });
    const { payload, signature } = JSON.parse(body);
    const props = PropertiesService.getScriptProperties();
    if (typeof payload !== 'string' || typeof signature !== 'string') return output({ ok: false });
    const secret = props.getProperty('BOOKING_SHEETS_SECRET')?.trim();
    if (!secret) return output({ ok: false, reason: 'script_secret_missing' });
    const expected = Utilities.base64Encode(Utilities.computeHmacSha256Signature(payload, secret));
    if (signature.length !== expected.length) return output({ ok: false });
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (difference) return output({ ok: false, reason: 'signature_mismatch' });
    const { action, data, sentAt } = JSON.parse(payload);
    if (!Number.isInteger(sentAt) || Math.abs(Date.now() - sentAt) > 90000) return output({ ok: false });

    const lock = LockService.getScriptLock();
    lock.waitLock(4000);
    try {
      const spreadsheetId = props.getProperty('BOOKING_SPREADSHEET_ID');
      if (!spreadsheetId) return output({ ok: false, reason: 'sheet_not_initialized' });
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(BOOKING_TAB);
      if (!sheet) return output({ ok: false, reason: 'sheet_tab_missing' });
      if (!hasBookingHeaders(sheet)) return output({ ok: false, reason: 'sheet_headers_changed' });
      const result = runBookingAction(sheet, action, data);
      SpreadsheetApp.flush();
      return output({ ok: true, data: result });
    } finally {
      lock.releaseLock();
    }
  } catch {
    return output({ ok: false, reason: 'script_failed' });
  }
}

function output(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function hasBookingHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).getDisplayValues()[0];
  return BOOKING_HEADERS.every((header, index) => header === headers[index]);
}

function findBookingRow(sheet, code) {
  const size = sheet.getLastRow() - 1;
  if (size < 1) return null;
  return sheet.getRange(2, 1, size, 1).createTextFinder(code).matchEntireCell(true).findNext()?.getRow() ?? null;
}

function literalText(value) {
  const firstCharacter = value.trimStart().charAt(0);
  return firstCharacter && "=+-@'".includes(firstCharacter) ? "'" + value : value;
}

function adminBooking(row) {
  const [code, experience, date, time, people, name, phone, status, , , line_display_name, line_linked_at] = row;
  return { code, experience, date, time, people: Number(people), name, phone,
    status: status === '已確認' ? 'confirmed' : 'pending', line_display_name, line_linked_at };
}

function runBookingAction(sheet, action, data) {
  const lastRow = sheet.getLastRow();
  if (action === 'list' && /^BK-[0-9A-F]{12}$/.test(data.code)) {
    if (lastRow < 2) return [];
    const suffix = data.code.slice(3);
    return sheet.getRange(2, 1, lastRow - 1, 1)
      .createTextFinder(`BK-[0-9A-F]{20}${suffix}`).useRegularExpression(true).matchEntireCell(true).findAll()
      .map(match => adminBooking(sheet.getRange(match.getRow(), 1, 1, BOOKING_HEADERS.length).getDisplayValues()[0]));
  }
  const rowNumber = data.code ? findBookingRow(sheet, data.code) : null;
  if (action === 'create') {
    if (rowNumber) return true;
    if (lastRow === sheet.getMaxRows()) sheet.insertRowsAfter(lastRow, 1);
    const range = sheet.getRange(lastRow + 1, 1, 1, BOOKING_HEADERS.length);
    range.setNumberFormats([['@', '@', '@', '@', '@', '@', '@', '@', BOOKING_TIME_FORMAT, '@', '@', BOOKING_TIME_FORMAT]]);
    range.setValues([[data.code, data.experience, data.date, data.time, data.people,
      literalText(data.name), data.phone, '待確認', new Date(), '', '', '']]);
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
  const createdValue = sheet.getRange(rowNumber, 9).getValue();
  const createdAt = createdValue instanceof Date ? createdValue.getTime() : Date.parse(createdValue);
  if (!Number.isFinite(createdAt) || data.timestamp < createdAt || data.timestamp - createdAt > 7 * 86400000) return null;
  const linkedUser = row[9];
  if (linkedUser && linkedUser !== data.userId) return null;
  if (!linkedUser) {
    sheet.getRange(rowNumber, 10, 1, 3).setValues([[data.userId, literalText(data.displayName || ''), new Date(data.timestamp)]]);
  }
  return { code: row[0], experience: row[1], date: row[2], time: row[3], people: Number(row[4]) };
}
