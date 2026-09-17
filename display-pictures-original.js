(()=>{
const q=s=>document.querySelector(s),dlg=q('#displayPictureDialog'),list=q('#dpList'),preview=q('#dpPreview');
if(!dlg||!list)return;
const pathFor=n=>`assets/display-pictures/msn-${String(n).padStart(2,'0')}.png`;
const altPathFor=n=>`assets/display-pictures/msn-${String(n).padStart(2,'0')}(1).png`;
let pending=Number(localStorage.getItem('messenger-revival:dp-number')||1);
function img(n,cls=''){const im=document.createElement('img');im.src=pathFor(n);im.alt=`Display picture ${n}`;im.className=cls;im.onerror=()=>{if(!im.dataset.alt){im.dataset.alt='1';im.src=altPathFor(n)}};return im}
function build(){list.innerHTML='';for(let n=1;n<=48;n++){const row=document.createElement('div');row.className='dp-item'+(n===pending?' selected':'');row.setAttribute('role','option');row.setAttribute('aria-label',`Display picture ${n}`);const thumb=document.createElement('span');thumb.className='dp-thumb';thumb.appendChild(img(n));row.appendChild(thumb);const label=document.createElement('span');label.textContent=`msn-${String(n).padStart(2,'0')}`;row.appendChild(label);row.onclick=()=>{pending=n;build();if(preview){preview.innerHTML='';preview.appendChild(img(n))}};list.appendChild(row)}}
function paint(){const n=Number(localStorage.getItem('messenger-revival:dp-number')||1);['#selfAvatar','#selfAvatarChat'].forEach(sel=>{const old=q(sel);if(!old)return;const holder=document.createElement('span');holder.id=old.id;holder.className='self-avatar-holder';holder.appendChild(img(n));old.replaceWith(holder)})}
function open(ev){ev?.stopImmediatePropagation();pending=Number(localStorage.getItem('messenger-revival:dp-number')||1);build();dlg.hidden=false}
['#openDisplayPictures','#openDisplayPicturesChat'].forEach(sel=>q(sel)?.addEventListener('click',open,true));
q('#dpOk')?.addEventListener('click',ev=>{ev.stopImmediatePropagation();localStorage.setItem('messenger-revival:dp-number',String(pending));localStorage.setItem('messenger-revival:display-picture','default');localStorage.setItem('messenger-revival:hide-picture','0');paint();dlg.hidden=true},true);
['#dpCancel','#closeDisplayPictures'].forEach(sel=>q(sel)?.addEventListener('click',ev=>{ev.stopImmediatePropagation();dlg.hidden=true},true));
q('#dpHelp')?.addEventListener('click',ev=>{ev.stopImmediatePropagation();alert('Select a display picture and click OK.')},true);
q('#morePictures')?.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();q('#browsePicture')?.click()},true);
q('#browsePicture')?.addEventListener('click',ev=>{ev.stopImmediatePropagation();const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const data=String(r.result);localStorage.setItem('messenger-revival:custom-picture',data);['#selfAvatar','#selfAvatarChat'].forEach(sel=>{const h=q(sel);if(h){h.innerHTML='';const im=document.createElement('img');im.src=data;h.appendChild(im)}});dlg.hidden=true};r.readAsDataURL(f)};i.click()},true);
build();paint();
})();