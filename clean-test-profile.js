(()=>{
function clean(){
  const list=document.querySelector('#contactList'),counter=document.querySelector('#onlineCounter'),offline=document.querySelector('#offlineCounter'),search=document.querySelector('#contactSearch'),next=document.querySelector('#newChatBtn');
  if(list)list.innerHTML='';if(counter)counter.textContent='0';if(offline)offline.textContent='0';
  if(search){search.value='';search.disabled=true;search.placeholder='Sin contactos agregados'}
  if(next)next.style.display='none';
  ['messenger-revival:alex','messenger-revival:luna','messenger-revival:owen','messenger-revival:mia','messenger-revival:atlas'].forEach(k=>localStorage.removeItem(k));
}
function bootAuth(){
  if(document.querySelector('script[data-msn-auth-bootstrap]'))return;
  const s=document.createElement('script');s.src='auth-bootstrap-2005.js?v=20260917-2';s.dataset.msnAuthBootstrap='1';document.body.appendChild(s);
}
function run(){clean();bootAuth()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0));else setTimeout(run,0);
})();