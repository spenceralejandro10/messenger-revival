(()=>{
if(window.__MSNWinkSyncFixInstalled)return;window.__MSNWinkSyncFixInstalled=true;
let client=null,user=null,channel=null;const handled=new Set();
const $=s=>document.querySelector(s);
function toast(text){const el=$('#toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(window.__winkSyncToast);window.__winkSyncToast=setTimeout(()=>el.classList.remove('show'),2200)}
function activePeer(){return window.MessengerChat?.getActivePeer?.()||null}
function closePicker(){document.querySelectorAll('.msn-wink-sync-picker').forEach(x=>x.remove())}
function playRow(row){
  if(window.MessengerConversationRoom?.active)return false;
  if(!row?.id||row.kind!=='wink'||!user||row.recipient_id!==user.id||row.sender_id===user.id)return false;
  const key=String(row.id);if(handled.has(key))return false;
  const peer=activePeer();if(!peer||String(peer.id)!==String(row.sender_id))return false;
  handled.add(key);if(handled.size>400){const first=handled.values().next().value;handled.delete(first)}
  const api=window.MessengerWinks;if(!api)return false;
  let played=api.play?.(row.body||'wink',{messageId:key});
  const root=document.querySelector('#chatWindow .conversation-main');
  if(!played&&!root?.querySelector('.msn-wink-overlay-2005'))played=api.play?.(row.body||'wink',{messageId:'sync:'+key});
  if(played)window.MessengerSounds?.playMessage?.();
  return !!played;
}
async function catchRecent(){
  if(window.MessengerConversationRoom?.active)return;
  const peer=activePeer();if(!client||!user||!peer||peer.is_self)return;
  const since=new Date(Date.now()-15000).toISOString();
  const {data,error}=await client.from('messages').select('id,sender_id,recipient_id,kind,body,created_at').eq('recipient_id',user.id).eq('sender_id',peer.id).eq('kind','wink').gte('created_at',since).order('created_at',{ascending:false}).limit(1);
  if(!error&&data?.[0])playRow(data[0]);
}
function subscribe(){
  if(channel&&client)client.removeChannel?.(channel);channel=null;
  if(!client||!user)return;
  channel=client.channel('wink-sync-'+user.id+'-'+crypto.randomUUID()).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'recipient_id=eq.'+user.id},payload=>playRow(payload.new)).subscribe();
}
async function init(ev){
  client=window.MessengerSession?.client||null;
  user=ev?.detail?.user||window.MessengerSession?.user||null;
  handled.clear();if(!client||!user)return;
  try{const {data}=await client.auth.getSession();const token=data?.session?.access_token;if(token&&client.realtime?.setAuth)await client.realtime.setAuth(token)}catch{}
  subscribe();setTimeout(catchRecent,250);
}
function cleanup(){closePicker();if(channel&&client)client.removeChannel?.(channel);channel=null;client=null;user=null;handled.clear()}
function showPicker(anchor){
  const api=window.MessengerWinks;if(!api?.catalog?.length)return toast('Los guiños todavía se están cargando.');
  closePicker();const menu=document.createElement('div');menu.className='msn-content-menu msn-wink-sync-picker';
  for(const w of api.catalog){const b=document.createElement('button');b.type='button';b.innerHTML='<span>'+w.icon+'</span><span>'+w.name+'</span>';b.onclick=async ev=>{ev.preventDefault();ev.stopPropagation();closePicker();let sent=null;if(window.MessengerConversationRoom?.active)sent=await window.MessengerConversationRoom.sendSpecial?.('wink',w.id);else{const peer=activePeer();if(!peer)return toast('Abre una conversación primero.');sent=await window.MessengerChat?.sendSpecial?.('wink',w.id)}if(!sent)return toast('No se pudo enviar el guiño.');api.play?.(w.id,{messageId:String((window.MessengerConversationRoom?.active?'room-local:':'local:')+(sent.id||Date.now()))});toast('Guiño enviado: '+w.name)};menu.appendChild(b)}
  document.body.appendChild(menu);const r=anchor.getBoundingClientRect();menu.style.left=Math.max(6,Math.min(window.innerWidth-menu.offsetWidth-6,r.left))+'px';menu.style.top=Math.max(6,r.top-menu.offsetHeight-4)+'px';
}
document.addEventListener('click',ev=>{
  const button=ev.target.closest?.('#chatWindow .emoji-btn[title*="Guiñ"]');
  if(!button){if(!ev.target.closest?.('.msn-wink-sync-picker'))closePicker();return}
  ev.preventDefault();ev.stopImmediatePropagation();showPicker(button);
},true);
window.addEventListener('messenger-revival:auth-ready',init);
window.addEventListener('messenger-revival:auth-signed-out',cleanup);
window.addEventListener('messenger-revival:conversation-opened',()=>setTimeout(catchRecent,180));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(catchRecent,180)});
if(window.MessengerSession?.user)init();
})();