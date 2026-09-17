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

// Contact names intentionally recreate the playful nickname culture of Messenger 2005:
// hearts, music notes, alternating case, ASCII ornaments and short personal messages.
contacts.splice(0,contacts.length,
 {id:'alex',name:'ღ•° Aℓєx °•ღ',status:'online',mood:'♫ eN la cArA de luna :)'},
 {id:'luna',name:'♥ PєєW♥Lυηα ♥•••♫',status:'away',mood:'♫ Chiquilla♫•••♥'},
 {id:'mia',name:'♡ ¡ MiiA QuEeN ! ♡',status:'busy',mood:'ღ drama queen! ღ'},
 {id:'owen',name:'☠ Y A H 5 R • Owen ♫',status:'brb',mood:'• PeRdOnA si TE AMO ♧'},
 {id:'sofia',name:'‹ F A N N Y Lú ! › ღ',status:'phone',mood:'☆ no te pido que traigas flores ☆'},
 {id:'david',name:'xX KυDαi Xx ♫',status:'lunch',mood:'☆ sin despertar ni huir ☆'},
 {id:'natalia',name:'♪ Nikkι Clαn ♪',status:'offlineGreen',mood:'♫ no me digas que no ♫'},
 {id:'mateo',name:'•°¤ Mαтєσ ¤°•',status:'blockedGreen',mood:'x_x perdido en el 2005'},
 {id:'camila',name:'♥•.¸¸.• Cαмιℓα •.¸¸.•♥',status:'offline',mood:'♪ viviendo mi canción ♪'},
 {id:'atlas',name:'★彡 AтℓαsBσт 彡★',status:'blocked',mood:'¿Alguien dijo zumbido? :P'}
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