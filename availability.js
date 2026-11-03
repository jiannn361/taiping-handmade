function bookingDateReason(value,config,now){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '請從日曆選擇預約日期。';
  const date=new Date(value+'T12:00:00+08:00');
  if(!Number.isFinite(date.getTime()))return '日期無效，請重新選擇。';
  if(value<=now)return '當天及過去日期無法預約，請選擇明天或之後的日期。';
  if((config.closedWeekdays||[3]).includes(date.getUTCDay()))return '此日為固定公休日，請選擇其他日期。';
  if((config.closedDates||[]).includes(value))return '此日暫停預約，請選擇其他日期。';
  return '';
}

