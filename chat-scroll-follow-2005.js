(()=>{
const pane=document.querySelector('#messagePane');
if(!pane||pane.dataset.latestMessageFollow==='1')return;
pane.dataset.latestMessageFollow='1';

let followLatest=true;
let userScrollTop=0;
let programmatic=false;
let raf=0;
const bottomGap=24;

function maxScrollTop(){return Math.max(0,pane.scrollHeight-pane.clientHeight)}
function isNearBottom(){return maxScrollTop()-pane.scrollTop<=bottomGap}
function finishProgrammatic(){requestAnimationFrame(()=>{programmatic=false})}
function scrollToLatest(force=false){
  if(force)followLatest=true;
  if(!followLatest)return;
  programmatic=true;
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{
    pane.scrollTop=pane.scrollHeight;
    requestAnimationFrame(()=>{
      pane.scrollTop=pane.scrollHeight;
      userScrollTop=pane.scrollTop;
      finishProgrammatic();
    });
  });
}
function restoreManualPosition(){
  if(followLatest)return;
  programmatic=true;
  pane.scrollTop=Math.min(userScrollTop,maxScrollTop());
  finishProgrammatic();
}
function forceLatest(){
  followLatest=true;
  scrollToLatest(true);
}

pane.addEventListener('scroll',()=>{
  if(programmatic)return;
  if(isNearBottom()){
    followLatest=true;
    userScrollTop=pane.scrollTop;
    return;
  }
  followLatest=false;
  userScrollTop=pane.scrollTop;
},{passive:true});

pane.addEventListener('wheel',ev=>{
  if(ev.deltaY<0){
    followLatest=false;
    userScrollTop=pane.scrollTop;
  }
},{passive:true});
pane.addEventListener('touchmove',()=>{
  followLatest=false;
  userScrollTop=pane.scrollTop;
},{passive:true});

const observer=new MutationObserver(()=>{
  if(followLatest)scrollToLatest();
  else restoreManualPosition();
});
observer.observe(pane,{childList:true,subtree:true,characterData:true});

pane.addEventListener('load',ev=>{
  if(ev.target instanceof HTMLImageElement){
    if(followLatest)scrollToLatest();
    else restoreManualPosition();
  }
},true);
pane.addEventListener('loadedmetadata',ev=>{
  if(ev.target instanceof HTMLMediaElement){
    if(followLatest)scrollToLatest();
    else restoreManualPosition();
  }
},true);

const forceOnOutgoing=ev=>{
  if(ev.type==='click'&&ev.target.closest?.('#messagePane'))return;
  forceLatest();
};
document.querySelector('#messageForm')?.addEventListener('submit',forceOnOutgoing,true);
document.querySelector('#sendFilesBtn')?.addEventListener('click',forceOnOutgoing,true);
document.querySelector('#nudgeBtn')?.addEventListener('click',forceOnOutgoing,true);
document.querySelector('.voice-clip-btn')?.addEventListener('click',forceOnOutgoing,true);
document.querySelectorAll('.emoji-btn[data-emoji]').forEach(btn=>btn.addEventListener('click',forceOnOutgoing,true));

window.addEventListener('resize',()=>{if(followLatest)scrollToLatest()},{passive:true});
window.addEventListener('messenger-revival:auth-ready',()=>setTimeout(()=>scrollToLatest(true),0));

const style=document.createElement('style');
style.id='latestMessageFollowStyle';
style.textContent='#messagePane{overflow-anchor:none}';
document.head.appendChild(style);

scrollToLatest(true);
})();
