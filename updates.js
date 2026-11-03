function syncBookingTimes(){
 const time=$('time'),previous=time.value,values=allowedBookingTimes($('date').value,selection().value);
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=values.length?'請選擇時間':'請先選擇預約日期';time.replaceChildren(placeholder);
 values.forEach(value=>{const option=document.createElement('option');option.value=option.textContent=value;time.append(option);});
 time.value=values.includes(previous)?previous:'';time.disabled=!values.length;update();
}
function validateBookingTime(){
 const valid=allowedBookingTimes($('date').value,selection().value).includes($('time').value);
 $('time').setCustomValidity(valid?'':'請選擇此體驗與日期可預約的時段。');
 if(!valid)$('time').reportValidity();return valid;
}
$('time').addEventListener('change',()=>{$('time').setCustomValidity('');});
$('form').addEventListener('change',event=>{
 if(event.target.name!=='experience')return;
 const reason=$('date').value?bookingDateReason($('date').value,window.BOOKING_CONFIG,today(),selection().value):'';
 if(reason){$('date').value='';$('date-error').textContent='已切換體驗，原日期無法預約，請重新選擇。';}
 $('time').setCustomValidity('');renderCalendar();syncBookingTimes();
});
const news=window.BOOKING_CONFIG.latestNews;
$('latest-news').hidden=!news;
if(news){$('news-title').textContent=news.title||'最新資訊';$('news-text').textContent=news.text||'';if(news.image){$('news-image').src=news.image;$('news-image').hidden=false;$('news-image').onerror=()=>{$('news-image').hidden=true;};}}
syncBookingTimes();
