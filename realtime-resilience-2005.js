(() => {
  let client = null;
  let user = null;
  let timer = null;
  let nudgeTimer = null;
  let polling = false;
  let nudgePolling = false;
  let cursor = null;
  let nudgeCursor = null;
  const seen = new Set();
  const seenNudges = new Set();

  function toast(text) {
    const node = document.querySelector('#toast');
    if (!node) return;
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(window.__fallbackToast);
    window.__fallbackToast = setTimeout(() => node.classList.remove('show'), 2200);
  }

  async function setRealtimeAuth() {
    if (!client) return;
    try {
      const { data } = await client.auth.getSession();
      const token = data?.session?.access_token;
      if (token && client.realtime?.setAuth) await client.realtime.setAuth(token);
    } catch (error) {
      console.warn('Realtime token refresh failed', error);
    }
  }

  async function profileName(id) {
    const contact = window.MessengerContacts?.contacts?.find?.(item => item.id === id);
    if (contact) return contact.display_name || contact.email || 'Un contacto';
    try {
      const { data } = await client.from('profiles').select('display_name,email').eq('id', id).maybeSingle();
      return data?.display_name || data?.email || 'Un contacto';
    } catch {
      return 'Un contacto';
    }
  }

  async function handleRows(rows) {
    let shouldRefreshUnread = false;
    let shouldReloadActive = false;
    const active = window.MessengerChat?.getActivePeer?.();

    for (const row of rows || []) {
      if (!row?.id || seen.has(row.id)) continue;
      seen.add(row.id);
      if (!cursor || new Date(row.created_at) > new Date(cursor)) cursor = row.created_at;
      if (row.recipient_id !== user.id || row.sender_id === user.id) continue;
      shouldRefreshUnread = true;

      const alreadyRendered = !!document.querySelector(`[data-message-id="${CSS.escape(String(row.id))}"]`);
      if (row.kind === 'nudge') {
        const who = await profileName(row.sender_id);
        window.MessengerNudges?.receive?.({ id: row.id, senderId: row.sender_id, who, active: active?.id === row.sender_id });
        if (active?.id === row.sender_id && !alreadyRendered) shouldReloadActive = true;
      } else if (active?.id === row.sender_id) {
        if (!alreadyRendered) shouldReloadActive = true;
      } else if (!alreadyRendered) {
        const who = await profileName(row.sender_id);
        const kind = row.kind === 'text' ? 'un mensaje' : row.kind === 'image' ? 'una imagen' : row.kind === 'audio' ? 'un audio' : 'un archivo';
        toast(`${who} te envió ${kind}`);
        window.MessengerSounds?.playMessage?.();
      }
    }

    if (shouldReloadActive) await window.MessengerChat?.reload?.();
    if (shouldRefreshUnread) await window.MessengerChat?.refreshUnread?.();
  }

  async function pollMessages() {
    if (!client || !user || polling) return;
    polling = true;
    try {
      let q = client.from('messages')
        .select('id,sender_id,recipient_id,kind,created_at')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
        .limit(100);
      if (cursor) q = q.gte('created_at', cursor);
      else q = q.gte('created_at', new Date(Date.now() - 5000).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      await handleRows(data || []);
    } catch (error) {
      console.warn('Message fallback polling failed', error);
    } finally {
      polling = false;
    }
  }

  async function pollNudges() {
    if (!client || !user || nudgePolling || document.visibilityState !== 'visible') return;
    nudgePolling = true;
    try {
      let q = client.from('messages')
        .select('id,sender_id,recipient_id,kind,created_at')
        .eq('recipient_id', user.id)
        .eq('kind', 'nudge')
        .order('created_at', { ascending: true })
        .limit(50);
      if (nudgeCursor) q = q.gte('created_at', nudgeCursor);
      else q = q.gte('created_at', new Date(Date.now() - 5000).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      const active = window.MessengerChat?.getActivePeer?.();
      for (const row of data || []) {
        if (!row?.id || seenNudges.has(row.id)) continue;
        seenNudges.add(row.id);
        if (!nudgeCursor || new Date(row.created_at) > new Date(nudgeCursor)) nudgeCursor = row.created_at;
        const who = await profileName(row.sender_id);
        window.MessengerNudges?.receive?.({ id: row.id, senderId: row.sender_id, who, active: active?.id === row.sender_id });
        const alreadyRendered = !!document.querySelector(`[data-message-id="${CSS.escape(String(row.id))}"]`);
        if (active?.id === row.sender_id && !alreadyRendered) await window.MessengerChat?.reload?.();
      }
      if (seenNudges.size > 300) seenNudges.clear();
    } catch (error) {
      console.warn('Nudge fallback polling failed', error);
    } finally {
      nudgePolling = false;
    }
  }

  function start() {
    clearInterval(timer);
    clearInterval(nudgeTimer);
    timer = setInterval(() => { if (!window.MessengerRealtimeHealth?.messages && document.visibilityState === 'visible') pollMessages(); }, 60000);
    nudgeTimer = setInterval(pollNudges, 900);
    pollMessages();
    pollNudges();
  }

  async function init(event) {
    client = window.MessengerSession?.client || null;
    user = event?.detail?.user || window.MessengerSession?.user || null;
    if (!client || !user) return;
    seen.clear();
    seenNudges.clear();
    cursor = new Date(Date.now() - 5000).toISOString();
    nudgeCursor = new Date(Date.now() - 5000).toISOString();
    await setRealtimeAuth();
    start();
  }

  function cleanup() {
    clearInterval(timer);
    clearInterval(nudgeTimer);
    timer = null;
    nudgeTimer = null;
    polling = false;
    nudgePolling = false;
    client = null;
    user = null;
    cursor = null;
    nudgeCursor = null;
    seen.clear();
    seenNudges.clear();
  }

  window.addEventListener('messenger-revival:auth-ready', init);
  window.addEventListener('messenger-revival:auth-signed-out', cleanup);
  window.addEventListener('online', () => {
    if (!user) return;
    setRealtimeAuth().then(() => { pollMessages(); pollNudges(); }).catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && user) { pollMessages(); pollNudges(); }
  });
  if (window.MessengerSession?.user) init();
})();
