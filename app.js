const $=id=>document.getElementById(id);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
$('date').min=today();
const money=n=>'NT$ '+n.toLocaleString('en-US');
function selection(){return document.querySelector('[name=experience]:checked');}
function update(){const item=selection(),n=Number($('people').value);$('sum-exp').textContent=item.value;$('sum-location').textContent=item.dataset.location;$('sum-people').textContent=Number.isInteger(n)&&n>0?n+' 人':'請填寫人數';$('sum-date').textContent=[$('date').value,$('time').value].filter(Boolean).join(' · ')||'尚未選擇';$('total').textContent=money(Number(item.dataset.price)*(Number.isInteger(n)&&n>0?n:0));}
$('form').addEventListener('input',update);update();
let summary='',sent=false,liffReady=false;
$('form').addEventListener('submit',e=>{e.preventDefault();if(!validateBookingDate())return;if(!$('form').reportValidity())return;if(!validateBookingTime())return;if(!$('name').value.trim()){$('name').setCustomValidity('請填寫姓名');$('name').reportValidity();return;}const i=selection();summary=['【手作體驗預約申請】','體驗：'+i.value,'地點：'+i.dataset.location,'日期：'+$('date').value,'希望時間：'+$('time').value,'人數：'+$('people').value+' 人','姓名：'+$('name').value.trim(),'手機：'+$('phone').value.trim(),'預估費用：'+money(Number(i.dataset.price)*Number($('people').value)),'※ 待工作室回覆確認後，預約才成立。'].join('\n');sent=false;$('message').textContent=summary;$('copy').textContent='複製預約摘要';$('send').disabled=false;$('send').textContent='傳送至 LINE 聊天室';$('status').textContent=liffReady?'尚未傳送，請確認後按下傳送。':'尚未傳送。請複製摘要並貼至工作室 LINE 聊天室。';captureBooking();$('status').textContent=lineStatusMessage();$('review').showModal();});
$('name').addEventListener('input',()=>$('name').setCustomValidity(''));
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(summary);$('copy').textContent='已複製';$('status').textContent='已複製，請貼到工作室 LINE 聊天室並送出。';}catch{$('status').textContent='無法自動複製，請選取上方摘要並手動複製。';}};




const notesByExperience={
'手拉胚':['體驗時長：約40–60分鐘。','體驗地點：無二窯藝術空間。','建議體驗前先修剪指甲，避免指甲過長影響手作過程。','陶藝作品需經乾燥與柴燒，當天無法帶回。','柴燒需累積一定作品量後才會燒製，需等待半年至一年；完成後將另行通知。','作品可自取或郵寄（酌收運費 NT$100）。'],
'陶杯刻畫':['體驗時長：約30–40分鐘。','體驗地點：無二窯藝術空間。','陶藝作品需經乾燥與柴燒，當天無法帶回。','柴燒需累積一定作品量後才會燒製，需等待半年至一年；完成後將另行通知。','作品可自取或郵寄（酌收運費 NT$100）。'],
'植物槌染':['體驗時長：40–60分鐘。','體驗地點：雲梯廣場第一涼亭處。','施作時將花瓣或葉子以同一方向敲打，使植物汁液轉印到布料。','完成後撕去殘留葉片；為了讓顏色更持久，後續可浸泡鹽水／稀釋蘇打水，再鋪平晾乾。']
};
function showExperienceInfo(){
 const name=selection().value,index=['手拉胚','陶杯刻畫','植物槌染'].indexOf(name);
 $('info-title').textContent=name+'｜預約須知';
 $('experience-notes').replaceChildren(...notesByExperience[name].map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 const custom=window.BOOKING_CONFIG.processImages?.[name];
 $('process-frame').hidden=!custom;if(custom)$('process-image').src=custom;
 $('process-image').alt=name+'施作流程圖';
 $('process-frame').classList.toggle('custom-image',Boolean(custom));
 $('process-image').style.transform='none';
}
$('form').addEventListener('change',e=>{if(e.target.name==='experience')showExperienceInfo();});
showExperienceInfo();

function optionalImage(image,src){image.hidden=!src;if(!src)return;image.src=src;image.onerror=()=>{image.hidden=true;};}
optionalImage($('mascot'),window.BOOKING_CONFIG.mascot);
document.querySelectorAll('.card').forEach(card=>{const name=card.querySelector('input').value,src=window.BOOKING_CONFIG.experiencePhotos?.[name];if(!src)return;const tile=card.querySelector('.tile'),image=document.createElement('img');image.alt=name+'體驗照片';image.src=src;image.onerror=()=>image.remove();tile.replaceChildren(image);});
// 須知視窗的照片載入與錯誤由 notices.js 統一處理。


function validateBookingDate(){
 const reason=bookingDateReason($('date').value,window.BOOKING_CONFIG,today(),selection().value);
 $('date-error').textContent=reason;
 if(reason){$('date').focus();renderCalendar();return false;}
 return true;
}
let calendarYear=Number(today().slice(0,4)),calendarMonth=Number(today().slice(5,7))-1;
function renderCalendar(){
 const calendar=$('calendar');calendar.replaceChildren();
 const header=document.createElement('div');header.className='calendar-nav';
 const previous=document.createElement('button'),next=document.createElement('button'),title=document.createElement('strong');
 previous.type=next.type='button';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','上個月');next.setAttribute('aria-label','下個月');
 const monthKey=calendarYear+'-'+String(calendarMonth+1).padStart(2,'0');previous.disabled=monthKey<=today().slice(0,7);
 title.textContent=calendarYear+' 年 '+(calendarMonth+1)+' 月';
 function move(delta){const d=new Date(Date.UTC(calendarYear,calendarMonth+delta,1));calendarYear=d.getUTCFullYear();calendarMonth=d.getUTCMonth();renderCalendar();}
 previous.onclick=()=>move(-1);next.onclick=()=>move(1);header.append(previous,title,next);calendar.append(header);
 const grid=document.createElement('div');grid.className='calendar-grid';
 '日一二三四五六'.split('').forEach(day=>{const span=document.createElement('span');span.textContent=day;span.className='weekday';grid.append(span);});
 const offset=new Date(Date.UTC(calendarYear,calendarMonth,1)).getUTCDay(),days=new Date(Date.UTC(calendarYear,calendarMonth+1,0)).getUTCDate();
 for(let i=0;i<offset;i++)grid.append(document.createElement('span'));
 for(let day=1;day<=days;day++){
  const value=monthKey+'-'+String(day).padStart(2,'0'),reason=bookingDateReason(value,window.BOOKING_CONFIG,today(),selection().value);
  const button=document.createElement('button');button.type='button';button.textContent=day;button.disabled=Boolean(reason);button.title=reason||value;button.setAttribute('aria-label',value+(reason?'，'+reason:''));button.setAttribute('aria-pressed',String($('date').value===value));
  button.onclick=()=>{$('date').value=value;$('date-error').textContent='';syncBookingTimes();update();renderCalendar();};grid.append(button);
 }
 calendar.append(grid);
}
renderCalendar();







