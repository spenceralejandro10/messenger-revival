(()=>{
const $=s=>document.querySelector(s);
let client=null,user=null,activeGroup=null,activeGroupInfo=null,groupChannel=null,membershipChannel=null;
let profiles=new Map(),seen=new Set(),followLatest=true,lastDirectPeer=null;
let membershipTimer=null,messageTimer=null,pollingMemberships=false,pollingMessages=false;
let knownMemberships=new Set(),knownMessageIds=new Set(),bootstrappedGroups=false,bootstrappedMessages=false;
let groupSummaries=[],listFilterPeerId=null;

function toast(t){
  const e=$('#toast');if(!e)return;
  e.textContent=t;e.classList.add('show');
  clearTimeout(window.__groupToast);
  window.__groupToast=setTimeout(()=>e.classList.remove('show'),3000);
}
function style(){
  if($('#groupChat2005Style'))return;
  const s=document.createElement('style');s.id='groupChat2005Style';
  s.textContent=`
  .group-invite-dialog,.group-list-dialog,.group-name-dialog{position:fixed;z-index:14000;width:410px;left:50%;top:50%;transform:translate(-50%,-50%);background:#eef7fc;border:1px solid #557f9f;box-shadow:3px 4px 12px #0005;font:11px Tahoma}
  .group-invite-title,.group-list-title,.group-name-title{padding:6px 8px;background:linear-gradient(#4e9bdd,#1d6cb7);color:#fff;font-weight:bold}
  .group-invite-body,.group-list-body,.group-name-body{padding:10px}
  .group-name-row{margin:8px 0;padding:7px;background:#f7fbfe;border:1px solid #bfd1df}
  .group-name-row label{display:block;margin-bottom:4px;color:#244c6b;font-weight:bold}
  .group-name-row input,.group-name-body input{width:100%;height:24px;border:1px solid #7f9db9;padding:3px 5px;font:11px Tahoma}
  .group-candidate-list,.group-list-items{max-height:290px;overflow:auto;background:#fff;border:1px solid #a7c1d2;margin:7px 0}
  .group-candidate,.group-list-item{display:flex;align-items:center;gap:8px;padding:7px;border-bottom:1px solid #e0edf4}
  .group-candidate img,.group-candidate .group-placeholder{width:38px;height:38px;object-fit:contain;background:#fff;border:1px solid #8aa8bb}
  .group-placeholder{display:grid;place-items:center}
  .group-candidate-copy,.group-list-copy{flex:1;min-width:0}
  .group-candidate-copy b,.group-candidate-copy small,.group-list-copy b,.group-list-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .group-candidate button,.group-invite-actions button,.group-list-actions button,.group-list-item button,.group-name-actions button{font:11px Tahoma;height:24px}
  .group-invite-actions,.group-list-actions,.group-name-actions{text-align:right}
  .group-name-actions{margin-top:10px}
  .group-list-item{cursor:pointer}.group-list-item:hover{background:#e8f3fb}
  .group-list-icon{width:34px;height:34px;display:grid;place-items:center;border:1px solid #91aabd;background:linear-gradient(#fff,#dcecf7);font-size:18px}
  .groups-toolbar-button{position:relative}.groups-toolbar-button .requests-badge{margin-left:3px}
  .group-chat-window{z-index:900;width:800px;height:610px;display:flex;flex-direction:column}
  .group-chat-window>.titlebar,.group-chat-window>.menubar,.group-chat-window>.actionbar,.group-chat-window>.promo-bar{flex:0 0 auto}
  .group-chat-window>.conversation-shell{flex:1 1 auto!important;height:auto!important;min-height:0!important;overflow:hidden;padding:10px 12px 7px}
  .group-chat-window .conversation-main{width:100%;display:flex;flex-direction:column;min-height:0}
  .group-chat-window .to-line{flex:0 0 34px}
  .group-chat-window .group-message-pane{flex:1 1 auto!important;height:auto!important;min-height:120px!important;overflow:auto;overflow-anchor:none}
  .group-chat-window .compose-toolbar{flex:0 0 38px;margin-top:8px}
  .group-chat-window .group-compose{flex:0 0 100px!important;height:100px!important;min-height:100px!important}
  .group-chat-window .group-members-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .group-chat-window .group-empty{padding:20px;text-align:center;color:#70808d}
  .group-chat-window .group-system{font-style:italic;color:#5d7180;margin:4px 0}
  .group-chat-window .actionbar button[disabled]{opacity:.45}
  .group-chat-window .group-member-count{position:absolute;right:18px;bottom:7px;z-index:3;color:#4b6d82;font:bold 11px Tahoma}
  .group-chat-window .message-time{font-size:10px;color:#7b8790;margin:2px 0 7px 10px}
  .group-chat-window .group-back-button img,.group-chat-window .group-rename-button img,.direct-groups-button img{width:42px!important;height:42px!important}
  .direct-groups-button{width:68px!important}
  @media(max-height:700px){
    .group-chat-window{height:min(610px,calc(100vh - 20px));top:10px!important}
    .group-chat-window .group-compose{flex-basis:86px!important;height:86px!important;min-height:86px!important}
  }`;
  document.head.appendChild(s);
}
function inviteDialog(){
  let d=$('#groupInviteDialog');if(d)return d;
  d=document.createElement('div');d.id='groupInviteDialog';d.className='group-invite-dialog';d.hidden=true;
  d.innerHTML='<div class="group-invite-title">Invitar a esta conversación</div><div class="group-invite-body"><div id="groupInviteHint">Solo aparecen contactos de alguno de los participantes.</div><div id="groupNameRow" class="group-name-row"><label for="groupNewName">Nombre del grupo:</label><input id="groupNewName" maxlength="60" placeholder="Ej. Los del 2005 😎"></div><div id="groupCandidateList" class="group-candidate-list"></div><div class="group-invite-actions"><button id="groupInviteClose" type="button">Cerrar</button></div></div>';
  document.body.appendChild(d);$('#groupInviteClose').onclick=()=>d.hidden=true;return d;
}
function listDialog(){
  let d=$('#groupListDialog');if(d)return d;
  d=document.createElement('div');d.id='groupListDialog';d.className='group-list-dialog';d.hidden=true;
  d.innerHTML='<div id="groupListTitle" class="group-list-title">Conversaciones de grupo</div><div class="group-list-body"><div id="groupListHint">Selecciona una conversación para abrirla.</div><div id="groupListItems" class="group-list-items"></div><div class="group-list-actions"><button id="groupListClose" type="button">Cerrar</button></div></div>';
  document.body.appendChild(d);$('#groupListClose').onclick=()=>d.hidden=true;return d;
}
function nameDialog(){
  let d=$('#groupNameDialog');if(d)return d;
  d=document.createElement('div');d.id='groupNameDialog';d.className='group-name-dialog';d.hidden=true;
  d.innerHTML='<div class="group-name-title">Cambiar nombre del grupo</div><div class="group-name-body"><label for="groupRenameInput">Nombre:</label><input id="groupRenameInput" maxlength="60"><div class="group-name-actions"><button id="groupRenameSave" type="button">Guardar</button> <button id="groupRenameCancel" type="button">Cancelar</button></div></div>';
  document.body.appendChild(d);
  $('#groupRenameCancel').onclick=()=>d.hidden=true;
  $('#groupRenameSave').onclick=renameActiveGroup;
  return d;
}
function groupWindow(){
  let w=$('#groupChatWindow');if(w)return w;
  w=document.createElement('section');w.id='groupChatWindow';w.className='msn-window chat-window group-chat-window';w.style.display='none';
  w.innerHTML='<header class="titlebar"><img class="msn-titlebar-icon" src="assets/community-avatars/invite(1).png" alt=""><b><span id="groupChatTitle">Conversación de grupo</span> - Conversation</b><div class="caption-buttons"><button type="button" disabled>_</button><button type="button" disabled>□</button><button id="groupChatClose" type="button">×</button></div></header><nav class="menubar">File Edit Actions Tools Help</nav><div class="actionbar retro-actionbar"><button id="groupBackBtn" class="group-back-button" type="button"><img src="assets/community-avatars/send-files.png?v=3" alt=""><small>Volver</small></button><button id="groupInviteBtn" type="button"><img src="assets/community-avatars/invite.png?v=3" alt=""><small>Invite</small></button><button id="groupRenameBtn" class="group-rename-button" type="button"><img src="assets/status-icons/05-editar-contacto-lapiz.png" alt=""><small>Nombre</small></button><div class="msn-wordmark" role="img" aria-label="msn"></div><span id="groupMemberCount" class="group-member-count"></span></div><div class="conversation-shell"><div class="conversation-main"><div class="to-line group-members-line">To: <b id="groupMembersLine"></b></div><div id="groupMessagePane" class="message-pane group-message-pane"></div><div class="compose-toolbar"><button id="groupEmojiSmile" type="button">☺</button><button id="groupEmojiWink" type="button">😉</button><button id="groupNudge" type="button" class="nudge-visible"><span>((⚡))</span><b>Zumbido</b></button></div><form id="groupMessageForm" class="composer group-compose"><textarea id="groupMessageInput"></textarea><div class="send-stack"><button class="send-btn">Send</button></div></form></div></div><footer class="promo-bar">Messenger Revival — conversación de grupo <span class="resize-grip">⋰</span></footer>';
  document.querySelector('.stage')?.appendChild(w);
  $('#groupChatClose').onclick=closeGroup;$('#groupBackBtn').onclick=backToDirect;$('#groupInviteBtn').onclick=openInviteDialog;$('#groupRenameBtn').onclick=openRenameDialog;$('#groupMessageForm').onsubmit=sendText;
  $('#groupEmojiSmile').onclick=()=>sendSpecial('emoji','😀');$('#groupEmojiWink').onclick=()=>sendSpecial('emoji','😉');$('#groupNudge').onclick=()=>sendSpecial('nudge','');
  $('#groupMessagePane').addEventListener('scroll',()=>{const p=$('#groupMessagePane'),gap=p.scrollHeight-p.clientHeight-p.scrollTop;followLatest=gap<=24},{passive:true});
  return w;
}
function profileName(id){const p=profiles.get(id);return p?.display_name||p?.email||'Contacto'}
function applyFormat(node,format){if(!format||typeof format!=='object')return;for(const k of ['fontFamily','fontSize','color','fontWeight','fontStyle','textDecoration'])if(format[k])node.style[k]=format[k]}
function scrollLatest(force=false){const p=$('#groupMessagePane');if(!p)return;if(force)followLatest=true;if(!followLatest)return;requestAnimationFrame(()=>{p.scrollTop=p.scrollHeight;requestAnimationFrame(()=>p.scrollTop=p.scrollHeight)})}
function groupLabel(g){
  const title=String(g?.group?.title||'').trim();
  if(title)return title;
  const others=(g?.members||[]).filter(m=>m.id!==user?.id).map(m=>m.name);
  return others.length?others.join(', '):'Conversación de grupo';
}
function appendMessage(m){
  if(!m?.id||seen.has(m.id))return;seen.add(m.id);
  const pane=$('#groupMessagePane');if(!pane)return;pane.querySelector('.group-empty')?.remove();
  const row=document.createElement('div');row.className='message'+(m.sender_id===user?.id?' mine':'');
  if(m.kind==='nudge'){const sys=document.createElement('div');sys.className='group-system';sys.textContent=`${profileName(m.sender_id)} envió un zumbido.`;row.appendChild(sys)}
  else{const meta=document.createElement('div');meta.className='message-meta';meta.textContent=`${profileName(m.sender_id)} ... dice:`;const bubble=document.createElement('div');bubble.className='message-bubble';bubble.textContent=m.body||'';applyFormat(bubble,m.format);row.append(meta,bubble)}
  const time=document.createElement('div');time.className='message-time';try{time.textContent=new Date(m.created_at).toLocaleString()}catch{}row.appendChild(time);pane.appendChild(row);scrollLatest();
}
async function loadMembers(){
  if(!activeGroup)return;
  const [{data,error},{data:groupData}]=await Promise.all([
    client.from('group_conversation_members').select('user_id,joined_at').eq('conversation_id',activeGroup).order('joined_at',{ascending:true}),
    client.from('group_conversations').select('id,title,created_by,created_at,member_signature').eq('id',activeGroup).maybeSingle()
  ]);
  if(error)return toast(error.message);
  activeGroupInfo=groupData||{id:activeGroup,title:'',created_by:null};
  const ids=(data||[]).map(x=>x.user_id);profiles.clear();
  if(ids.length){const {data:ps}=await client.from('profiles').select('id,email,display_name,personal_message,display_picture,status').in('id',ids);(ps||[]).forEach(p=>profiles.set(p.id,p))}
  const names=ids.map(profileName),title=String(activeGroupInfo?.title||'').trim();
  $('#groupMembersLine').textContent=names.join(', ');
  $('#groupMemberCount').textContent=`${ids.length} participantes`;
  $('#groupChatTitle').textContent=title||`Conversación de grupo (${ids.length})`;
  $('#groupRenameBtn').style.display=activeGroupInfo?.created_by===user?.id?'':'none';
  const direct=lastDirectPeer||window.MessengerChat?.getActivePeer?.();
  $('#groupBackBtn small').textContent=direct?.display_name?'Volver':'Cerrar grupo';
  $('#groupBackBtn').title=direct?.display_name?`Volver al chat con ${direct.display_name}`:'Cerrar conversación de grupo';
}
async function loadMessages(){
  if(!activeGroup)return;seen.clear();const pane=$('#groupMessagePane');pane.innerHTML='';
  const {data,error}=await client.from('group_messages').select('*').eq('conversation_id',activeGroup).order('created_at',{ascending:true}).limit(500);
  if(error)return toast(error.message);
  if(!data?.length)pane.innerHTML='<div class="group-empty">La conversación acaba de comenzar.</div>';
  (data||[]).forEach(appendMessage);scrollLatest(true);
}
async function ensureRealtimeAuth(){
  try{const {data}=await client?.auth?.getSession?.();const token=data?.session?.access_token;if(token&&client?.realtime?.setAuth)await client.realtime.setAuth(token)}catch{}
}
function subscribeGroup(){
  if(groupChannel&&client)client.removeChannel?.(groupChannel);if(!activeGroup)return;
  const id=activeGroup;
  groupChannel=client.channel(`group-chat-${id}-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:`conversation_id=eq.${id}`},p=>{if(activeGroup!==id)return;appendMessage(p.new);knownMessageIds.add(p.new.id);if(p.new?.sender_id!==user.id)window.MessengerSounds?.playMessage?.()})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_conversation_members',filter:`conversation_id=eq.${id}`},async()=>{if(activeGroup!==id)return;await loadMembers();await refreshGroupSummaries();toast('Un contacto se unió a la conversación')})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},p=>{if(!p.new||!profiles.has(p.new.id))return;profiles.set(p.new.id,p.new);loadMembers()})
    .subscribe();
}
async function openGroup(id){
  if(!id||!client||!user)return;
  const direct=window.MessengerChat?.getActivePeer?.();if(direct&&!direct.is_self)lastDirectPeer={...direct};
  activeGroup=id;followLatest=true;groupWindow().style.display='';
  const directWindow=$('#chatWindow');if(directWindow)directWindow.style.display='none';
  listDialog().hidden=true;inviteDialog().hidden=true;nameDialog().hidden=true;
  await loadMembers();await loadMessages();subscribeGroup();$('#groupMessageInput')?.focus();
  updateGroupButton();updateDirectGroupsButton();
}
function closeGroup(){
  if(groupChannel&&client)client.removeChannel?.(groupChannel);groupChannel=null;activeGroup=null;activeGroupInfo=null;
  groupWindow().style.display='none';
  const direct=window.MessengerChat?.getActivePeer?.();
  if(direct)$('#chatWindow').style.display='';
}
function backToDirect(){closeGroup();$('#messageInput')?.focus()}
async function sendText(ev){
  ev?.preventDefault?.();if(!activeGroup)return;
  const input=$('#groupMessageInput'),text=input.value.trim();if(!text)return;
  const cs=getComputedStyle(input),format={fontFamily:input.style.fontFamily||cs.fontFamily,fontSize:input.style.fontSize||cs.fontSize,color:input.style.color||cs.color,fontWeight:input.style.fontWeight||cs.fontWeight,fontStyle:input.style.fontStyle||cs.fontStyle,textDecoration:input.style.textDecoration||cs.textDecorationLine};
  const {data,error}=await client.from('group_messages').insert({conversation_id:activeGroup,sender_id:user.id,kind:'text',body:text,format}).select().single();
  if(error)return toast(error.message);input.value='';appendMessage(data);knownMessageIds.add(data.id);scrollLatest(true);refreshGroupSummaries();
}
async function sendSpecial(kind,body){
  if(!activeGroup)return;
  const {data,error}=await client.from('group_messages').insert({conversation_id:activeGroup,sender_id:user.id,kind,body}).select().single();
  if(error)return toast(error.message);appendMessage(data);knownMessageIds.add(data.id);scrollLatest(true);refreshGroupSummaries();
  if(kind==='nudge'){window.MessengerSounds?.playNudge?.();groupWindow().classList.remove('nudging');void groupWindow().offsetWidth;groupWindow().classList.add('nudging')}
}
function candidateRow(p){
  const r=document.createElement('div');r.className='group-candidate';
  if(p.display_picture){const img=document.createElement('img');img.src=p.display_picture;img.alt='';r.appendChild(img)}
  else{const ph=document.createElement('span');ph.className='group-placeholder';ph.textContent='☺';r.appendChild(ph)}
  const copy=document.createElement('div');copy.className='group-candidate-copy';const b=document.createElement('b');b.textContent=p.display_name||p.email;const sm=document.createElement('small');sm.textContent=p.personal_message||p.email||'';copy.append(b,sm);
  const btn=document.createElement('button');btn.type='button';btn.textContent='Invitar';btn.onclick=()=>invitePerson(p,btn);r.append(copy,btn);return r;
}
async function openInviteDialog(){
  if(!client||!user)return toast('Inicia sesión primero.');
  const d=inviteDialog(),box=$('#groupCandidateList'),nameRow=$('#groupNameRow');box.textContent='Buscando contactos...';d.hidden=false;
  let data,error;
  if(activeGroup){
    nameRow.hidden=true;
    $('#groupInviteHint').textContent='Agrega otro contacto. No se permite crear un grupo idéntico a otro existente.';
    ({data,error}=await client.rpc('get_group_invite_candidates',{p_conversation_id:activeGroup}));
  }else{
    nameRow.hidden=false;$('#groupNewName').value='';
    $('#groupInviteHint').textContent='Elige a quién agregar. Puedes ponerle un nombre al grupo.';
    const peer=window.MessengerChat?.getActivePeer?.();
    if(!peer||peer.id===user.id){box.textContent='Abre una conversación con un contacto antes de invitar.';return}
    ({data,error}=await client.rpc('get_direct_invite_candidates',{p_peer_id:peer.id}));
  }
  if(error){box.textContent=error.message;return}
  box.innerHTML='';if(!data?.length){box.innerHTML='<div class="group-empty">No hay contactos disponibles para invitar.</div>';return}
  (data||[]).forEach(p=>box.appendChild(candidateRow(p)));
}
async function invitePerson(p,btn){
  btn.disabled=true;btn.textContent='Invitando...';
  if(activeGroup){
    const {error}=await client.rpc('add_member_to_group',{p_conversation_id:activeGroup,p_invitee_id:p.id});
    if(error){btn.disabled=false;btn.textContent='Invitar';return toast(error.message)}
    btn.textContent='Invitado';toast(`${p.display_name||p.email} fue agregado a la conversación`);await loadMembers();await refreshGroupSummaries();return;
  }
  const peer=window.MessengerChat?.getActivePeer?.();if(!peer){btn.disabled=false;btn.textContent='Invitar';return}
  const title=$('#groupNewName')?.value?.trim()||'';
  const {data,error}=await client.rpc('create_group_from_direct',{p_peer_id:peer.id,p_invitee_id:p.id,p_title:title});
  if(error){btn.disabled=false;btn.textContent='Invitar';return toast(error.message)}
  const result=Array.isArray(data)?data[0]:data,id=result?.conversation_id,created=result?.created;
  if(!id){btn.disabled=false;btn.textContent='Invitar';return toast('No fue posible abrir la conversación de grupo.')}
  inviteDialog().hidden=true;
  await refreshGroupSummaries();
  toast(created?`${p.display_name||p.email} fue invitado al grupo`:'Ya existía un grupo con exactamente estas personas. Abrí el existente.');
  await openGroup(id);
}
async function fetchGroupSummaries(){
  if(!client||!user)return[];
  const {data:memberships,error}=await client.from('group_conversation_members').select('conversation_id,joined_at,invited_by').eq('user_id',user.id).order('joined_at',{ascending:false});
  if(error)return[];
  const ids=[...new Set((memberships||[]).map(x=>x.conversation_id))];if(!ids.length)return[];
  const [{data:groups},{data:allMembers},{data:messages}]=await Promise.all([
    client.from('group_conversations').select('id,title,created_at,created_by,member_signature').in('id',ids),
    client.from('group_conversation_members').select('conversation_id,user_id,joined_at').in('conversation_id',ids),
    client.from('group_messages').select('id,conversation_id,sender_id,kind,body,created_at').in('conversation_id',ids).order('created_at',{ascending:false}).limit(300)
  ]);
  const userIds=[...new Set((allMembers||[]).map(x=>x.user_id))],names=new Map();
  if(userIds.length){const {data:ps}=await client.from('profiles').select('id,email,display_name').in('id',userIds);(ps||[]).forEach(p=>names.set(p.id,p.display_name||p.email||'Contacto'))}
  const groupMap=new Map((groups||[]).map(g=>[g.id,g]));
  const summaries=ids.map(id=>{
    const mem=(allMembers||[]).filter(m=>m.conversation_id===id);
    const last=(messages||[]).find(m=>m.conversation_id===id)||null;
    const members=mem.map(m=>({id:m.user_id,name:names.get(m.user_id)||'Contacto'}));
    return {id,group:groupMap.get(id)||{id,title:''},members,last,joined_at:(memberships||[]).find(m=>m.conversation_id===id)?.joined_at||null,signature:members.map(m=>m.id).sort().join('|')};
  });
  const unique=new Map();
  summaries.forEach(g=>{if(!unique.has(g.signature))unique.set(g.signature,g)});
  return [...unique.values()].sort((a,b)=>new Date(b.last?.created_at||b.group?.created_at||0)-new Date(a.last?.created_at||a.group?.created_at||0));
}
async function refreshGroupSummaries(){
  groupSummaries=await fetchGroupSummaries();paintGroupList();updateGroupButton();updateDirectGroupsButton();
}
function visibleGroups(){
  if(!listFilterPeerId)return groupSummaries;
  return groupSummaries.filter(g=>g.members.some(m=>m.id===listFilterPeerId));
}
function paintGroupList(){
  const box=$('#groupListItems');if(!box)return;box.innerHTML='';
  const list=visibleGroups();
  if(!list.length){box.innerHTML='<div class="group-empty">No hay conversaciones de grupo para mostrar.</div>';return}
  list.forEach(g=>{
    const row=document.createElement('div');row.className='group-list-item';
    const icon=document.createElement('div');icon.className='group-list-icon';icon.textContent='👥';
    const copy=document.createElement('div');copy.className='group-list-copy';
    const b=document.createElement('b');b.textContent=groupLabel(g);
    const members=document.createElement('small');members.textContent=g.members.map(m=>m.name).join(', ');
    const last=document.createElement('small');last.textContent=g.last?(g.last.kind==='nudge'?'Último: zumbido':`Último: ${g.last.body||'mensaje'}`):'Sin mensajes todavía';
    const btn=document.createElement('button');btn.type='button';btn.textContent='Abrir';btn.onclick=ev=>{ev.stopPropagation();openGroup(g.id)};
    copy.append(b,members,last);row.append(icon,copy,btn);row.onclick=()=>openGroup(g.id);box.appendChild(row);
  });
}
async function openGroupList(peer=null){
  groupSummaries=await fetchGroupSummaries();listFilterPeerId=peer?.id||null;
  $('#groupListTitle').textContent=peer?`Grupos con ${peer.display_name||peer.email||'este contacto'}`:'Conversaciones de grupo';
  $('#groupListHint').textContent=peer?'Estos son los grupos que ambos tienen en común.':'Selecciona una conversación para abrirla.';
  paintGroupList();listDialog().hidden=false;updateGroupButton();updateDirectGroupsButton();
}
function ensureGroupButton(){
  let b=$('#groupsToolbarButton');if(b)return b;
  b=document.createElement('button');b.id='groupsToolbarButton';b.type='button';b.className='groups-toolbar-button';b.title='Conversaciones de grupo';b.innerHTML='Grupos <span class="requests-badge" style="display:none">0</span>';
  const host=$('#accountActions')||$('.contact-tools');host?.appendChild(b);
  b.onclick=()=>openGroupList();
  return b;
}
function updateGroupButton(){
  const b=ensureGroupButton(),badge=b?.querySelector('.requests-badge');if(!badge)return;
  badge.textContent=String(groupSummaries.length);badge.style.display=groupSummaries.length?'inline-block':'none';
}
function ensureDirectGroupsButton(){
  let b=$('#directGroupsBtn');if(b)return b;
  b=document.createElement('button');b.id='directGroupsBtn';b.type='button';b.className='direct-groups-button';b.title='Grupos en común con este contacto';
  b.innerHTML='<img src="assets/community-avatars/invite.png?v=3" alt=""><small>Grupos</small><span class="requests-badge" style="display:none">0</span>';
  const invite=$('#inviteBtn');invite?.insertAdjacentElement('afterend',b);
  b.onclick=()=>{const peer=window.MessengerChat?.getActivePeer?.();if(peer)openGroupList(peer)};
  return b;
}
function updateDirectGroupsButton(){
  const b=ensureDirectGroupsButton(),peer=window.MessengerChat?.getActivePeer?.(),badge=b?.querySelector('.requests-badge');
  if(!b||!badge)return;
  const count=peer?groupSummaries.filter(g=>g.members.some(m=>m.id===peer.id)).length:0;
  badge.textContent=String(count);badge.style.display=count?'inline-block':'none';b.disabled=!peer||peer.is_self;b.title=peer?`Grupos en común con ${peer.display_name||peer.email||'este contacto'}`:'Abre una conversación';
}
function openRenameDialog(){
  if(!activeGroup||activeGroupInfo?.created_by!==user?.id)return toast('Solo quien creó el grupo puede cambiar el nombre.');
  nameDialog().hidden=false;$('#groupRenameInput').value=activeGroupInfo?.title||'';$('#groupRenameInput').focus();$('#groupRenameInput').select();
}
async function renameActiveGroup(){
  if(!activeGroup)return;
  const title=$('#groupRenameInput').value.trim();
  const {error}=await client.rpc('rename_group',{p_conversation_id:activeGroup,p_title:title});
  if(error)return toast(error.message);
  nameDialog().hidden=true;toast('Nombre del grupo actualizado.');await loadMembers();await refreshGroupSummaries();
}
async function pollMemberships(){
  if(!client||!user||pollingMemberships)return;pollingMemberships=true;
  try{
    const {data,error}=await client.from('group_conversation_members').select('conversation_id,joined_at,invited_by').eq('user_id',user.id).order('joined_at',{ascending:false});
    if(error)throw error;
    const rows=data||[],current=new Set(rows.map(r=>r.conversation_id));
    if(!bootstrappedGroups){knownMemberships=current;bootstrappedGroups=true}
    else{
      for(const row of rows){
        if(knownMemberships.has(row.conversation_id))continue;
        knownMemberships.add(row.conversation_id);
        await refreshGroupSummaries();
        const g=groupSummaries.find(x=>x.id===row.conversation_id),label=groupLabel(g);
        toast(`Te agregaron al grupo "${label}". Ábrelo desde Grupos.`);
        window.MessengerSounds?.playMessage?.();
        if('Notification'in window&&Notification.permission==='granted')new Notification('Messenger Revival',{body:`Te agregaron al grupo "${label}".`});
      }
      for(const id of [...knownMemberships])if(!current.has(id))knownMemberships.delete(id);
    }
    await refreshGroupSummaries();
  }catch(e){console.warn('Group membership polling failed',e)}finally{pollingMemberships=false}
}
async function pollGroupMessages(){
  if(!client||!user||pollingMessages)return;pollingMessages=true;
  try{
    const {data,error}=await client.from('group_messages').select('id,conversation_id,sender_id,kind,body,format,created_at').order('created_at',{ascending:false}).limit(150);
    if(error)throw error;
    const rows=(data||[]).slice().reverse();
    if(!bootstrappedMessages){rows.forEach(m=>knownMessageIds.add(m.id));bootstrappedMessages=true;return}
    for(const m of rows){
      if(knownMessageIds.has(m.id))continue;knownMessageIds.add(m.id);
      if(m.conversation_id===activeGroup){appendMessage(m);if(m.sender_id!==user.id)window.MessengerSounds?.playMessage?.()}
      else if(m.sender_id!==user.id){
        await refreshGroupSummaries();
        const g=groupSummaries.find(x=>x.id===m.conversation_id),label=groupLabel(g);
        toast(`Nuevo mensaje en "${label}".`);
        window.MessengerSounds?.playMessage?.();
        if('Notification'in window&&Notification.permission==='granted')new Notification('Messenger Revival',{body:`Nuevo mensaje en "${label}".`});
        document.title=`● ${label} — Messenger Revival`;
      }
    }
    if(rows.length)await refreshGroupSummaries();
  }catch(e){console.warn('Group message polling failed',e)}finally{pollingMessages=false}
}
function startPolling(){
  clearInterval(membershipTimer);clearInterval(messageTimer);
  membershipTimer=setInterval(pollMemberships,1000);messageTimer=setInterval(pollGroupMessages,900);
  pollMemberships();pollGroupMessages();
}
function stopPolling(){clearInterval(membershipTimer);clearInterval(messageTimer);membershipTimer=messageTimer=null;pollingMemberships=pollingMessages=false}
function subscribeMembership(){
  if(membershipChannel&&client)client.removeChannel?.(membershipChannel);
  membershipChannel=client.channel(`group-membership-${user.id}-${crypto.randomUUID()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_conversation_members',filter:`user_id=eq.${user.id}`},async p=>{
      const id=p.new?.conversation_id;if(!id)return;knownMemberships.add(id);await refreshGroupSummaries();
      const g=groupSummaries.find(x=>x.id===id),label=groupLabel(g);
      toast(`Te agregaron al grupo "${label}". Ábrelo desde Grupos.`);
      window.MessengerSounds?.playMessage?.();
    }).subscribe();
}
function installDirectInvite(){
  const b=$('#inviteBtn');if(!b||b.dataset.groupInvite==='1')return;
  b.dataset.groupInvite='1';b.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();openInviteDialog()},true);
}
async function init(ev){
  user=ev?.detail?.user||window.MessengerSession?.user;client=window.MessengerSession?.client;if(!user||!client)return;
  style();inviteDialog();listDialog();nameDialog();groupWindow();ensureGroupButton();ensureDirectGroupsButton();installDirectInvite();
  knownMemberships.clear();knownMessageIds.clear();bootstrappedGroups=false;bootstrappedMessages=false;
  await ensureRealtimeAuth();await refreshGroupSummaries();subscribeMembership();startPolling();updateDirectGroupsButton();
}
function cleanup(){
  stopPolling();if(groupChannel&&client)client.removeChannel?.(groupChannel);if(membershipChannel&&client)client.removeChannel?.(membershipChannel);
  groupChannel=null;membershipChannel=null;activeGroup=null;activeGroupInfo=null;profiles.clear();seen.clear();knownMemberships.clear();knownMessageIds.clear();groupSummaries=[];bootstrappedGroups=false;bootstrappedMessages=false;client=null;user=null;
  const w=$('#groupChatWindow');if(w)w.style.display='none';for(const id of ['#groupListDialog','#groupInviteDialog','#groupNameDialog']){const d=$(id);if(d)d.hidden=true}updateGroupButton();updateDirectGroupsButton();
}
style();inviteDialog();listDialog();nameDialog();groupWindow();installDirectInvite();ensureDirectGroupsButton();
window.addEventListener('messenger-revival:auth-ready',init);
window.addEventListener('messenger-revival:auth-signed-out',cleanup);
window.addEventListener('messenger-revival:conversation-opened',ev=>{if(ev.detail?.peer&&!ev.detail.peer.is_self)lastDirectPeer={...ev.detail.peer};updateDirectGroupsButton()});
window.addEventListener('online',()=>{if(user){ensureRealtimeAuth().then(()=>{subscribeMembership();startPolling()})}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user){pollMemberships();pollGroupMessages()}});
if(window.MessengerSession?.user)init();
window.MessengerGroupChat={openGroup,openList:()=>openGroupList(),openCommonGroups:peer=>openGroupList(peer),poll:()=>Promise.all([pollMemberships(),pollGroupMessages()])};
})();