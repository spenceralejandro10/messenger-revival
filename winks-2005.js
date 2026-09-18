(()=>{
const CATALOG=[
  {id:'kiss',name:'Beso',icon:'😘',particles:'💋💖💕'},
  {id:'love',name:'Lluvia de amor',icon:'😍',particles:'❤️💖💕💗'},
  {id:'laugh',name:'Carcajada',icon:'😂',particles:'🤣😂✨'},
  {id:'wink',name:'Guiño clásico',icon:'😉',particles:'✨⭐'},
  {id:'cool',name:'Muy cool',icon:'😎',particles:'⭐✨💫'},
  {id:'party',name:'Fiesta',icon:'🥳',particles:'🎉🎊✨'},
  {id:'hug',name:'Abrazo',icon:'🤗',particles:'💛🧡💖'},
  {id:'rose',name:'Rosa',icon:'🌹',particles:'🌹💖✨'},
  {id:'fire',name:'En llamas',icon:'🔥',particles:'🔥✨💥'},
  {id:'thunder',name:'Impacto',icon:'⚡',particles:'⚡💥✨'},
  {id:'magic',name:'Magia',icon:'🪄',particles:'✨⭐💫'},
  {id:'angel',name:'Ángel',icon:'😇',particles:'✨☁️⭐'},
  {id:'devil',name:'Travieso',icon:'😈',particles:'🔥😈✨'},
  {id:'tears',name:'Drama',icon:'😭',particles:'💧💙😢'},
  {id:'dance',name:'A bailar',icon:'💃',particles:'🎵🎶✨'},
  {id:'music',name:'Música',icon:'🎧',particles:'🎵🎶💿'},
  {id:'star',name:'Superestrella',icon:'🌟',particles:'⭐✨🌟'},
  {id:'rocket',name:'Despegue',icon:'🚀',particles:'⭐✨🔥'},
  {id:'coffee',name:'Cafecito',icon:'☕',particles:'🤎✨☕'},
  {id:'game',name:'A jugar',icon:'🎮',particles:'⭐🎮✨'},
  {id:'cat',name:'Gatito',icon:'😺',particles:'🐾💖✨'},
  {id:'heartbreak',name:'Corazón roto',icon:'💔',particles:'💔💧🖤'},
  {id:'surprise',name:'Sorpresa',icon:'😲',particles:'❗✨💥'},
  {id:'letter',name:'Carta de amor',icon:'💌',particles:'💖💕✨'}
];
const MAP=new Map(CATALOG.map(x=>[x.id,x])),seen=new Set();
function item(id){return MAP.get(id)||MAP.get('wink')}
function play(id,opts={}){
  const w=item(id),root=opts.root||document.querySelector('#chatWindow .conversation-main')||document.querySelector('#messagePane')?.parentElement;
  if(!root)return false;
  const messageId=opts.messageId?String(opts.messageId):'';
  if(messageId&&seen.has(messageId))return false;
  if(messageId){seen.add(messageId);if(seen.size>400){const first=seen.values().next().value;seen.delete(first)}}
  root.querySelectorAll('.msn-wink-overlay-2005').forEach(x=>x.remove());
  const ov=document.createElement('div');ov.className='msn-wink-overlay-2005';ov.dataset.wink=w.id;
  const stage=document.createElement('div');stage.className='msn-wink-stage-2005';
  const main=document.createElement('div');main.className='msn-wink-main-2005';main.textContent=w.icon;
  const label=document.createElement('div');label.className='msn-wink-label-2005';label.textContent=w.name;
  stage.append(main,label);
  const parts=[...w.particles];
  for(let i=0;i<14;i++){
    const p=document.createElement('span');p.className='msn-wink-particle-2005';p.textContent=parts[i%parts.length]||'✨';
    const angle=(Math.PI*2*i/14)+(i%2?.18:-.08),radius=72+(i%5)*25;
    p.style.setProperty('--x',Math.cos(angle)*radius+'px');p.style.setProperty('--y',Math.sin(angle)*radius+'px');
    p.style.setProperty('--r',(-80+i*23)+'deg');p.style.setProperty('--delay',(i%5)*.07+'s');stage.appendChild(p);
  }
  for(let i=0;i<10;i++){
    const s=document.createElement('i');s.className='msn-wink-spark-2005';
    const angle=(Math.PI*2*i/10)+.25,radius=95+(i%4)*28;
    s.style.setProperty('--x',Math.cos(angle)*radius+'px');s.style.setProperty('--y',Math.sin(angle)*radius+'px');s.style.setProperty('--delay',(i%4)*.09+'s');stage.appendChild(s);
  }
  ov.appendChild(stage);root.appendChild(ov);
  window.MessengerSounds?.playMessage?.();
  setTimeout(()=>ov.remove(),3000);
  return true;
}
function receive(detail={}){
  const id=detail.id||detail.messageId||'';
  const winkId=detail.winkId||detail.body||'wink';
  let played=true;
  if(detail.active===false){
    if(id&&seen.has(String(id)))return false;
    if(id)seen.add(String(id));
    window.MessengerSounds?.playMessage?.();
  }else played=play(winkId,{messageId:id});
  if(!played)return false;
  const who=detail.who||'Un contacto',toast=document.querySelector('#toast');
  if(toast){toast.textContent=`${who} te envió un guiño: ${item(detail.winkId||detail.body).name}`;toast.classList.add('show');clearTimeout(window.__winkToast);window.__winkToast=setTimeout(()=>toast.classList.remove('show'),2600)}
  document.title=`😉 ${who} — Messenger Revival`;
  return true;
}
function pickerHTML(){
  return `<div class="msn-wink-grid-2005">${CATALOG.map(w=>`<button type="button" class="msn-wink-choice-2005" data-wink-id="${w.id}" title="${w.name}"><span>${w.icon}</span><small>${w.name}</small></button>`).join('')}</div>`;
}
window.MessengerWinks={catalog:CATALOG,item,play,receive,pickerHTML,hasSeen:id=>seen.has(String(id||''))};
})();