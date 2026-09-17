// Demo contact display pictures using the recreated MSN-era gallery.
// Every demo contact receives one of the pictures already stored in the project.
const demoContactPictures={
  alex:'assets/display-pictures/msn-03(1).png',
  luna:'assets/display-pictures/msn-09.png',
  owen:'assets/display-pictures/msn-06(1).png',
  mia:'assets/display-pictures/msn-05(1).png',
  atlas:'assets/display-pictures/msn-10.png',
  sofia:'assets/display-pictures/msn-01(1).png',
  david:'assets/display-pictures/msn-02(1).png',
  natalia:'assets/display-pictures/msn-04(1).png',
  mateo:'assets/display-pictures/msn-07.png',
  camila:'assets/display-pictures/msn-08.png'
};
const fallbackContactPictures=['assets/display-pictures/msn-01(1).png','assets/display-pictures/msn-02(1).png','assets/display-pictures/msn-04(1).png','assets/display-pictures/msn-07.png','assets/display-pictures/msn-08.png','assets/display-pictures/msn-11.png','assets/display-pictures/msn-12.png'];
function contactPictureMarkup(c,small=false){
  const idx=Math.max(0,contacts.findIndex(x=>x.id===c.id));
  const src=demoContactPictures[c.id]||fallbackContactPictures[idx%fallbackContactPictures.length];
  return `<img class="demo-contact-picture${small?' small':''}" src="${src}" alt="${c.name}">`;
}
renderContacts=function(q=''){
  e.list.innerHTML='';
  contacts.filter(c=>(c.name+c.mood).toLowerCase().includes(q.toLowerCase())).forEach(c=>{
    const li=document.createElement('li');
    li.className=`contact-item${c.id===active?' active':''}`;
    li.innerHTML=`<span class="person-icon ${c.status}">●</span><div class="contact-mini-avatar">${contactPictureMarkup(c,true)}</div><div class="contact-copy"><strong>${c.name}</strong><small>${c.mood}</small></div>`;
    li.onclick=()=>open(c.id);
    e.list.appendChild(li);
  });
  e.counter.textContent=contacts.filter(c=>c.status==='online').length;
};
open=function(id){
  active=id;
  const c=contact();
  e.title.textContent=c.name;
  e.info.textContent=c.name;
  e.avatar.innerHTML=contactPictureMarkup(c);
  e.dot.className=`person-icon ${c.status}`;
  renderContacts(e.search.value);
  render();
  e.input.focus();
};
renderContacts();
open(active);
