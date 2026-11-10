const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

function bookingDateReason(value,config,now,experience){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '請從日曆選擇預約日期。';
  const date=new Date(value+'T12:00:00+08:00');
  if(!Number.isFinite(date.getTime()))return '日期無效，請重新選擇。';
  if(value<=now)return '當天及過去日期無法預約，請選擇明天或之後的日期。';
  if((config.closedWeekdays||[3]).includes(date.getUTCDay()))return '此日為固定公休日，請選擇其他日期。';
  if((config.closedDates||[]).includes(value))return '此日暫停預約，請選擇其他日期。';
  if(['手拉胚','陶杯刻畫'].includes(experience)){
    const holidays=globalThis.TAIWAN_HOLIDAYS;
    if(!holidays?.years.includes(Number(value.slice(0,4))))return '此年度的陶藝預約尚未開放，請聯繫工作室。';
    if(holidays.holidayBreaks[value]&&!(config.potteryHolidayOpenDates||[]).includes(value))return '國定假日連假（'+holidays.holidayBreaks[value]+'）：陶藝暫停線上預約，請聯繫工作室詢問。';
  }
  return '';
}



function allowedBookingTimes(value,experience){
 if(!value)return [];
 const day=new Date(value+'T12:00:00+08:00').getUTCDay();
 if(['手拉胚','陶杯刻畫'].includes(experience)&&[0,6].includes(day))return ['15:00','15:30','16:00'];
 return Array.from({length:13},(_,i)=>{const m=600+i*30;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');});
}

if (typeof module !== 'undefined') module.exports = {today, bookingDateReason, allowedBookingTimes};

