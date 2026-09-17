// Demo contact display pictures using the recreated MSN-era gallery.
const demoContactPictures={
  alex:'assets/display-pictures/msn-03(1).png',
  luna:'assets/display-pictures/msn-09.png',
  owen:'assets/display-pictures/msn-06(1).png',
  mia:'assets/display-pictures/msn-05(1).png',
  atlas:'assets/display-pictures/msn-10.png'
};

function contactPictureMarkup(c,small=false){
  const src=demoContactPictures[c.id];
  if(!src)return avatarHTML;
  return `<img class="demo-contact-picture${small?' small':''}" src="${src}" alt="${c.name}" onerror="this.style.display='none'">`;
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
