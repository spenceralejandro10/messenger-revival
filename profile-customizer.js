(()=>{
const MAX=28,MIN_SIZE=9,MAX_SIZE=18,$=s=>document.querySelector(s),name=$('#displayName');
if(!name)return;

const FONTS=['Tahoma','Arial','Verdana','Trebuchet MS','Georgia','Times New Roman','Comic Sans MS','Courier New'];
const STYLES=['normal','bold','italic','bold-italic'];
const DEFAULTS={font:'Tahoma',style:'normal',size:11,color:'#111111'};

name.maxLength=MAX;
name.setAttribute('title',`Máximo ${MAX} caracteres`);

const wrap=name.parentElement,edit=document.createElement('button');
edit.type='button';
edit.className='profile-edit-trigger';
edit.title='Cambiar nombre, tipografía, tamaño y color';
edit.textContent='✎';
wrap.appendChild(edit);

const dlg=document.createElement('section');
dlg.className='xp-dialog profile-font-dialog';
dlg.hidden=true;
dlg.innerHTML=`<header class="xp-dialog-title"><span>Change Display Name</span><button id="pfClose">×</button></header>
<div class="profile-font-body">
  <div class="profile-font-row"><label>Display name:</label><input id="pfName" maxlength="${MAX}"></div>
  <div class="profile-font-count"><span id="pfCount">0</span> / ${MAX}</div>
  <div class="profile-font-row"><label>Font:</label><select id="pfFont">${FONTS.map(f=>`<option value="${f}">${f}</option>`).join('')}</select></div>
  <div class="profile-font-row"><label>Style:</label><select id="pfStyle">
    <option value="normal">Regular</option><option value="bold">Bold</option>
    <option value="italic">Italic</option><option value="bold-italic">Bold Italic</option>
  </select></div>
  <div class="profile-font-row"><label>Size:</label><select id="pfSize">
    <option value="9">9 px</option><option value="10">10 px</option><option value="11">11 px</option>
    <option value="12">12 px</option><option value="14">14 px</option><option value="16">16 px</option><option value="18">18 px</option>
  </select></div>
  <div class="profile-font-row"><label>Color:</label><div class="profile-font-color-control"><input id="pfColor" type="color" value="#111111"><span id="pfColorText">#111111</span></div></div>
  <div class="profile-font-preview" id="pfPreview"></div>
  <div id="pfStatus" class="profile-font-status"></div>
  <div class="profile-font-footer"><button id="pfOk">OK</button><button id="pfCancel">Cancel</button></div>
</div>`;
(document.querySelector('.stage')||document.body).appendChild(dlg);

const n=$('#pfName'),font=$('#pfFont'),style=$('#pfStyle'),size=$('#pfSize'),color=$('#pfColor'),
preview=$('#pfPreview'),count=$('#pfCount'),colorText=$('#pfColorText'),status=$('#pfStatus'),ok=$('#pfOk');

function clean(v){return [...String(v||'').replace(/[\r\n\t]/g,' ')].slice(0,MAX).join('')}
function validColor(v){return /^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():DEFAULTS.color}
function validSize(v){const x=Math.round(Number(v)||DEFAULTS.size);return Math.min(MAX_SIZE,Math.max(MIN_SIZE,x))}
function validFont(v){return FONTS.includes(v)?v:DEFAULTS.font}
function validStyle(v){return STYLES.includes(v)?v:DEFAULTS.style}
function settingsFrom(p={}){
  return {
    font:validFont(p.display_name_font||localStorage.getItem('messenger-revival:nick-font')||DEFAULTS.font),
    style:validStyle(p.display_name_style||localStorage.getItem('messenger-revival:nick-style')||DEFAULTS.style),
    size:validSize(p.display_name_size||localStorage.getItem('messenger-revival:nick-size')||DEFAULTS.size),
    color:validColor(p.display_name_color||localStorage.getItem('messenger-revival:nick-color')||DEFAULTS.color)
  };
}
function applyVisual(el,f,s,z,c,previewMode=false){
  if(!el)return;
  f=validFont(f);s=validStyle(s);z=validSize(z);c=validColor(c);
  el.style.setProperty('font-family',`"${f}",Tahoma,Verdana,Arial,sans-serif`,'important');
  el.style.setProperty('font-weight',s.includes('bold')?'700':'400','important');
  el.style.setProperty('font-style',s.includes('italic')?'italic':'normal','important');
  el.style.setProperty('font-size',`${z}px`,'important');
  el.style.setProperty('line-height',`${Math.max(16,z+3)}px`,'important');
  el.style.setProperty('color',c,'important');
  if(!previewMode){
    el.style.maxWidth='112px';
    el.style.overflow='hidden';
    el.style.textOverflow='ellipsis';
    el.style.whiteSpace='nowrap';
  }
}
function persistLocal(s){
  localStorage.setItem('messenger-revival:nick-font',s.font);
  localStorage.setItem('messenger-revival:nick-style',s.style);
  localStorage.setItem('messenger-revival:nick-size',String(s.size));
  localStorage.setItem('messenger-revival:nick-color',s.color);
}
function applyProfile(p={}){
  if(p.display_name&&document.activeElement!==name)name.value=clean(p.display_name);
  const s=settingsFrom(p);persistLocal(s);applyVisual(name,s.font,s.style,s.size,s.color);
}
function refresh(){
  n.value=clean(n.value);
  count.textContent=[...n.value].length;
  const s={font:font.value,style:style.value,size:validSize(size.value),color:validColor(color.value)};
  color.value=s.color;colorText.textContent=s.color.toUpperCase();
  preview.textContent=n.value||'Display name';
  applyVisual(preview,s.font,s.style,s.size,s.color,true);
}
function open(){
  const p=window.MessengerSession?.profile||{};
  const s=settingsFrom(p);
  n.value=clean(name.value||p.display_name||'');
  font.value=s.font;style.value=s.style;size.value=String(s.size);color.value=s.color;
  status.textContent='';refresh();dlg.hidden=false;n.focus();n.select();
}
function close(){dlg.hidden=true;status.textContent=''}
async function save(){
  const v=clean(n.value).trim()||'Messenger User';
  const s={font:validFont(font.value),style:validStyle(style.value),size:validSize(size.value),color:validColor(color.value)};
  const patch={display_name:v,display_name_font:s.font,display_name_style:s.style,display_name_size:s.size,display_name_color:s.color};
  ok.disabled=true;status.textContent='Guardando...';
  let saved=true;
  if(window.MessengerSession?.user&&window.MessengerProfileSync?.save)saved=await window.MessengerProfileSync.save(patch);
  if(!saved){status.textContent='No se pudo guardar el nombre. Intenta de nuevo.';ok.disabled=false;return}
  name.value=v;localStorage.setItem('messenger-revival:nick',v);persistLocal(s);applyVisual(name,s.font,s.style,s.size,s.color);
  if(window.MessengerSession?.profile)Object.assign(window.MessengerSession.profile,patch);
  const id=window.MessengerSession?.user?.id;
  if(id)window.dispatchEvent(new CustomEvent('messenger-revival:profile-updated',{detail:{id,...patch}}));
  try{await window.MessengerContacts?.reload?.()}catch{}
  name.dispatchEvent(new Event('change'));
  ok.disabled=false;close();
}
edit.onclick=open;
$('#pfClose').onclick=close;$('#pfCancel').onclick=close;ok.onclick=save;
n.oninput=refresh;font.onchange=refresh;style.onchange=refresh;size.onchange=refresh;color.oninput=refresh;
name.addEventListener('input',()=>{name.value=clean(name.value)});
name.addEventListener('change',()=>{name.value=clean(name.value).trim()||'Messenger User';localStorage.setItem('messenger-revival:nick',name.value)});

applyProfile(window.MessengerSession?.profile||{});
window.addEventListener('messenger-revival:auth-ready',ev=>applyProfile(ev.detail?.profile||{}));
window.addEventListener('messenger-revival:profile-updated',ev=>{if(ev.detail?.id===window.MessengerSession?.user?.id)applyProfile({...window.MessengerSession?.profile,...ev.detail})});

document.querySelectorAll('.rail-arrow').forEach((b,i)=>{
  b.type='button';b.title='Cambiar imagen para mostrar';
  b.onclick=()=>{const target=i===0?$('#chatAvatar'):$('#openDisplayPicturesChat');if(i===0){const t=document.createElement('div');t.className='toast show';t.textContent='Esta flecha corresponde a la imagen del contacto.';document.body.appendChild(t);setTimeout(()=>t.remove(),1500)}else target?.click()}
});
})();