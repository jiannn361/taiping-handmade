const noticeDialog=$('experience-dialog');
const processFrame=$('process-frame');
const processImages=$('process-images');
const motionToggle=$('motion-toggle');
let processMedia=[],playing=false;

function isAnimated(src){return /\.gif(?:[?#]|$)/i.test(src);}
function setProcessPlayback(play){
 playing=play;
 const experience=selection().value;
 const images=processMedia.flatMap((src,index)=>{
  if(!play&&isAnimated(src))return [];
  const image=document.createElement('img');
  image.alt=processMedia.length>1?experience+'｜步驟 '+(index+1):experience+'施作流程圖';
  image.src=src;
  return [image];
 });
 mediaError.hidden=true;
 processImages.replaceChildren(...images);
 motionToggle.textContent=play?'暫停動畫':'播放體驗過程動畫';
}
function openExperienceNotice(){
 showExperienceInfo();
 const configured=window.BOOKING_CONFIG.processImages?.[selection().value];
 processMedia=Array.isArray(configured)?configured:configured?[configured]:[];
 motionToggle.hidden=!processMedia.some(isAnimated);
 processFrame.hidden=!processMedia.length;
 setProcessPlayback(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 if(!noticeDialog.open){noticeDialog.showModal();noticeDialog.querySelector('.notice-scroll').scrollTop=0;}
}
// Label activation triggers the radio's click, including when the item is already selected.
document.querySelectorAll('[name="experience"]').forEach(input=>{
 input.addEventListener('click',openExperienceNotice);
 input.addEventListener('change',()=>{if(!noticeDialog.open)openExperienceNotice();});
});
$('notice-close').onclick=()=>noticeDialog.close();
$('notice-confirm').onclick=()=>noticeDialog.close();
$('motion-toggle').onclick=()=>setProcessPlayback(!playing);
noticeDialog.addEventListener('close',()=>{if(!noticeDialog.open)processImages.replaceChildren();});
noticeDialog.addEventListener('click',event=>{if(event.target===noticeDialog){const r=noticeDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)noticeDialog.close();}});
const mediaError=document.createElement('p');
mediaError.className='note';
mediaError.hidden=true;
mediaError.setAttribute('role','status');
mediaError.textContent='有圖片暫時無法載入，請重新開啟預約須知。';
processFrame.append(mediaError);
processImages.addEventListener('error',()=>{if(noticeDialog.open)mediaError.hidden=false;},true);
