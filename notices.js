const noticeDialog=$('experience-dialog');
let processMedia='',isGif=false,playing=false;
function setProcessPlayback(play){
 playing=play;
 if(play&&processMedia){$('process-image').src=processMedia;$('process-image').hidden=false;}
 else{$('process-image').removeAttribute('src');$('process-image').hidden=true;}
 $('motion-toggle').textContent=play?'暫停動畫':'播放體驗過程動畫';
}
function openExperienceNotice(){
 showExperienceInfo();
 processMedia=window.BOOKING_CONFIG.processImages?.[selection().value]||'';
 isGif=/\.gif(?:[?#]|$)/i.test(processMedia);
 $('motion-toggle').hidden=!isGif;
 $('process-image').hidden=!processMedia;
 if(isGif)setProcessPlayback(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
noticeDialog.addEventListener('close',()=>{$('process-image').removeAttribute('src');});
noticeDialog.addEventListener('click',event=>{if(event.target===noticeDialog){const r=noticeDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)noticeDialog.close();}});
// Do not download or play process media until the visitor opens the notice.
$('process-image').removeAttribute('src');
