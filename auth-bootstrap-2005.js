(()=>{
  const start=()=>{
    document.body.classList.add('auth-locked');
    document.querySelector('.stage')?.classList.add('auth-hidden');
    if(!document.querySelector('link[href^="auth-2005.css"]')){
      const l=document.createElement('link');l.rel='stylesheet';l.href='auth-2005.css?v=20260917-2';document.head.appendChild(l);
    }
    if(!document.querySelector('#authShell')){
      const shell=document.createElement('div');shell.id='authShell';shell.className='auth-shell';shell.innerHTML=`
      <section id="authWindow" class="auth-window" aria-label="MSN Messenger Sign In">
        <header class="auth-titlebar"><img src="assets/community-avatars/invite(1).png" alt=""><span>MSN Messenger</span><div class="auth-caption"><button type="button">_</button><button type="button">×</button></div></header>
        <div class="auth-body">
          <div class="auth-brand"><img src="assets/emojis-msn-2005/10-logo-msn.png" alt="msn Messenger"></div>
          <div id="authLoginView" class="auth-view">
            <div class="auth-avatar-wrap"><div class="auth-avatar"><img id="authRememberedImage" alt="Display picture" hidden><div id="authDefaultAvatar" class="auth-default-avatar">☺</div></div><div id="authRememberedName" class="remembered-name"></div></div>
            <label class="auth-field"><span>E-mail address:</span><input id="authEmail" type="email" autocomplete="username"></label>
            <label class="auth-field"><span>Password:</span><input id="authPassword" type="password" autocomplete="current-password"></label>
            <label class="auth-field"><span>Status:</span><select id="authPresence"><option value="online">Online</option><option value="busy">Busy</option><option value="away">Away</option><option value="offline">Appear Offline</option></select></label>
            <div class="auth-checks"><label><input id="authRememberMe" type="checkbox">Remember Me</label><label><input id="authRememberPassword" type="checkbox">Remember my Password</label><label><input id="authAutoSignIn" type="checkbox">Sign me in automatically</label></div>
            <button id="authSignIn" class="auth-primary" type="button">Sign In</button>
            <div class="auth-links"><button id="authForgot" type="button">Forgot your password?</button><br><button id="authServiceStatus" type="button">Service Status</button> · <button id="authOpenRegister" type="button">Get a new account</button></div>
            <div id="authLoginMessage" class="auth-status"></div>
            <div class="auth-footnote">Messenger Revival · recreación independiente inspirada en MSN Messenger 7.5</div>
          </div>
          <div id="authRegisterView" class="auth-view" hidden>
            <div class="register-head">Create a Messenger Revival account</div>
            <div class="register-grid">
              <label class="auth-field"><span>E-mail address:</span><input id="registerEmail" type="email" autocomplete="email"></label>
              <label class="auth-field"><span>Display name:</span><input id="registerDisplayName" maxlength="40"></label>
              <label class="auth-field"><span>Password:</span><input id="registerPassword" type="password" autocomplete="new-password"></label>
              <label class="auth-field"><span>Confirm password:</span><input id="registerPasswordConfirm" type="password" autocomplete="new-password"></label>
            </div>
            <div class="register-photo-row"><div class="register-photo-preview"><img id="registerPhotoPreview" src="assets/emojis-msn-2005/10-logo-msn.png" alt="Preview"></div><div class="register-photo-actions"><input id="registerPhotoFile" type="file" accept="image/*" hidden><button type="button" onclick="document.getElementById('registerPhotoFile').click()">Browse picture...</button></div></div>
            <div id="registerMessage" class="auth-status"></div>
            <div class="register-buttons"><button id="authRegisterCreate" class="auth-primary" type="button">Create Account</button><button id="authRegisterCancel" class="auth-secondary" type="button">Cancel</button></div>
            <div class="auth-footnote">Your profile and Display Picture belong only to this account.</div>
          </div>
        </div>
      </section>`;
      document.body.prepend(shell);
    }
    const tools=document.querySelector('.contact-tools');
    if(tools&&!document.querySelector('#signOutBtn')){const b=document.createElement('button');b.id='signOutBtn';b.type='button';b.title='Cerrar sesión';b.textContent='Cerrar sesión';tools.appendChild(b)}
    const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});
    (async()=>{
      try{
        if(!window.supabase)await load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js');
        await load('supabase-config.js?v=20260917-3');
        await load('auth-2005.js?v=20260917-3');
      }catch(e){const m=document.querySelector('#authLoginMessage');if(m){m.textContent='No fue posible cargar el servicio de inicio de sesión.';m.className='auth-status error'}}
    })();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();