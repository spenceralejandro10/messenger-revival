(()=>{
if(window.__MSNWinkSyncFixInstalled)return;window.__MSNWinkSyncFixInstalled=true;
const $=s=>document.querySelector(s);
function toast(text){const el=$('#toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(window.__winkSyncToast);window.__winkSyncToast=setTimeout(()=>el.classList.remove('show'),2200)}
function closePicker(){document.querySelectorAll('.msn-wink-sync-picker').forEach(x=>x.remove())}
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
window.addEventListener('messenger-revival:auth-signed-out',closePicker);
})();
