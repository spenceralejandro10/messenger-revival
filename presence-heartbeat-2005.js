(()=>{
const HEARTBEAT_MS=5000;
const STALE_MS=15000;
let client=null,user=null,timer=null,busy=false;

function effectiveStatus(profile,now=Date.now()){
  if(!profile)return'offline';
  if(profile.status==='offline')return'offline';
  const seen=profile.last_seen_at?new Date(profile.last_seen_at).getTime():0;
  if(!seen||!Number.isFinite(seen)||now-seen>STALE_MS)return'offline';
  return profile.status||'online';
}
function isOnline(profile,now=Date.now()){
  return effectiveStatus(profile,now)!=='offline';
}
async function touch(){
  if(!client||!user||busy||!navigator.onLine)return false;
  busy=true;
  try{
    const {data,error}=await client.rpc('heartbeat_presence');
    if(error)throw error;
    const seen=typeof data==='string'?data:new Date().toISOString();
    if(window.MessengerSession?.profile)window.MessengerSession.profile.last_seen_at=seen;
    return true;
  }catch(error){
    console.warn('Presence heartbeat failed',error?.message||error);
    return false;
  }finally{busy=false}
}
function start(){
  clearInterval(timer);
  timer=setInterval(touch,HEARTBEAT_MS);
  touch();
}
function stop(){
  clearInterval(timer);timer=null;busy=false;
}
async function markOffline(){
  if(!client||!user)return false;
  stop();
  try{
    const {error}=await client.rpc('mark_presence_offline');
    if(error)throw error;
    if(window.MessengerSession?.profile){
      window.MessengerSession.profile.status='offline';
      window.MessengerSession.profile.last_seen_at=null;
    }
    return true;
  }catch(error){
    console.warn('Mark offline failed',error?.message||error);
    return false;
  }
}
function init(event){
  client=window.MessengerSession?.client||null;
  user=event?.detail?.user||window.MessengerSession?.user||null;
  if(!client||!user)return;
  start();
}
function cleanup(){stop();client=null;user=null}
window.addEventListener('messenger-revival:auth-ready',init);
window.addEventListener('messenger-revival:auth-signed-out',cleanup);
window.addEventListener('online',()=>{if(user){touch();start()}});
window.addEventListener('offline',()=>{stop()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user){touch();start()}});
window.MessengerPresence={
  touch,
  markOffline,
  effectiveStatus,
  isOnline,
  staleMs:STALE_MS
};
if(window.MessengerSession?.user)init();
})();