(()=>{
const $=s=>document.querySelector(s);
const LABELS={
 gender:{woman:'Mujer',man:'Hombre',nonbinary:'No binario',other:'Otro',prefer_not_say:'Prefiero no decirlo'},
 orientation:{heterosexual:'Heterosexual',gay:'Gay',lesbian:'Lesbiana',bisexual:'Bisexual',pansexual:'Pansexual',asexual:'Asexual',other:'Otra',prefer_not_say:'Prefiero no decirlo'},
 looking_for:{friends:'Amigos',relationship:'Novio/a o relación',casual:'Nada serio',chat:'Solo charlar',not_looking:'No busco nada',mystery:'¿Qué te importa? Investígalo 😏'}
};
const DEFAULTS={age:null,gender:'prefer_not_say',orientation:'prefer_not_say',nationality:'',interests:'',looking_for:'not_looking'};
let dialog=null,currentMode='view',currentProfile=null,currentDetails=null;

function toast(text){
 const el=$('#toast');if(!el)return;
 el.textContent=text;el.classList.add('show');
 clearTimeout(window.__personalProfileToast);
 window.__personalProfileToast=setTimeout(()=>el.classList.remove('show'),2200);
}
function escapeText(v){return String(v??'')}
function ensureDialog(){
 if(dialog)return dialog;
 dialog=document.createElement('section');
 dialog.id='personalProfile2005';
 dialog.className='msn-personal-profile';
 dialog.hidden=true;
 dialog.innerHTML=`
 <header class="msn-profile-titlebar">
   <img src="assets/community-avatars/invite(1).png" alt="">
   <span id="mpTitle">Perfil personal</span>
   <button id="mpClose" type="button" aria-label="Cerrar">×</button>
 </header>
 <div class="msn-profile-body">
   <div class="msn-profile-banner">
     <div><b>Tarjeta personal de MSN</b><span>Un poco sobre quién está al otro lado de la conversación.</span></div>
     <img src="assets/emojis-msn-2005/10-logo-msn.png" alt="msn">
   </div>
   <div class="msn-profile-layout">
     <aside class="msn-profile-photo-panel">
       <div id="mpPhoto" class="msn-profile-photo"></div>
       <div id="mpPhotoCaption" class="msn-profile-photo-caption"></div>
       <button id="mpChangePhoto" type="button" hidden>Cambiar imagen...</button>
     </aside>
     <section class="msn-profile-details">
       <div class="msn-profile-section-title" id="mpSectionTitle">Información personal</div>
       <div id="mpView" class="msn-profile-fields"></div>
       <form id="mpEdit" class="msn-profile-fields" hidden>
         <div class="msn-profile-row"><label for="mpName">Nombre:</label><input id="mpName" maxlength="28"></div>
         <div class="msn-profile-row"><label for="mpAge">Edad:</label><input id="mpAge" type="number" min="13" max="120" inputmode="numeric" placeholder="Sin indicar"></div>
         <div class="msn-profile-row"><label for="mpGender">Sexo / género:</label><select id="mpGender"></select></div>
         <div class="msn-profile-row"><label for="mpOrientation">Orientación:</label><select id="mpOrientation"></select></div>
         <div class="msn-profile-row"><label for="mpNationality">Nacionalidad:</label><input id="mpNationality" maxlength="80" placeholder="Ej. Colombiana"></div>
         <div class="msn-profile-row"><label for="mpLookingFor">Busco:</label><select id="mpLookingFor"></select></div>
         <div class="msn-profile-row"><label for="mpInterests">Intereses:</label><textarea id="mpInterests" maxlength="300" placeholder="Música, videojuegos, cine, bailar..."></textarea></div>
         <div class="msn-profile-note">Estos datos personales solo se muestran a ti y a tus contactos aceptados.</div>
       </form>
     </section>
   </div>
   <div id="mpStatus" class="msn-profile-status"></div>
   <div class="msn-profile-footer">
     <button id="mpSave" class="primary" type="button" hidden>Guardar</button>
     <button id="mpCancel" type="button">Cerrar</button>
   </div>
 </div>`;
 (document.querySelector('.stage')||document.body).appendChild(dialog);
 fillSelect($('#mpGender'),LABELS.gender);
 fillSelect($('#mpOrientation'),LABELS.orientation);
 fillSelect($('#mpLookingFor'),LABELS.looking_for);
 $('#mpClose').onclick=close;
 $('#mpCancel').onclick=close;
 $('#mpSave').onclick=saveOwn;
 $('#mpChangePhoto').onclick=()=>{close();$('#openDisplayPicturesChat')?.click()};
 return dialog;
}
function fillSelect(el,map){
 el.replaceChildren(...Object.entries(map).map(([value,label])=>{
   const o=document.createElement('option');o.value=value;o.textContent=label;return o;
 }));
}
function close(){if(dialog){dialog.hidden=true;$('#mpStatus').textContent=''}}
function putPhoto(profile={}){
 const holder=$('#mpPhoto');holder.replaceChildren();
 if(profile.display_picture){
   const img=document.createElement('img');img.src=profile.display_picture;img.alt=profile.display_name||'Foto de perfil';holder.appendChild(img);
 }else{
   holder.innerHTML='<span class="classic-avatar hero"><i></i><b></b><em></em></span>';
 }
 $('#mpPhotoCaption').textContent=profile.display_name||profile.email||'Messenger User';
}
function row(label,value,extraClass=''){
 const wrap=document.createElement('div');wrap.className='msn-profile-row';
 const lab=document.createElement('label');lab.textContent=label;
 const val=document.createElement('div');val.className='msn-profile-value'+(extraClass?' '+extraClass:'');val.textContent=value||'No indicado';
 wrap.append(lab,val);return wrap;
}
function renderView(profile={},details={}){
 const view=$('#mpView');view.replaceChildren();
 view.append(
   row('Nombre:',profile.display_name||profile.email||'Messenger User'),
   row('Edad:',details.age?String(details.age):'No indicada'),
   row('Sexo / género:',LABELS.gender[details.gender]||'No indicado'),
   row('Orientación:',LABELS.orientation[details.orientation]||'No indicada'),
   row('Nacionalidad:',details.nationality||'No indicada'),
   row('Busco:',LABELS.looking_for[details.looking_for]||'No indicado','msn-profile-looking'),
   row('Intereses:',details.interests||'No indicados')
 );
}
function renderEdit(profile={},details={}){
 $('#mpName').value=profile.display_name||'';
 $('#mpAge').value=details.age??'';
 $('#mpGender').value=details.gender||DEFAULTS.gender;
 $('#mpOrientation').value=details.orientation||DEFAULTS.orientation;
 $('#mpNationality').value=details.nationality||'';
 $('#mpLookingFor').value=details.looking_for||DEFAULTS.looking_for;
 $('#mpInterests').value=details.interests||'';
}
async function fetchProfile(userId,fallback={}){
 const client=window.MessengerSession?.client;
 if(!client||!userId)return fallback;
 const {data}=await client.from('profiles').select('id,email,display_name,display_picture').eq('id',userId).maybeSingle();
 return data||fallback;
}
async function fetchDetails(userId){
 const client=window.MessengerSession?.client;
 if(!client||!userId)return {...DEFAULTS};
 const {data,error}=await client.from('profile_details').select('user_id,age,gender,orientation,nationality,interests,looking_for,updated_at').eq('user_id',userId).maybeSingle();
 if(error){console.warn('Profile details load failed',error.message);return {...DEFAULTS}}
 return {...DEFAULTS,...(data||{})};
}
async function openContactProfile(){
 ensureDialog();
 const peer=window.MessengerChat?.getActivePeer?.();
 if(!peer){toast('Abre una conversación primero.');return}
 currentMode='view';$('#mpStatus').textContent='Cargando perfil...';
 const [profile,details]=await Promise.all([fetchProfile(peer.id,peer),fetchDetails(peer.id)]);
 currentProfile=profile;currentDetails=details;
 $('#mpTitle').textContent=`Perfil de ${profile.display_name||profile.email||'contacto'}`;
 $('#mpSectionTitle').textContent='Información del contacto';
 $('#mpView').hidden=false;$('#mpEdit').hidden=true;$('#mpSave').hidden=true;$('#mpChangePhoto').hidden=true;
 putPhoto(profile);renderView(profile,details);$('#mpStatus').textContent='';dialog.hidden=false;
}
async function openOwnProfile(){
 ensureDialog();
 const user=window.MessengerSession?.user,base=window.MessengerSession?.profile;
 if(!user){toast('Inicia sesión para editar tu perfil.');return}
 currentMode='edit';$('#mpStatus').textContent='Cargando tu perfil...';
 const [profile,details]=await Promise.all([fetchProfile(user.id,base||{}),fetchDetails(user.id)]);
 currentProfile=profile;currentDetails=details;
 $('#mpTitle').textContent='Mi perfil personal';
 $('#mpSectionTitle').textContent='Editar mi información';
 $('#mpView').hidden=true;$('#mpEdit').hidden=false;$('#mpSave').hidden=false;$('#mpChangePhoto').hidden=false;
 putPhoto(profile);renderEdit(profile,details);$('#mpStatus').textContent='';dialog.hidden=false;
}
async function saveOwn(){
 if(currentMode!=='edit')return;
 const user=window.MessengerSession?.user,client=window.MessengerSession?.client;
 if(!user||!client)return;
 const name=$('#mpName').value.trim().slice(0,28)||'Messenger User';
 const ageRaw=$('#mpAge').value.trim();
 const age=ageRaw===''?null:Number(ageRaw);
 if(age!==null&&(!Number.isInteger(age)||age<13||age>120)){return $('#mpStatus').textContent='La edad debe estar entre 13 y 120 años.'}
 const nationality=$('#mpNationality').value.trim().slice(0,80);
 const interests=$('#mpInterests').value.trim().slice(0,300);
 const details={
   user_id:user.id,
   age,
   gender:$('#mpGender').value,
   orientation:$('#mpOrientation').value,
   nationality,
   interests,
   looking_for:$('#mpLookingFor').value,
   updated_at:new Date().toISOString()
 };
 const saveBtn=$('#mpSave');saveBtn.disabled=true;$('#mpStatus').textContent='Guardando...';
 const {error}=await client.from('profile_details').upsert(details,{onConflict:'user_id'});
 if(error){saveBtn.disabled=false;$('#mpStatus').textContent='No se pudo guardar el perfil.';console.warn(error);return}
 let nameOk=true;
 if(name!==(window.MessengerSession?.profile?.display_name||'')){
   nameOk=await window.MessengerProfileSync?.save?.({display_name:name});
 }
 if(!nameOk){saveBtn.disabled=false;$('#mpStatus').textContent='Los datos se guardaron, pero el nombre no pudo actualizarse.';return}
 if(window.MessengerSession?.profile)window.MessengerSession.profile.display_name=name;
 const nameInput=$('#displayName');if(nameInput)nameInput.value=name;
 window.dispatchEvent(new CustomEvent('messenger-revival:profile-updated',{detail:{id:user.id,display_name:name}}));
 window.dispatchEvent(new CustomEvent('messenger-revival:personal-profile-updated',{detail:details}));
 try{await window.MessengerContacts?.reload?.()}catch{}
 currentProfile={...(currentProfile||{}),display_name:name};currentDetails=details;
 putPhoto(currentProfile);saveBtn.disabled=false;$('#mpStatus').textContent='Perfil actualizado.';
 setTimeout(close,650);
}
function wireArrows(){
 const rail=$('#chatWindow .display-rail');if(!rail)return;
 const top=rail.querySelector('.avatar-frame:not(.bottom) .rail-arrow');
 const bottom=rail.querySelector('.avatar-frame.bottom .rail-arrow');
 if(top){
   top.classList.add('profile-card-arrow');top.type='button';
   top.title='Ver perfil personal del contacto';
   top.setAttribute('aria-label','Ver perfil personal del contacto');
   top.onclick=openContactProfile;
 }
 if(bottom){
   bottom.classList.add('profile-card-arrow');bottom.type='button';
   bottom.title='Ver o editar mi perfil personal';
   bottom.setAttribute('aria-label','Ver o editar mi perfil personal');
   bottom.onclick=openOwnProfile;
 }
}
window.addEventListener('messenger-revival:auth-ready',()=>setTimeout(wireArrows,0));
window.addEventListener('messenger-revival:profile-updated',ev=>{
 if(!dialog||dialog.hidden||currentMode!=='view'||!currentProfile||ev.detail?.id!==currentProfile.id)return;
 currentProfile={...currentProfile,...ev.detail};putPhoto(currentProfile);renderView(currentProfile,currentDetails||DEFAULTS);
});
wireArrows();
window.MessengerPersonalProfile={openContactProfile,openOwnProfile,close};
})();