// MSN Messenger 7.x presence reconstruction using the uploaded status artwork.
// Historical selectable statuses: Online, Busy, Be Right Back, Away, On The Phone, Out To Lunch, Appear Offline.
const msnPresence={
 online:{label:'Disponible',icon:'01-disponible-online.png',connected:true},
 away:{label:'Ausente',icon:'02-ausente-away.png',connected:true},
 busy:{label:'Ocupado',icon:'03-ocupado-busy.png',connected:true},
 brb:{label:'Vuelvo enseguida',icon:'04-vuelvo-enseguida-be-right-back.png',connected:true},
 phone:{label:'Al teléfono',icon:'05-al-telefono-on-the-phone.png',connected:true},
 lunch:{label:'Salí a comer',icon:'06-sali-a-comer-out-to-lunch.png',connected:true},
 offlineGreen:{label:'Desconectado',icon:'07-desconectado-offline-verde.png',connected:false},
 blockedGreen:{label:'Bloqueado',icon:'08-bloqueado-blocked-verde.png',connected:false},
 offline:{label:'Desconectado',icon:'09-desconectado-offline-gris.png',connected:false},
 blocked:{label:'Bloqueado',icon:'10-bloqueado-blocked-rojo.png',connected:false},
 invisible:{label:'Aparecer desconectado',icon:'09-desconectado-offline-gris.png',connected:false}
};
const statusIconPath=s=>`assets/status-icons/${(msnPresence[s]||msnPresence.offline).icon}`;
const statusIcon=(s,extra='')=>`<img class="msn-status-icon ${extra}" src="${statusIconPath(s)}" alt="${(msnPresence[s]||msnPresence.offline).label}">`;

// Ten demo contacts: one per uploaded artwork so every state can be inspected in the UI.
contacts.splice(0,contacts.length,
 {id:'alex',name:'Alex',status:'online',mood:'Disponible'},
 {id:'luna',name:'Luna',status:'away',mood:'Ausente'},
 {id:'mia',name:'Mia',status:'busy',mood:'Ocupado'},
 {id:'owen',name:'Owen',status:'brb',mood:'Vuelvo enseguida...'},
 {id:'sofia',name:'Sofía',status:'phone',mood:'Al teléfono'},
 {id:'david',name:'David',status:'lunch',mood:'Salí a comer'},
 {id:'natalia',name:'Natalia',status:'offlineGreen',mood:'Desconectado'},
 {id:'mateo',name:'Mateo',status:'blockedGreen',mood:'Bloqueado'},
 {id:'camila',name:'Camila',status:'offline',mood:'Desconectado'},
 {id:'atlas',name:'AtlasBot',status:'blocked',mood:'Bloqueado'}
);
Object.assign(labels,{brb:'Vuelvo enseguida',phone:'Al teléfono',lunch:'Salí a comer',offline:'Desconectado',invisible:'Aparecer desconectado'});

function installHistoricalStatusMenu(){
 const old=e.status;if(!old)return;
 const button=document.createElement('button');button.type='button';button.id='statusMenuButton';button.className='msn-status-button';
 const menu=document.createElement('div');menu.id='statusMenu';menu.className='msn-status-menu';menu.hidden=true;
 const choices=[['online','Disponible'],['busy','Ocupado'],['brb','Vuelvo enseguida'],['away','Ausente'],['phone','Al teléfono'],['lunch','Salí a comer'],['invisible','Aparecer desconectado']];
 function paint(s){const p=msnPresence[s]||msnPresence.online;button.innerHTML=`${statusIcon(s)}<span>(${p.label})</span><b>⌄</b>`;if(e.selfDot)e.selfDot.style.display='none'}
 choices.forEach(([s,label])=>{const b=document.createElement('button');b.type='button';b.dataset.status=s;b.innerHTML=`${statusIcon(s)}<span>${label}</span>`;b.onclick=()=>{localStorage.setItem('messenger-revival:self-status',s);paint(s);menu.hidden=true;toast(`Estado: ${label}`)};menu.appendChild(b)});
 old.replaceWith(button);e.status=button;button.after(menu);button.onclick=ev=>{ev.stopPropagation();menu.hidden=!menu.hidden};document.addEventListener('click',()=>menu.hidden=true);menu.onclick=ev=>ev.stopPropagation();
 const saved=localStorage.getItem('messenger-revival:self-status');paint(msnPresence[saved]?saved:'online');
}

function installPresenceRendering(){
 renderContacts=function(q=''){
   e.list.innerHTML='';
   const filtered=contacts.filter(c=>(c.name+c.mood).toLowerCase().includes(q.toLowerCase()));
   filtered.forEach(c=>{const li=document.createElement('li');li.className=`contact-item${c.id===active?' active':''}${msnPresence[c.status]?.connected?'':' is-offline'}`;li.innerHTML=`${statusIcon(c.status)}<div class="contact-mini-avatar">${typeof contactPictureMarkup==='function'?contactPictureMarkup(c,true):avatarHTML}</div><div class="contact-copy"><strong>${c.name}</strong><small>${c.mood}</small></div>`;li.onclick=()=>open(c.id);e.list.appendChild(li)});
   e.counter.textContent=contacts.filter(c=>msnPresence[c.status]?.connected).length;
   const off=document.getElementById('offlineCounter');if(off)off.textContent=contacts.filter(c=>!msnPresence[c.status]?.connected).length;
 };
 open=function(id){active=id;const c=contact();e.title.textContent=c.name;e.info.textContent=c.name;e.avatar.innerHTML=typeof contactPictureMarkup==='function'?contactPictureMarkup(c):avatarHTML;e.dot.outerHTML=statusIcon(c.status,'chat-presence');e.dot=document.querySelector('.chat-presence');renderContacts(e.search.value);render();e.input.focus()};
 renderContacts();open(active);
}

installHistoricalStatusMenu();installPresenceRendering();