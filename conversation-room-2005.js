(()=>{
const $=s=>document.querySelector(s);
let client=null,user=null,activeRoom=null,roomInfo=null,members=[],profiles=new Map(),roomChannel=null,membershipChannel=null,lastPeer=null,openSeq=0,seen=new Set(),membershipTimer=null,roomReconnectTimer=null,roomRealtimeReady=false,roomBaselineLoaded=false;

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
  d.innerHTML='<div class="conversation-room-dialog-title">Invitar a esta conversación</div><div class="conversation-room-dialog-body"><div id="conversationInviteHint">Selecciona un contacto para invitar.</div><div id="conversationInviteList" class="conversation-room-list"></div><div class="conversation-room-dialog-actions"><button id="conversationInviteClose" type="button">Cerrar</button></div></div>';
  document.body.appendChild(d);$('#conversationInviteClose').onclick=()=>d.hidden=true;return d;
}
function ensureParticipantsDialog(){
  let d=$('#conversationParticipantsDialog');if(d)return d;
  d=document.createElement('div');d.id='conversationParticipantsDialog';d.className='conversation-room-dialog';d.hidden=true;
  d.innerHTML='<div class="conversation-room-dialog-title">Participantes de la conversación</div><div class="conversation-room-dialog-body"><div id="conversationParticipantsHint"></div><div id="conversationParticipantsList" class="conversation-room-list"></div><div class="conversation-room-dialog-actions"><button id="conversationParticipantsClose" type="button">Cerrar</button></div></div>';
  document.body.appendChild(d);$('#conversationParticipantsClose').onclick=()=>d.hidden=true;return d;
}
function ensureRoomWindow(){
  const w=$('#chatWindow');if(!w)return null;
  let pbtn=$('#conversationRoomParticipants');
  if(!pbtn){
    pbtn=document.createElement('button');pbtn.id='conversationRoomParticipants';pbtn.type='button';pbtn.hidden=true;
    pbtn.innerHTML='<img src="assets/status-icons/08-contactos-grupo-dos-usuarios.png" alt=""><small>Participantes</small>';
    pbtn.onclick=e=>{e.preventDefault();e.stopPropagation();openParticipantsDialog()};
    const invite=$('#inviteBtn'),bar=w.querySelector('.actionbar');if(invite?.parentNode===bar)invite.after(pbtn);else bar?.prepend(pbtn);
  }
  let note=$('#conversationRoomAdminNote');
  if(!note){note=document.createElement('span');note.id='conversationRoomAdminNote';note.className='room-admin-note';const bar=w.querySelector('.actionbar');bar?.insertBefore(note,bar.querySelector('.service-buttons')||bar.lastChild)}
  if(!$('#conversationRoomInlineStyle')){const s=document.createElement('style');s.id='conversationRoomInlineStyle';s.textContent='#chatWindow.room-inline-active #chatInfoName{max-width:68%;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}.room-inline-separator{margin:8px 3px;padding:5px 8px;border-top:1px solid #b7ccd9;border-bottom:1px solid #d9e7ef;background:#edf7fc;color:#42657d;font:italic 10px Tahoma}.room-inline-disabled{opacity:.45!important;filter:grayscale(.35)}';document.head.appendChild(s)}
  if(document.documentElement.dataset.roomInlineCapture!=='1'){
    document.documentElement.dataset.roomInlineCapture='1';
    document.addEventListener('submit',e=>{if(!activeRoom||e.target?.id!=='messageForm')return;e.preventDefault();e.stopImmediatePropagation();sendText(e)},true);
    document.addEventListener('pointerdown',e=>{if(!activeRoom)return;const b=e.target.closest?.('#chatWindow .voice-clip-btn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();toast('Voice Clip está disponible en conversaciones de dos personas.')},true);
    document.addEventListener('keydown',e=>{if(activeRoom&&e.key==='F2'){e.preventDefault();e.stopImmediatePropagation();toast('Voice Clip está disponible en conversaciones de dos personas.')}},true);
    document.addEventListener('click',e=>{
      if(!activeRoom)return;const b=e.target.closest?.('button');if(!b||!b.closest('#chatWindow'))return;
      if(['sendFilesBtn','videoBtn','voiceBtn'].includes(b.id)){e.preventDefault();e.stopImmediatePropagation();toast('Esta función queda disponible en conversaciones de dos personas.');return}
      if(b.id==='nudgeBtn'){e.preventDefault();e.stopImmediatePropagation();sendSpecial('nudge','');return}
      if(b.classList.contains('emoji-btn')&&/emoticon/i.test(b.title||'')){e.preventDefault();e.stopImmediatePropagation();const i=$('#messageInput');if(i){i.value+=(b.dataset.emoji||'😀');i.focus()}return}
    },true);
  }
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
    hint.textContent='Tus contactos disponibles para invitar:';
    ({data,error}=await client.rpc('get_group_invite_candidates',{p_conversation_id:activeRoom}));
  }else{
    const peer=window.MessengerChat?.getActivePeer?.()||lastPeer;
    if(!peer||peer.is_self){box.textContent='Abre una conversación con un contacto primero.';return}
    const existing=await findExistingRoom(peer.id);
    if(existing){d.hidden=true;await openRoom(existing);return openInviteDialog()}
    hint.textContent='Tus contactos disponibles para invitar:';
    ({data,error}=await client.rpc('get_direct_invite_candidates',{p_peer_id:peer.id}));
  }

  if(error){console.warn('Invite candidates failed',error);box.innerHTML='<div style="padding:12px;color:#677b89">No se pudieron cargar tus contactos disponibles. Intenta de nuevo.</div>';return}
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
      btn.textContent='Invitado';toast(`${p.display_name||p.email} se unió a esta conversación`);
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
    toast(`${p.display_name||p.email} se unió a este mismo chat`);
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
  const names=members.map(m=>nameOf(m.user_id)),others=members.filter(m=>m.user_id!==user?.id).map(m=>nameOf(m.user_id));
  const info=$('#chatInfoName'),title=$('#chatTitle'),note=$('#conversationRoomAdminNote'),pbtn=$('#conversationRoomParticipants');
  if(info)info.textContent=names.join(', ');
  if(title)title.textContent=others.slice(0,3).join(', ')||'Conversation';
  if(note)note.textContent=`Administrador: ${nameOf(roomInfo?.created_by)}`;
  if(pbtn)pbtn.hidden=false;
  const dot=$('#chatStatusDot');if(dot){dot.className='person-icon online';dot.title='Conversación con varios participantes'}
  const invite=$('#inviteBtn');if(invite){invite.disabled=!isAdmin();invite.title=isAdmin()?'Invitar a esta conversación':'Solo el administrador puede invitar participantes'}
  $('#chatWindow')?.classList.add('room-inline-active');
  for(const id of ['sendFilesBtn','videoBtn','voiceBtn'])$('#'+id)?.classList.add('room-inline-disabled');
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
  const pane=$('#messagePane');if(!pane)return;
  if(!pane.querySelector('.room-inline-separator')){const sep=document.createElement('div');sep.className='room-inline-separator';sep.textContent='Más personas se unieron a esta conversación. Los mensajes nuevos se comparten con todos los participantes.';pane.appendChild(sep)}
  const row=document.createElement('div');row.className='message'+(m.sender_id===user?.id?' mine':'');row.dataset.roomMessageId=m.id;
  if(m.kind==='nudge'){
    const sys=document.createElement('div');sys.className='room-system';sys.textContent=`${nameOf(m.sender_id)} envió un zumbido.`;row.appendChild(sys);
  }else if(m.kind==='wink'){
    const wink=window.MessengerWinks?.item?.(m.body),sys=document.createElement('div');sys.className='msn-wink-history-2005';sys.innerHTML='<b>😉 Guiño:</b> '+(wink?.name||'Guiño animado');row.appendChild(sys);
  }else{
    const meta=document.createElement('div');meta.className='message-meta';meta.textContent=`${nameOf(m.sender_id)} ... dice:`;
    const bubble=document.createElement('div');bubble.className='message-bubble';bubble.textContent=m.body||'';applyFormat(bubble,m.format);row.append(meta,bubble);
  }
  const time=document.createElement('div');time.className='message-time';try{time.textContent=new Date(m.created_at).toLocaleString()}catch{}row.appendChild(time);
  pane.appendChild(row);pane.scrollTop=pane.scrollHeight;
}
async function loadMessages(){
  if(!activeRoom)return;
  const id=activeRoom;seen.clear();const pane=$('#messagePane');if(!pane)return;pane.querySelectorAll('[data-room-message-id],.room-inline-separator').forEach(x=>x.remove());
  const {data,error}=await client.from('group_messages').select('*').eq('conversation_id',id).order('created_at',{ascending:true}).limit(500);
  if(activeRoom!==id)return;
  if(error){toast(error.message);return}
  for(const m of data||[])appendMessage(m);roomBaselineLoaded=true;
}
async function sendText(ev){
  ev?.preventDefault?.();if(!activeRoom)return;
  const input=$('#messageInput'),body=input?.value.trim();if(!body)return;
  const {data,error}=await client.from('group_messages').insert({conversation_id:activeRoom,sender_id:user.id,kind:'text',body,format:messageFormat()}).select().single();
  if(error)return toast(error.message);input.value='';appendMessage(data);
}
async function sendSpecial(kind,body){
  if(!activeRoom)return null;
  const {data,error}=await client.from('group_messages').insert({conversation_id:activeRoom,sender_id:user.id,kind,body}).select().single();
  if(error){toast(error.message);return null}appendMessage(data);
  if(kind==='nudge'){const w=$('#chatWindow');w?.classList.remove('nudging');void w?.offsetWidth;w?.classList.add('nudging');window.MessengerSounds?.playNudge?.()}
  return data;
}
function unsubscribeRoom(){
  if(roomChannel&&client)client.removeChannel?.(roomChannel);roomChannel=null;
  clearInterval(membershipTimer);membershipTimer=null;
  clearTimeout(roomReconnectTimer);roomReconnectTimer=null;roomRealtimeReady=false;roomBaselineLoaded=false;
}
function scheduleRoomReconnect(id){
  clearTimeout(roomReconnectTimer);roomReconnectTimer=setTimeout(()=>{if(activeRoom!==id||roomRealtimeReady)return;subscribeRoom();loadMessages()},1600);
}
function subscribeRoom(){
  unsubscribeRoom();if(!activeRoom)return;
  const id=activeRoom;
  const next=client.channel(`conversation-room-${id}-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:`conversation_id=eq.${id}`},p=>{
      if(activeRoom!==id)return;appendMessage(p.new);
      if(p.new?.sender_id!==user.id){
        if(p.new?.kind==='wink')window.MessengerWinks?.play?.(p.new.body,{messageId:'group:'+p.new.id});
        else if(p.new?.kind==='nudge'){const w=$('#chatWindow');w?.classList.remove('nudging');void w?.offsetWidth;w?.classList.add('nudging');window.MessengerSounds?.playNudge?.()}
        else window.MessengerSounds?.playMessage?.();
      }
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'group_conversation_members',filter:`conversation_id=eq.${id}`},()=>{if(activeRoom===id)loadRoomMeta().then(()=>{if(!ensureParticipantsDialog().hidden)renderParticipants()})})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},p=>{if(activeRoom!==id||!p.new||!members.some(m=>m.user_id===p.new.id))return;profiles.set(p.new.id,p.new);paintRoomHeader();if(!ensureParticipantsDialog().hidden)renderParticipants()});
  roomChannel=next;next.subscribe(status=>{
    if(roomChannel!==next||activeRoom!==id)return;
    if(status==='SUBSCRIBED'){const reconcile=roomBaselineLoaded;roomRealtimeReady=true;clearTimeout(roomReconnectTimer);roomReconnectTimer=null;if(reconcile)loadMessages()}
    else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){roomRealtimeReady=false;scheduleRoomReconnect(id)}
  });
  membershipTimer=setInterval(async()=>{
    if(!activeRoom||document.hidden||roomRealtimeReady)return;
    const current=activeRoom,{data}=await client.rpc('is_group_member',{p_conversation_id:current,p_user_id:user.id});
    if(activeRoom!==current)return;if(data===false)handleRemoved();else await loadMessages();
  },60000);
}
function resetInlineRoomUi(){
  $('#chatWindow')?.classList.remove('room-inline-active');
  const pbtn=$('#conversationRoomParticipants');if(pbtn)pbtn.hidden=true;
  const note=$('#conversationRoomAdminNote');if(note)note.textContent='';
  const invite=$('#inviteBtn');if(invite){invite.disabled=false;invite.title='Invitar a esta conversación'}
  for(const id of ['sendFilesBtn','videoBtn','voiceBtn'])$('#'+id)?.classList.remove('room-inline-disabled');
  $('#messagePane')?.querySelectorAll('[data-room-message-id],.room-inline-separator').forEach(x=>x.remove());
}
function handleRemoved(){
  const wasOpen=!!activeRoom;closeRoom();if(lastPeer)window.MessengerChat?.openContact?.(lastPeer);if(wasOpen)toast('Ya no formas parte de esta conversación.');
}
async function openRoom(id,{preserveDirect=true}={}){
  if(!id||!client||!user)return;
  const seq=++openSeq;activeRoom=id;const direct=ensureRoomWindow();if(direct){direct.style.display='';direct.hidden=false;direct.classList.remove('window-minimized')}
  const ok=await loadRoomMeta();if(seq!==openSeq||!ok)return;
  if(!preserveDirect)$('#messagePane')?.replaceChildren();
  subscribeRoom();await loadMessages();if(seq!==openSeq)return;
  const input=$('#messageInput'),fmt=window.MessengerChatFormat?.value;
  if(input&&fmt){input.style.fontFamily=fmt.family||'Tahoma';input.style.fontSize=(fmt.size||11)+'px';input.style.color=fmt.color||'#000';input.style.fontWeight=fmt.bold?'bold':'normal';input.style.fontStyle=fmt.italic?'italic':'normal';input.style.textDecoration=fmt.underline?'underline':'none'}
  input?.focus();
}
function closeRoom(){
  ++openSeq;unsubscribeRoom();activeRoom=null;roomInfo=null;members=[];profiles.clear();seen.clear();
  ensureInviteDialog().hidden=true;ensureParticipantsDialog().hidden=true;resetInlineRoomUi();
}


function wireInviteButton(){
  const b=$('#inviteBtn');if(!b||b.dataset.conversationRoomInvite==='1')return;
  b.dataset.conversationRoomInvite='1';b.title='Invitar a esta conversación';
  b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openInviteDialog()},true);
}
async function onDirectConversation(peer){
  lastPeer=peer&&!peer.is_self?{...peer}:null;closeRoom();
  if(!lastPeer||!user||!client)return;
  const seq=++openSeq;
  setTimeout(async()=>{
    if(seq!==openSeq||!lastPeer)return;
    const id=await findExistingRoom(lastPeer.id);if(seq!==openSeq||!id)return;
    await window.MessengerChat?.reload?.();if(seq!==openSeq)return;
    await openRoom(id,{preserveDirect:true});
  },260);
}

function subscribeMemberships(){
  if(membershipChannel&&client)client.removeChannel?.(membershipChannel);
  membershipChannel=client.channel(`conversation-membership-${user.id}-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_conversation_members',filter:`user_id=eq.${user.id}`},p=>{
      const id=p.new?.conversation_id;if(!id||id===activeRoom)return;
      toast('Te invitaron a una conversación.');
      openRoom(id,{preserveDirect:false});
    }).subscribe();
}
function removeLegacyGroupUi(){
  for(const sel of ['#directGroupsBtn','.direct-groups-button','#groupsToolbarButton','.groups-toolbar-button','#groupListDialog','#groupNameDialog','#groupInviteDialog','#groupChatWindow'])document.querySelectorAll(sel).forEach(el=>el.remove());
}
function cleanup(){
  unsubscribeRoom();if(membershipChannel&&client)client.removeChannel?.(membershipChannel);membershipChannel=null;
  activeRoom=null;roomInfo=null;members=[];profiles.clear();seen.clear();user=null;client=null;lastPeer=null;
  resetInlineRoomUi();
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
window.MessengerConversationRoom={openRoom,invite:openInviteDialog,participants:openParticipantsDialog,sendSpecial,close:closeRoom,get id(){return activeRoom},get active(){return !!activeRoom},get admin(){return roomInfo?.created_by||null}};
})();
