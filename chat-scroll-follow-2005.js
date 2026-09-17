(()=>{
const pane=document.querySelector('#messagePane');
const chat=document.querySelector('#chatWindow');
if(!pane||pane.dataset.latestMessageFollow==='2')return;
pane.dataset.latestMessageFollow='2';

let manualReview=false;
let userScrollTop=0;
let programmatic=false;
let raf=0;
let settleTimer=0;
let userIntentUntil=0;
const bottomGap=28;

function maxScrollTop(){return Math.max(0,pane.scrollHeight-pane.clientHeight)}
function isNearBottom(){return maxScrollTop()-pane.scrollTop<=bottomGap}
function finishProgrammatic(){requestAnimationFrame(()=>{programmatic=false})}
function noteUserIntent(ms=350){userIntentUntil=Date.now()+ms}
function scheduleLatest(force=false){
  if(force)manualReview=false;
  if(manualReview)return;
  cancelAnimationFrame(raf);
  clearTimeout(settleTimer);
  programmatic=true;
  raf=requestAnimationFrame(()=>{
    pane.scrollTop=maxScrollTop();
    requestAnimationFrame(()=>{
      pane.scrollTop=maxScrollTop();
      userScrollTop=pane.scrollTop;
      finishProgrammatic();
      settleTimer=setTimeout(()=>{
        if(!manualReview){
          programmatic=true;
          pane.scrollTop=maxScrollTop();
          userScrollTop=pane.scrollTop;
          finishProgrammatic();
        }
      },80);
    });
  });
}
function restoreManualPosition(){
  if(!manualReview)return;
  programmatic=true;
  pane.scrollTop=Math.min(userScrollTop,maxScrollTop());
  finishProgrammatic();
}
function forceLatest(){manualReview=false;scheduleLatest(true)}

pane.addEventListener('scroll',()=>{
  if(programmatic)return;
  if(Date.now()<=userIntentUntil){
    if(isNearBottom()){
      manualReview=false;
      userScrollTop=pane.scrollTop;
    }else{
      manualReview=true;
      userScrollTop=pane.scrollTop;
    }
    return;
  }
  // Layout, image loading, maximize/restore and browser anchoring must never
  // turn off follow mode. Only explicit user scrolling is allowed to do that.
  if(!manualReview&&isNearBottom())userScrollTop=pane.scrollTop;
},{passive:true});

pane.addEventListener('wheel',ev=>{
  noteUserIntent();
  if(ev.deltaY<0){
    manualReview=true;
    userScrollTop=pane.scrollTop;
  }else{
    setTimeout(()=>{
      if(isNearBottom()){
        manualReview=false;
        userScrollTop=pane.scrollTop;
      }
    },0);
  }
},{passive:true});

let touchStartY=null;
pane.addEventListener('touchstart',ev=>{
  touchStartY=ev.touches?.[0]?.clientY??null;
  noteUserIntent(700);
},{passive:true});
pane.addEventListener('touchmove',ev=>{
  const y=ev.touches?.[0]?.clientY;
  if(touchStartY!=null&&y!=null&&y>touchStartY+2){
    manualReview=true;
    userScrollTop=pane.scrollTop;
  }
  noteUserIntent(700);
},{passive:true});
pane.addEventListener('touchend',()=>{
  setTimeout(()=>{
    if(isNearBottom())manualReview=false;
    else userScrollTop=pane.scrollTop;
  },0);
},{passive:true});

pane.addEventListener('keydown',ev=>{
  if(['ArrowUp','PageUp','Home'].includes(ev.key)){
    noteUserIntent();
    manualReview=true;
    userScrollTop=pane.scrollTop;
  }else if(ev.key==='End'){
    noteUserIntent();
    forceLatest();
  }else if(['ArrowDown','PageDown'].includes(ev.key)){
    noteUserIntent();
    setTimeout(()=>{if(isNearBottom())manualReview=false},0);
  }
});

pane.addEventListener('pointerdown',ev=>{
  const scrollbarZone=ev.offsetX>=pane.clientWidth-4;
  if(scrollbarZone){
    noteUserIntent(1000);
    manualReview=true;
    userScrollTop=pane.scrollTop;
  }
});
window.addEventListener('pointerup',()=>{
  if(Date.now()<=userIntentUntil){
    if(isNearBottom())manualReview=false;
    else userScrollTop=pane.scrollTop;
  }
},{passive:true});

const contentObserver=new MutationObserver(()=>{
  if(manualReview)restoreManualPosition();
  else scheduleLatest();
});
contentObserver.observe(pane,{childList:true,subtree:true,characterData:true});

pane.addEventListener('load',ev=>{
  if(ev.target instanceof HTMLImageElement){
    if(manualReview)restoreManualPosition();
    else scheduleLatest();
  }
},true);
pane.addEventListener('loadedmetadata',ev=>{
  if(ev.target instanceof HTMLMediaElement){
    if(manualReview)restoreManualPosition();
    else scheduleLatest();
  }
},true);

const forceOnOutgoing=()=>forceLatest();
document.querySelector('#messageForm')?.addEventListener('submit',forceOnOutgoing,true);
document.querySelector('#sendFilesBtn')?.addEventListener('click',forceOnOutgoing,true);
document.querySelector('#nudgeBtn')?.addEventListener('click',forceOnOutgoing,true);
document.querySelector('.voice-clip-btn')?.addEventListener('click',forceOnOutgoing,true);
document.querySelectorAll('.emoji-btn[data-emoji]').forEach(btn=>btn.addEventListener('click',forceOnOutgoing,true));

const sizeObserver=new ResizeObserver(()=>{
  if(!manualReview)scheduleLatest();
});
sizeObserver.observe(pane);
if(chat)sizeObserver.observe(chat);

if(chat){
  const windowStateObserver=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.attributeName==='class')&&!manualReview){
      requestAnimationFrame(()=>scheduleLatest());
      setTimeout(()=>scheduleLatest(),60);
    }
  });
  windowStateObserver.observe(chat,{attributes:true,attributeFilter:['class','style']});
}

window.addEventListener('resize',()=>{if(!manualReview)scheduleLatest()},{passive:true});
window.visualViewport?.addEventListener('resize',()=>{if(!manualReview)scheduleLatest()},{passive:true});
document.addEventListener('fullscreenchange',()=>{if(!manualReview)scheduleLatest()});
window.addEventListener('messenger-revival:auth-ready',()=>setTimeout(()=>scheduleLatest(true),0));

const style=document.createElement('style');
style.id='latestMessageFollowStyle';
style.textContent='#messagePane{overflow-anchor:none}';
document.head.appendChild(style);

scheduleLatest(true);
})();
