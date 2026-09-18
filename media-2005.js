(()=>{
if(window.__MSN75MediaInstalled)return;window.__MSN75MediaInstalled=true;
const $=s=>document.querySelector(s),pane=$('#messagePane');
const asset='assets/emojis-msn-2005/';
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(window.__mediaToast);window.__mediaToast=setTimeout(()=>el.classList.remove('show'),2200)}
async function addVoiceClip(blob){if(window.MessengerChat?.sendVoice)return window.MessengerChat.sendVoice(blob);toast('El chat persistente todavía no está disponible.')}
window.MSN75Voice={
 recording:false,starting:false,stopping:false,stopRequested:false,recorder:null,stream:null,timer:null,session:0,sentSessions:new Set(),
 async start(button){
   if(this.recording||this.starting||this.stopping)return;
   const session=++this.session;this.starting=true;this.stopRequested=false;
   try{
     const stream=await navigator.mediaDevices.getUserMedia({audio:true});
     if(session!==this.session){stream.getTracks().forEach(t=>t.stop());return}
     this.stream=stream;const chunks=[],recorder=new MediaRecorder(stream);this.recorder=recorder;
     recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
     recorder.onstop=async()=>{
       clearTimeout(this.timer);this.timer=null;
       stream.getTracks().forEach(t=>t.stop());
       if(this.stream===stream)this.stream=null;
       if(this.recorder===recorder)this.recorder=null;
       this.recording=false;this.starting=false;this.stopping=false;
       button?.classList.remove('recording');const label=button?.querySelector('b');if(label)label.textContent='Voice Clip';
       if(!chunks.length||this.sentSessions.has(session))return;
       this.sentSessions.add(session);
       if(this.sentSessions.size>40){const first=this.sentSessions.values().next().value;this.sentSessions.delete(first)}
       await addVoiceClip(new Blob(chunks,{type:recorder.mimeType||'audio/webm'}));
     };
     recorder.start();this.starting=false;this.recording=true;
     button?.classList.add('recording');const label=button?.querySelector('b');if(label)label.textContent='Grabando…';
     if(this.stopRequested){this.stopRequested=false;this.stop();return}
     this.timer=setTimeout(()=>this.stop(),15000);
   }catch(e){
     this.starting=false;this.stopping=false;this.recording=false;
     this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.recorder=null;
     toast('Permite el micrófono para enviar Voice Clips.');
   }
 },
 stop(){
   if(this.starting){this.stopRequested=true;return}
   if(!this.recording||this.stopping)return;
   this.stopping=true;this.recording=false;clearTimeout(this.timer);this.timer=null;
   const recorder=this.recorder;
   if(recorder?.state==='recording')recorder.stop();else this.stopping=false;
 }
};
const toolbar=$('.compose-toolbar');if(toolbar){toolbar.innerHTML=`<button class="msn-compose-tool font-btn" title="Formato de texto"><img src="${asset}01-formato-texto-A.png" alt="Formato"><span class="drop">⌄</span></button><button class="msn-compose-tool emoji-btn" data-emoji="😀" title="Emoticonos"><img src="${asset}02-emoticon-sonrisa.png" alt="Emoticonos"><span class="drop">⌄</span></button><button class="msn-compose-tool voice-clip-btn" title="Mantén pulsado para grabar un Voice Clip de hasta 15 segundos"><img src="${asset}03-voice-clip-microfono.png" alt="Voice Clip"><b>Voice Clip</b></button><button class="msn-compose-tool emoji-btn" data-emoji="😉" title="Guiños"><img src="${asset}04-emoticon-guino.png" alt="Guiños"><span class="drop">⌄</span></button><button class="msn-compose-tool backgrounds-btn" title="Fondos de conversación"><img src="${asset}05-enviar-imagen.png" alt="Fondos"><span class="drop">⌄</span></button><button class="msn-compose-tool packs-btn" title="Packs de contenido"><img src="${asset}06-regalo.png" alt="Packs"><span class="drop">⌄</span></button><button id="nudgeBtn" class="msn-compose-tool nudge-visible" title="Zumbido"><img src="${asset}07-zumbido-nudge.png" alt="Zumbido"><b>Zumbido</b></button><button id="soundToggle" class="sound-toggle" title="Sonido">🔊</button>`;toolbar.querySelectorAll('.emoji-btn').forEach(b=>b.onclick=()=>{const input=$('#messageInput');input.value+=b.dataset.emoji;input.focus()});const voice=toolbar.querySelector('.voice-clip-btn');if(voice){voice.onpointerdown=e=>{e.preventDefault();window.MSN75Voice.start(voice)};voice.onpointerup=()=>window.MSN75Voice.stop();voice.onpointerleave=()=>window.MSN75Voice.recording&&window.MSN75Voice.stop()}toolbar.querySelector('#nudgeBtn')?.addEventListener('click',async()=>{const chat=$('#chatWindow');chat.classList.remove('nudging');void chat.offsetWidth;chat.classList.add('nudging');if(typeof playNudge==='function')playNudge();await window.MessengerChat?.sendSpecial?.('nudge','')})}
window.addEventListener('keydown',e=>{if(e.key==='F2'&&!e.repeat){e.preventDefault();window.MSN75Voice.start(toolbar?.querySelector('.voice-clip-btn'))}});window.addEventListener('keyup',e=>{if(e.key==='F2'){e.preventDefault();window.MSN75Voice.stop()}});
const ink=document.querySelector('.ink-tabs button:first-child');if(ink)ink.innerHTML=`<img src="${asset}09-escritura-manuscrita.png" alt="Escritura manuscrita">`;
const block=$('#blockContactBtn'),hand=$('#handwritingBtn'),composer=$('#messageInput');let blocked=false,handwriting=false;function paintBlock(){if(!block)return;block.classList.toggle('active',blocked);block.title=blocked?'Desbloquear contacto':'Bloquear contacto';block.setAttribute('aria-pressed',String(blocked))}window.addEventListener('messenger-revival:block-state',e=>{blocked=!!e.detail?.blocked;paintBlock()});paintBlock();block?.addEventListener('click',async()=>{const p=window.MessengerChat?.getActivePeer?.();if(!p)return toast('Abre primero una conversación.');if(p.id===window.MessengerSession?.user?.id)return toast('No puedes bloquear tu chat de notas.');blocked=await window.MessengerChat.toggleBlock();paintBlock()});hand?.addEventListener('click',()=>{handwriting=!handwriting;hand.classList.toggle('active',handwriting);hand.setAttribute('aria-pressed',String(handwriting));document.querySelector('.composer')?.classList.toggle('handwriting-mode',handwriting);if(composer){composer.placeholder=handwriting?'Escribe o dibuja tu mensaje manuscrito aquí…':'';composer.focus()}toast(handwriting?'Escritura manuscrita activada':'Escritura con teclado activada')});
const style=document.createElement('style');style.textContent=`.compose-toolbar{gap:2px!important;padding:3px 6px!important;height:38px!important}.compose-toolbar .msn-compose-tool{display:flex;align-items:center;justify-content:center;gap:2px;height:29px!important;min-width:34px!important;padding:1px 3px!important;border:0!important;background:transparent!important;cursor:pointer}.compose-toolbar .msn-compose-tool img{width:23px;height:23px;object-fit:contain;display:block}.compose-toolbar .font-btn img{width:25px;height:25px}.compose-toolbar .voice-clip-btn{min-width:92px!important}.compose-toolbar .voice-clip-btn img{width:24px;height:24px}.compose-toolbar .voice-clip-btn.recording{background:#fff2b9!important;border:1px solid #d0a94b!important}.compose-toolbar .voice-clip-btn b,.compose-toolbar .nudge-visible b{font:11px Tahoma,Verdana,Arial,sans-serif;color:#111;white-space:nowrap}.compose-toolbar .nudge-visible{min-width:88px!important}.compose-toolbar .nudge-visible img{width:27px;height:27px}.compose-toolbar .drop{font-size:9px;color:#222;margin-left:-2px}.compose-toolbar .sound-toggle{margin-left:auto!important}.ink-tabs img{width:17px;height:17px;object-fit:contain;vertical-align:middle}.service-round.active{box-shadow:inset 0 0 0 2px #fff,0 0 0 1px #5d91b1!important;background:#d9edf8!important}.composer.handwriting-mode textarea{font-family:'Comic Sans MS','Segoe Print',cursive!important;font-size:16px!important;font-style:italic!important;color:#174f8b!important;background:#fffef8!important}`;document.head.appendChild(style);
const actions=document.createElement('script');actions.src='compose-toolbar-actions-2005.js?v=20260918-1';document.body.appendChild(actions);
})();
