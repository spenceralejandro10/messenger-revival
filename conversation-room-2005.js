(()=>{
const $=s=>document.querySelector(s);
let client=null,user=null,activeRoom=null,roomInfo=null,members=[],profiles=new Map(),roomChannel=null,membershipChannel=null,lastPeer=null,openSeq=0,seen=new Set(),membershipTimer=null;

function toast(text){
  const el=$('#toast');if(!el)return;
  el.textContent=text;el.classList.add('show');
  clearTimeout(window.__roomToast);
  window.__roomToast=setTimeout(()=>el.classList.remove('show'),2400);
}
function isAdmin(){return !!user&&!!roomInfo&&roomInfo.created_by===user.id}
function nameOf(id){const p=profiles.get(id);return p?.display_name||p?.email||'Contacto'}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

function installStyle(){
  if($('#conversationRoomStyle'))return;
  const s=document.createElement('style');s.id='conversationRoomStyle';
  s.textContent=`
  .conversation-room-window{z-index:920;width:800px;height:610px;display:flex;flex-direction:column}
  .conversation-room-window>.titlebar,.conversation-room-window>.menubar,.conversation-room-window>.actionbar,.conversation-room-window>.promo-bar{flex:0 0 auto}
  .conversation-room-window>.conversation-shell{flex:1 1 auto!important;height:auto!important;min-height:0!important;overflow:hidden;padding:10px 12px 7px}
  .conversation-room-window .conversation-main{width:100%;display:flex;flex-direction:column;min-height:0}
  .conversation-room-window .room-message-pane{flex:1 1 auto!important;height:auto!important;min-height:120px!important;overflow:auto}
  .conversation-room-window .room-compose{flex:0 0 100px!important;height:100px!important;min-height:100px!important}
  .conversation-room-window .room-participants-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .conversation-room-window .room-admin-note{margin-left:auto;padding:0 8px;font:11px Tahoma;color:#385d78;white-space:nowrap}
  .conversation-room-window .message-time{font-size:10px;color:#7b8790;margin:2px 0 7px 10px}
  .conversation-room-window .room-system{font-style:italic;color:#5d7180;margin:5px 0}
  .conversation-room-dialog{position:fixed;z-index:14500;width:420px;max-width:calc(100vw - 30px);left:50%;top:50%;transform:translate(-50%,-50%);background:#eef7fc;border:1px solid #557f9f;box-shadow:3px 4px 12px #0005;font:11px Tahoma}
  .conversation-room-dialog-title{padding:6px 8px;background:linear-gradient(#4e9bdd,#1d6cb7);color:#fff;font-weight:bold}
  .conversation-room-dialog-body{padding:10px}
  .conversation-room-list{max-height:300px;overflow:auto;background:#fff;border:1px solid #a7c1d2;margin:7px 0}
  .conversation-room-person{display:flex;align-items:center;gap:8px;padding:7px;border-bottom:1px solid #e0edf4}
  .conversation-room-person img,.conversation-room-placeholder{width:38px;height:38px;object-fit:contain;background:#fff;border:1px solid #8aa8bb}
  .conversation-room-placeholder{display:grid;place-items:center}
  .conversation-room-copy{flex:1;min-width:0}.conversation-room-copy b,.conversation-room-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .conversation-room-person button,.conversation-room-dialog-actions button{font:11px Tahoma;height:24px}
  .conversation-room-dialog-actions{text-align:right;margin-top:8px}
  .room-host-badge{display:inline-block;margin-left:5px;padding:1px 5px;border:1px solid #c99a3a;background:#fff3bd;color:#725300;font:bold 9px Tahoma;border-radius:2px}
  .room-remove{color:#8b1e1e}
  @media(max-height:700px){.conversation-room-window{height:min(610px,calc(100vh - 20px));top:10px!important}.conversation-room-window .room-compose{flex-basis:86px!important;height:86px!important;min-height:86px!important}}
  `;
  document.head.appendChild(s);
}

function ensureInviteDialog(){
  let d=$('#conversationInviteDialog');if(d)return d;
  d=document.createElement('div');d.id='conversationInviteDialog';d.className='conversation-room-dialog';d.hidden=true;
  d.innerHTML='<div class="conversation-room-dialog-title">Invitar a esta conversación</div><div class="conversation-room-dialog-body"><div id="conversationInviteHint">Selecciona a quién quieres agregar a esta conversación.</div><div id="conversationInviteList" class="conversation-room-list"></div><div class="conversation-room-dialog-actions"><button id="conversationInviteClose" type="button">Cerrar</button></div></div>';
  document.body.appendChild(d);$('#conversationInviteClose').onclick=()=>d.hidden=true;return d;
}
function ensureParticipantsDialog(){
  let d=$('#conversationParticipantsDialog');if(d)return d;
  d=document.createElement('div');d.id='conversationParticipantsDialog';d.className='conversation-room-dialog';d.hidden=true;
  d.innerHTML='<div class="conversation-room-dialog-title">Participantes de la conversación</div><div class="conversation-room-dialog-body"><div id="conversationParticipantsHint"></div><div id="conversationParticipantsList" class="conversation-room-list"></div><div class="conversation-room-dialog-actions"><button id="conversationParticipantsClose" type="button">Cerrar</button></div></div>';
  document.body.appendChild(d);$('#conversationParticipantsClose').onclick=()=>d.hidden=true;return d;
}
function ensureRoomWindow(){
  let w=$('#conversationRoomWindow');if(w)return w;
  w=document.createElement('section');w.id='conversationRoomWindow';w.className='msn-window chat-window conversation-room-window';w.style.display='none';
  w.innerHTML='<header class="titlebar"><img class="msn-titlebar-icon" src="assets/community-avatars/invite(1).png" alt=""><b><span id="conversationRoomTitle">Conversation</span> - Conversation</b><div class="caption-buttons"><button type="button" disabled>_</button><button type="button" disabled>□</button><button id="conversationRoomClose" type="button">×</button></div></header><nav class="menubar">File Edit Actions Tools Help</nav><div class="actionbar retro-actionbar"><button id="conversationRoomInvite" type="button"><img src="assets/community-avatars/invite.png?v=3" alt=""><small>Invite</small></button><button id="conversationRoomParticipants" type="button"><img src="assets/status-icons/08-contactos-grupo-dos-usuarios.png" alt=""><small>Participantes</small></button><span id="conversationRoomAdminNote" class="room-admin-note"></span><div class="msn-wordmark" role="img" aria-label="msn"></div></div><div class="conversation-shell"><div class="conversation-main"><div class="to-line room-participants-line">To: <b id="conversationRoomMembers"></b></div><div id="conversationRoomMessages" class="message-pane room-message-pane"></div><div class="compose-toolbar"><button id="conversationRoomSmile" type="button">☺</button><button id="conversationRoomWink" type="button">😉</button><button id="conversationRoomNudge" type="button" class="nudge-visible"><span>((⚡))</span><b>Zumbido</b></button></div><form id="conversationRoomForm" class="composer room-compose"><textarea id="conversationRoomInput"></textarea><div class="send-stack"><button class="send-btn">Send</button></div></form></div></div><footer class="promo-bar">Messenger Revival — conversación con participantes <span class="resize-grip">⋰</span></footer>';
  document.querySelector('.stage')?.appendChild(w);
  $('#conversationRoomClose').onclick=closeRoom;
  $('#conversationRoomInvite').onclick=()=>openInviteDialog();
  $('#conversationRoomParticipants').onclick=openParticipantsDialog;
  $('#conversationRoomForm').onsubmit=sendText;
  $('#conversationRoomSmile').onclick=()=>sendSpecial('emoji','😀');
  $('#conversationRoomWink').onclick=()=>sendSpecial('emoji','😉');
  $('#conversationRoomNudge').onclick=()=>sendSpecial('nudge','');
  return w;
}

function candidateRow(p,onInvite){
  const r=document.createElement('div');r.className='conversation-room-person';
  if(p.display_picture){const img=document.createElement('img');img.src=p.display_picture;img.alt='';r.appendChild(img)}
  else{const ph=document.createElement('span');ph.className='conversation-room-placeholder';ph.textContent='☺';r.appendChild(ph)}
  const copy=document.createElement('div');copy.className='conversation-room-copy';
  const b=document.createElement('b');b.textContent=p.display_name||p.email||'Contacto';
  const sm=document.createElement('small');sm.textContent=p.personal_message||p.email||'';
  copy.append(b,sm);
  const btn=document.createElement('button');btn.type='button';btn.textContent='Invitar';btn.onclick=()=>onInvite(p,btn);
  r.append(copy,btn);return r;
}

async function findExistingRoom(peerId){
  if(!client||!user||!peerId)return null;
  const {data,error}=await client.rpc('find_latest_conversation_room',{p_peer_id:peerId});
  if(error){console.warn('Room lookup failed',error.message);return null}
  return data||null;
}

async function openInviteDialog(){
  if(!client||!user)return;
  const d=ensureInviteDialog(),box=$('#conversationInviteList'),hint=$('#conversationInviteHint');
  box.textContent='Buscando contactos...';d.hidden=false;
  let data,error;

  if(activeRoom){
    if(!isAdmin()){hint.textContent=`Administrador: ${nameOf(roomInfo?.created_by)}. Solo el administrador puede agregar participantes.`;box.innerHTML='<div style="padding:12px;color:#677b89">No tienes permisos para invitar personas a esta conversación.</div>';return}
    hint.textContent='Como administrador, puedes agregar contactos de cualquiera de los participantes.';
    ({data,error}=await client.rpc('get_group_invite_candidates',{p_conversation_id:activeRoom}));
  }else{
    const peer=window.MessengerChat?.getActivePeer?.()||lastPeer;
    if(!peer||peer.is_self){box.textContent='Abre una conversación con un contacto primero.';return}
    const existing=await findExistingRoom(peer.id);
    if(existing){d.hidden=true;await openRoom(existing);return openInviteDialog()}
    hint.textContent='La persona que envió el primer mensaje de este chat será el administrador de la conversación.';
    ({data,error}=await client.rpc('get_direct_invite_candidates',{p_peer_id:peer.id}));
  }

  if(error){box.textContent=error.message;return}
  box.innerHTML='';
  if(!data?.length){box.innerHTML='<div style="padding:12px;color:#677b89">No hay contactos disponibles para invitar.</div>';return}
  for(const p of data)box.appendChild(candidateRow(p,invitePerson));
}

async function invitePerson(p,btn){
  btn.disabled=true;btn.textContent='Invitando...';
  try{
    if(activeRoom){
      const {error}=await client.rpc('add_member_to_group',{p_conversation_id:activeRoom,p_invitee_id:p.id});
      if(error)throw error;
      btn.textContent='Invitado';toast(`${p.display_name||p.email} entró a la conversación`);
      await loadRoomMeta();
      renderParticipants();
      return;
    }
    const peer=window.MessengerChat?.getActivePeer?.()||lastPeer;
    if(!peer)throw new Error('No hay una conversación activa.');
    const {data,error}=await client.rpc('create_group_from_direct',{p_peer_id:peer.id,p_invitee_id:p.id});
    if(error)throw error;
    ensureInviteDialog().hidden=true;
    await openRoom(data);
    toast(`${p.display_name||p.email} fue invitado a esta conversación`);
  }catch(error){
    btn.disabled=false;btn.textContent='Invitar';toast(error?.message||'No se pudo invitar al contacto.');
  }
}

function renderParticipants(){
  const box=$('#conversationParticipantsList');if(!box)return;
  box.innerHTML='';
  const adminName=nameOf(roomInfo?.created_by);
  $('#conversationParticipantsHint').textContent=isAdmin()?'Eres el administrador. Puedes retirar participantes de esta conversación.':`Administrador: ${adminName}`;
  for(const m of members){
    const p=profiles.get(m.user_id)||{id:m.user_id};
    const r=document.createElement('div');r.className='conversation-room-person';
    if(p.display_picture){const img=document.createElement('img');img.src=p.display_picture;img.alt='';r.appendChild(img)}
    else{const ph=document.createElement('span');ph.className='conversation-room-placeholder';ph.textContent='☺';r.appendChild(ph)}
    const copy=document.createElement('div');copy.className='conversation-room-copy';
    const b=document.createElement('b');b.textContent=p.display_name||p.email||'Contacto';
    if(m.user_id===roomInfo?.created_by){const badge=document.createElement('span');badge.className='room-host-badge';badge.textContent='Administrador';b.appendChild(badge)}
    const sm=document.createElement('small');sm.textContent=p.email||'';
    copy.append(b,sm);r.appendChild(copy);
    if(isAdmin()&&m.user_id!==roomInfo?.created_by){
      const remove=document.createElement('button');remove.type='button';remove.className='room-remove';remove.textContent='Eliminar';
      remove.onclick=()=>removeParticipant(m.user_id,p,remove);r.appendChild(remove);
    }
    box.appendChild(r);
  }
}
async function openParticipantsDialog(){
  if(!activeRoom)return;
  await loadRoomMeta();renderParticipants();ensureParticipantsDialog().hidden=false;
}
async function removeParticipant(id,p,button){
  if(!isAdmin())return toast('Solo el administrador puede eliminar participantes.');
  if(!confirm(`¿Eliminar a ${p.display_name||p.email||'este participante'} de la conversación?`))return;
  button.disabled=true;
  const {error}=await client.rpc('remove_conversation_participant',{p_conversation_id:activeRoom,p_member_id:id});
  if(error){button.disabled=false;return toast(error.message)}
  toast('Participante eliminado de la conversación.');
  await loadRoomMeta();renderParticipants();
}

async function loadRoomMeta(){
  if(!activeRoom)return false;
  const id=activeRoom;
  const [{data:info,error:infoError},{data:rows,error:membersError}]=await Promise.all([
    client.from('group_conversations').select('id,created_by,created_at').eq('id',id).maybeSingle(),
    client.from('group_conversation_members').select('conversation_id,user_id,joined_at,invited_by').eq('conversation_id',id).order('joined_at',{ascending:true})
  ]);
  if(id!==activeRoom)return false;
  if(infoError||membersError||!info||!rows?.some(x=>x.user_id===user.id)){handleRemoved();return false}
  roomInfo=info;members=rows||[];profiles.clear();
  const ids=members.map(x=>x.user_id);
  if(ids.length){
    const {data:ps}=await client.from('profiles').select('id,email,display_name,display_picture,personal_message,status').in('id',ids);
    for(const p of ps||[])profiles.set(p.id,p);
  }
  paintRoomHeader();return true;
}
function paintRoomHeader(){
  const names=members.map(m=>nameOf(m.user_id));
  $('#conversationRoomMembers').textContent=names.join(', ');
  $('#conversationRoomTitle').textContent=names.filter(n=>n!==nameOf(user?.id)).slice(0,3).join(', ')||'Conversation';
  $('#conversationRoomAdminNote').textContent=`Administrador: ${nameOf(roomInfo?.created_by)}`;
  const invite=$('#conversationRoomInvite');if(invite){invite.disabled=!isAdmin();invite.title=isAdmin()?'Invitar a esta conversación':'Solo el administrador puede invitar participantes'}
}

function messageFormat(){
  const f=window.MessengerChatFormat?.value||{};
  return {
    fontFamily:f.family||'Tahoma',
    fontSize:(Number(f.size)||11)+'px',
    color:f.color||'#000000',
    fontWeight:f.bold?'bold':'normal',
    fontStyle:f.italic?'italic':'normal',
    textDecoration:f.underline?'underline':'none'
  };
}
function applyFormat(node,format){if(!format||typeof format!=='object')return;for(const k of ['fontFamily','fontSize','color','fontWeight','fontStyle','textDecoration'])if(format[k])node.style[k]=format[k]}
function appendMessage(m){
  if(!m?.id||seen.has(m.id))return;seen.add(m.id);
  const pane=$('#conversationRoomMessages');if(!pane)return;pane.querySelector('.room-empty')?.remove();
  const row=document.createElement('div');row.className='message'+(m.sender_id===user?.id?' mine':'');
  if(m.kind==='nudge'){
    const sys=document.createElement('div');sys.className='room-system';sys.textContent=`${nameOf(m.sender_id)} envió un zumbido.`;row.appendChild(sys);
  }else{
    const meta=document.createElement('div');meta.className='message-meta';meta.textContent=`${nameOf(m.sender_id)} ... dice:`;
    const bubble=document.createElement('div');bubble.className='message-bubble';bubble.textContent=m.body||'';applyFormat(bubble,m.format);row.append(meta,bubble);
  }
  const time=document.createElement('div');time.className='message-time';try{time.textContent=new Date(m.created_at).toLocaleString()}catch{}row.appendChild(time);
  pane.appendChild(row);pane.scrollTop=pane.scrollHeight;
}
async function loadMessages(){
  if(!activeRoom)return;
  seen.clear();const pane=$('#conversationRoomMessages');pane.innerHTML='';
  const {data,error}=await client.from('group_messages').select('*').eq('conversation_id',activeRoom).order('created_at',{ascending:true}).limit(500);
  if(error){pane.textContent=error.message;return}
  if(!data?.length)pane.innerHTML='<div class="room-empty" style="padding:20px;text-align:center;color:#70808d">La conversación acaba de comenzar.</div>';
  for(const m of data||[])appendMessage(m);
}
async function sendText(ev){
  ev?.preventDefault?.();if(!activeRoom)return;
  const input=$('#conversationRoomInput'),body=input.value.trim();if(!body)return;
  const {data,error}=await client.from('group_messages').insert({conversation_id:activeRoom,sender_id:user.id,kind:'text',body,format:messageFormat()}).select().single();
  if(error)return toast(error.message);input.value='';appendMessage(data);
}
async function sendSpecial(kind,body){
  if(!activeRoom)return;
  const {data,error}=await client.from('group_messages').insert({conversation_id:activeRoom,sender_id:user.id,kind,body}).select().single();
  if(error)return toast(error.message);appendMessage(data);
  if(kind==='nudge')window.MessengerSounds?.playNudge?.();
}

function unsubscribeRoom(){
  if(roomChannel&&client)client.removeChannel?.(roomChannel);roomChannel=null;
  clearInterval(membershipTimer);membershipTimer=null;
}
function subscribeRoom(){
  unsubscribeRoom();if(!activeRoom)return;
  const id=activeRoom;
  roomChannel=client.channel(`conversation-room-${id}-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:`conversation_id=eq.${id}`},p=>{if(activeRoom!==id)return;appendMessage(p.new);if(p.new?.sender_id!==user.id)window.MessengerSounds?.playMessage?.()})
    .on('postgres_changes',{event:'*',schema:'public',table:'group_conversation_members',filter:`conversation_id=eq.${id}`},()=>{if(activeRoom===id)loadRoomMeta().then(()=>{if(!ensureParticipantsDialog().hidden)renderParticipants()})})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},p=>{if(activeRoom!==id||!p.new||!members.some(m=>m.user_id===p.new.id))return;profiles.set(p.new.id,p.new);paintRoomHeader();if(!ensureParticipantsDialog().hidden)renderParticipants()})
    .subscribe();
  membershipTimer=setInterval(async()=>{
    if(!activeRoom||document.hidden)return;
    const {data}=await client.rpc('is_group_member',{p_conversation_id:activeRoom,p_user_id:user.id});
    if(data===false)handleRemoved();
  },60000);
}
function handleRemoved(){
  const wasOpen=!!activeRoom;unsubscribeRoom();activeRoom=null;roomInfo=null;members=[];profiles.clear();seen.clear();
  ensureRoomWindow().style.display='none';ensureInviteDialog().hidden=true;ensureParticipantsDialog().hidden=true;
  const direct=$('#chatWindow');if(direct&&lastPeer)direct.style.display='';
  if(wasOpen)toast('Ya no formas parte de esta conversación.');
}

async function openRoom(id){
  if(!id||!client||!user)return;
  const seq=++openSeq;activeRoom=id;ensureRoomWindow().style.display='';
  const direct=$('#chatWindow');if(direct)direct.style.display='none';
  const ok=await loadRoomMeta();if(seq!==openSeq||!ok)return;
  await loadMessages();if(seq!==openSeq)return;
  subscribeRoom();
  const input=$('#conversationRoomInput'),fmt=window.MessengerChatFormat?.value;
  if(input&&fmt){input.style.fontFamily=fmt.family||'Tahoma';input.style.fontSize=(fmt.size||11)+'px';input.style.color=fmt.color||'#000';input.style.fontWeight=fmt.bold?'bold':'normal';input.style.fontStyle=fmt.italic?'italic':'normal';input.style.textDecoration=fmt.underline?'underline':'none'}
  input?.focus();
}
function closeRoom(){
  ++openSeq;unsubscribeRoom();activeRoom=null;roomInfo=null;members=[];profiles.clear();seen.clear();
  ensureRoomWindow().style.display='none';ensureInviteDialog().hidden=true;ensureParticipantsDialog().hidden=true;
  const direct=$('#chatWindow');if(direct&&lastPeer)direct.style.display='';
}

function wireInviteButton(){
  const b=$('#inviteBtn');if(!b||b.dataset.conversationRoomInvite==='1')return;
  b.dataset.conversationRoomInvite='1';b.title='Invitar a esta conversación';
  b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openInviteDialog()},true);
}
async function onDirectConversation(peer){
  if(!peer||peer.is_self||!user||!client)return;
  lastPeer={...peer};closeRoom();
  const seq=++openSeq;
  const id=await findExistingRoom(peer.id);
  if(seq!==openSeq||!id)return;
  await openRoom(id);
}
function subscribeMemberships(){
  if(membershipChannel&&client)client.removeChannel?.(membershipChannel);
  membershipChannel=client.channel(`conversation-membership-${user.id}-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_conversation_members',filter:`user_id=eq.${user.id}`},p=>{
      const id=p.new?.conversation_id;if(!id||id===activeRoom)return;
      toast('Te invitaron a una conversación.');
      openRoom(id);
    }).subscribe();
}
function removeLegacyGroupUi(){
  for(const sel of ['#groupsToolbarButton','.direct-groups-button','#groupListDialog','#groupNameDialog','#groupInviteDialog','#groupChatWindow'])document.querySelectorAll(sel).forEach(el=>el.remove());
}
function cleanup(){
  unsubscribeRoom();if(membershipChannel&&client)client.removeChannel?.(membershipChannel);membershipChannel=null;
  activeRoom=null;roomInfo=null;members=[];profiles.clear();seen.clear();user=null;client=null;lastPeer=null;
  const w=$('#conversationRoomWindow');if(w)w.style.display='none';
}
async function init(ev){
  cleanup();client=window.MessengerSession?.client||null;user=ev?.detail?.user||window.MessengerSession?.user||null;if(!client||!user)return;
  installStyle();removeLegacyGroupUi();ensureInviteDialog();ensureParticipantsDialog();ensureRoomWindow();wireInviteButton();subscribeMemberships();
}
installStyle();removeLegacyGroupUi();ensureInviteDialog();ensureParticipantsDialog();ensureRoomWindow();wireInviteButton();
window.addEventListener('messenger-revival:auth-ready',init);
window.addEventListener('messenger-revival:auth-signed-out',cleanup);
window.addEventListener('messenger-revival:conversation-opened',e=>onDirectConversation(e.detail?.peer));
if(window.MessengerSession?.user)init();
window.MessengerConversationRoom={openRoom,invite:openInviteDialog,participants:openParticipantsDialog,get id(){return activeRoom},get admin(){return roomInfo?.created_by||null}};
})();