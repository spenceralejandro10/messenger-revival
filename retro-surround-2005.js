(()=>{
const $=s=>document.querySelector(s);
function addStyle(){if($('#retroSurround2005Style'))return;const st=document.createElement('style');st.id='retroSurround2005Style';st.textContent=`
body.auth-locked{background:linear-gradient(#dcebf5,#cfe1ed)!important;overflow-x:hidden}
#authShell{position:relative;z-index:20}#authWindow{position:relative;z-index:25}
#retroSurround2005{position:fixed;inset:0;z-index:8;pointer-events:none;font:11px Tahoma,Verdana,Arial,sans-serif;color:#24445e}
#retroSurround2005 .retro-side{position:fixed;top:22px;bottom:22px;width:clamp(245px,27vw,420px);display:flex;flex-direction:column;gap:14px;justify-content:center}
#retroSurround2005 .retro-side.left{left:14px}#retroSurround2005 .retro-side.right{right:14px}
#retroSurround2005 .retro-card{pointer-events:auto;background:linear-gradient(#fff,#edf5fb);border:1px solid #82a2bd;box-shadow:inset 0 0 0 1px #fff,2px 3px 8px #52718b24;overflow:hidden}
#retroSurround2005 .retro-head{height:27px;padding:6px 9px;color:#fff;font-weight:bold;text-shadow:1px 1px #1f4f77;background:linear-gradient(#69b0ea,#2d83ce 45%,#1265b3 55%,#4598dc);border-bottom:1px solid #6c8faa}
#retroSurround2005 .retro-body{padding:10px 11px;line-height:1.38;background:linear-gradient(135deg,#fff 0,#f7fbfe 62%,#e9f3fa 100%)}
#retroSurround2005 .retro-logo{width:110px;height:auto;display:block;margin:0 0 7px}
#retroSurround2005 .retro-kicker{display:inline-block;margin-bottom:8px;padding:2px 7px;border:1px solid #bea84b;background:linear-gradient(#fff8d3,#f2e39b);color:#705c08;font-weight:bold}
#retroSurround2005 ul{list-style:none;margin:0;padding:0}#retroSurround2005 li{position:relative;padding:0 0 8px 14px;margin:0 0 8px;border-bottom:1px dotted #b9ccdb}#retroSurround2005 li:last-child{margin-bottom:0;padding-bottom:0;border-bottom:0}#retroSurround2005 li:before{content:'•';position:absolute;left:2px;color:#1772ba;font-weight:bold}
#retroSurround2005 b{color:#0c4c85}.retro-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.retro-mini{border:1px solid #b6cad9;background:linear-gradient(#fff,#edf4f9);padding:7px;min-height:62px}.retro-mini b{display:block;margin-bottom:3px}.retro-small{color:#647b8d}.retro-year{font-size:23px;font-weight:bold;font-style:italic;color:#2a76b3;float:right;opacity:.35;margin:-5px 0 3px 8px}
#retroSurround2005 .retro-banner{pointer-events:auto;border:1px solid #b9a04e;background:linear-gradient(#fff9db,#f1df99);padding:8px 10px;color:#6d5607;box-shadow:inset 0 0 0 1px #fff6c7}
@media(max-width:1270px){#retroSurround2005 .retro-side{width:250px}.retro-mini-grid{grid-template-columns:1fr}}
@media(max-width:1050px){#retroSurround2005{display:none}}
`;document.head.appendChild(st)}
function addPanels(){if($('#retroSurround2005'))return;const root=document.createElement('div');root.id='retroSurround2005';root.innerHTML=`
<aside class="retro-side left">
  <section class="retro-card"><div class="retro-head">MSN Hoy · 2005</div><div class="retro-body"><span class="retro-year">2005</span><img class="retro-logo" src="assets/emojis-msn-2005/10-logo-msn.png" alt="MSN"><span class="retro-kicker">Bienvenido de nuevo</span><ul>
    <li><b>8 de febrero:</b> Google Maps empieza a cambiar la forma de buscar lugares en Internet.</li>
    <li><b>14 de febrero:</b> se registra YouTube, uno de los nuevos sitios que comienzan a llamar la atención.</li>
    <li><b>24 de agosto:</b> Google Talk entra en la carrera de la mensajería instantánea.</li>
    <li><b>22 de noviembre:</b> Xbox 360 llega a Norteamérica y marca uno de los lanzamientos tecnológicos del año.</li>
  </ul></div></section>
  <section class="retro-card"><div class="retro-head">Tu vida en Messenger</div><div class="retro-body"><div class="retro-mini-grid">
    <div class="retro-mini"><b>Nick decorado</b><span class="retro-small">Corazones, símbolos, mayúsculas y colores para que nadie te confunda.</span></div>
    <div class="retro-mini"><b>Mensaje personal</b><span class="retro-small">Una frase corta para decir cómo estás sin tener que escribir primero.</span></div>
    <div class="retro-mini"><b>Display Picture</b><span class="retro-small">Tu foto era parte de tu identidad y cambiaba casi tanto como tu estado.</span></div>
    <div class="retro-mini"><b>Zumbido</b><span class="retro-small">El clásico recurso cuando alguien tardaba demasiado en responder.</span></div>
  </div></div></section>
</aside>
<aside class="retro-side right">
  <section class="retro-card"><div class="retro-head">Novedades y promociones</div><div class="retro-body"><ul>
    <li><b>Pack de emoticonos:</b> dale más personalidad a tus conversaciones con expresiones al estilo Messenger.</li>
    <li><b>Temas y colores:</b> combina tu imagen, tu nick y el ambiente de conversación.</li>
    <li><b>MSN Spaces:</b> comparte notas, fotos e intereses con tus contactos.</li>
    <li><b>Hotmail:</b> correo, contactos y Messenger forman parte del mismo universo de comunicación.</li>
  </ul></div></section>
  <section class="retro-card"><div class="retro-head">Agenda cultural · 2005</div><div class="retro-body"><ul>
    <li><b>Mayo:</b> Star Wars: Episode III — Revenge of the Sith llega a los cines.</li>
    <li><b>Julio:</b> Harry Potter and the Half-Blood Prince aparece en librerías.</li>
    <li><b>Septiembre:</b> Apple presenta el iPod nano.</li>
    <li><b>Noviembre:</b> Harry Potter and the Goblet of Fire llega al cine.</li>
  </ul></div></section>
  <div class="retro-banner"><b>Consejo Messenger:</b> cambia tu estado, actualiza tu mensaje personal y elige una imagen para mostrar que diga algo de ti.</div>
</aside>`;document.body.appendChild(root)}
function mount(){if(!$('#authWindow'))return false;addStyle();addPanels();return true}
function boot(){if(mount())return;let n=0;const t=setInterval(()=>{n++;if(mount()||n>80)clearInterval(t)},125)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
