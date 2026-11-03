let bookingSnapshot=null,lineState='loading';
function captureBooking(){const item=selection();bookingSnapshot={experience:item.value,location:item.dataset.location,date:$('date').value,time:$('time').value,people:$('people').value,name:$('name').value.trim(),phone:$('phone').value,total:money(Number(item.dataset.price)*Number($('people').value))};}
function lineStatusMessage(){return {
 loading:'尚未傳送。正在連接 LINE，請稍候或按下傳送重試。',
 local:'此為電腦預覽，無法直接傳回聊天室。請先上線，再從官方帳號聊天室點開 LIFF 連結填寫預約。',
 external:'請從工作室官方帳號聊天室點開 LIFF 連結後預約，才能傳回原聊天室。下方入口可開啟 LINE；原填寫資料不會自動帶入。',
 permission:'LINE 尚未授權傳送訊息。請確認 LIFF 已開啟 chat_message.write 權限，再從官方帳號聊天室重新點開連結並同意授權。',
 error:'LINE 連接失敗。請確認網路與 LIFF Endpoint URL 是否對應目前上線網址，再重新開啟。',
 ready:'尚未傳送。確認後將以預約小卡傳回開啟此頁的聊天室。'
}[lineState];}
function bookingFlex(data){
 const rows=[['體驗',data.experience],['地點',data.location],['日期',data.date],['希望時間',data.time],['人數',data.people+' 人'],['姓名',data.name],['手機',data.phone],['預估費用',data.total]];
 return {type:'flex',altText:'預約體驗內容｜'+data.experience+'｜'+data.date+' '+data.time,contents:{type:'bubble',body:{type:'box',layout:'vertical',spacing:'md',contents:[{type:'text',text:'嘉義梅山太平',color:'#65775F',size:'sm',weight:'bold'},{type:'text',text:'體驗預約申請',size:'xl',weight:'bold',wrap:true},{type:'separator'},...rows.map(([label,value])=>({type:'box',layout:'baseline',spacing:'sm',contents:[{type:'text',text:label,color:'#777777',size:'sm',flex:2},{type:'text',text:String(value),color:'#333333',size:'sm',wrap:true,flex:5}]})),{type:'separator'},{type:'text',text:'待工作室回覆確認後，預約才正式成立。',size:'xs',color:'#777777',wrap:true}]}}};
}
async function connectLine(){
 if(location.protocol==='file:'){lineState='local';return;}
 try{
  if(!window.liff)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://static.line-scdn.net/liff/edge/2/sdk.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
  await liff.init({liffId:window.BOOKING_CONFIG.liffId});
  const context=liff.getContext();
  if(!liff.isInClient()||!liff.isLoggedIn()||!['utou','group','room'].includes(context?.type)){lineState='external';return;}
  if(liff.permission?.getGrantedAll){const grants=await liff.permission.getGrantedAll();if(!grants.includes('chat_message.write')){lineState='permission';return;}}
  lineState='ready';liffReady=true;
 }catch{lineState='error';liffReady=false;}
 finally{if($('review').open&&!sent)$('status').textContent=lineStatusMessage();}
}
$('send').onclick=async()=>{
 if(sent||!bookingSnapshot)return;
 if(bookingDateReason(bookingSnapshot.date,window.BOOKING_CONFIG,today(),bookingSnapshot.experience)){$('status').textContent='原選日期已無法預約，請關閉此視窗並重新選擇日期。';return;}
 if(!allowedBookingTimes(bookingSnapshot.date,bookingSnapshot.experience).includes(bookingSnapshot.time)){ $('status').textContent='原時段已無法預約，請重新選擇時間。';return;}
 if(lineState==='loading'){$('status').textContent=lineStatusMessage();return;}
 if(lineState!=='ready'){$('status').textContent=lineStatusMessage();return;}
 $('send').disabled=true;$('send').textContent='正在傳送小卡…';
 try{await liff.sendMessages([bookingFlex(bookingSnapshot)]);sent=true;$('send').textContent='預約小卡已傳送 ✓';$('status').textContent='已傳至聊天室，請等待工作室回覆確認。';}
 catch(error){$('send').disabled=false;$('send').textContent='重試傳送預約小卡';$('status').textContent=String(error.code)==='403'?'LINE 拒絕傳送。請從官方帳號聊天室重新點開 LIFF 連結，並確認 chat_message.write 權限；也可先複製文字摘要。':'小卡傳送失敗，尚未送出。請重試，或複製文字摘要貼至官方帳號聊天室。';}
};
connectLine();



