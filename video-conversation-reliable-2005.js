(() => {
  const $ = selector => document.querySelector(selector);
  const videoButton = $('#videoBtn');
  const rail = $('.display-rail');
  const topFrame = rail?.querySelector('.avatar-frame:first-child');
  const bottomFrame = rail?.querySelector('.avatar-frame.bottom');
  const messagePane = $('#messagePane');
  if (!videoButton || !rail || !topFrame || !bottomFrame || !messagePane) return;

  let client = null;
  let user = null;
  let profile = null;
  let channel = null;
  let pollTimer = null;
  let callTimer = null;
  let disconnectTimer = null;
  let polling = false;
  let realtimeReady = false;
  let lastSignalId = 0;
  let call = null;
  let pc = null;
  let localStream = null;
  let remoteStream = null;
  let pendingIce = [];
  let savedTopHTML = '';
  let savedBottomHTML = '';
  const processed = new Set();
  const INVITE_MAX_AGE_MS = 45000;

  const banner = document.createElement('div');
  banner.className = 'video-invite-banner';
  messagePane.parentNode.insertBefore(banner, messagePane);

  const controls = document.createElement('div');
  controls.className = 'video-call-controls';
  controls.innerHTML = '<span class="video-call-status">Videollamada</span><button type="button" id="endVideoReliable2005">Finalizar vídeo</button>';
  rail.appendChild(controls);

  function toast(text) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(window.__videoToast);
    window.__videoToast = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function activePeer() {
    return window.MessengerChat?.getActivePeer?.() || null;
  }

  async function isMutualContact(peerId) {
    if (!client || !user || !peerId) return false;
    const local = window.MessengerContacts?.contacts;
    if (Array.isArray(local) && local.length) return local.some(p => p.id === peerId);
    const { data, error } = await client.rpc('get_mutual_contact_ids');
    if (error) return false;
    return (data || []).some(row => row.contact_id === peerId);
  }

  async function discardSignal(id) {
    if (!client || !id) return;
    try { await client.from('video_call_signals').delete().eq('id', id); } catch {}
  }

  function isPresenceOnline(p) {
    if (!p) return false;
    if (window.MessengerPresence?.isOnline) return window.MessengerPresence.isOnline(p);
    if (p.status === 'offline') return false;
    const seen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
    return !!seen && Date.now() - seen <= 15000;
  }

  async function getLivePeerPresence(peerId) {
    if (!client || !peerId) return null;
    const { data, error } = await client.from('profiles')
      .select('id,email,display_name,status,last_seen_at')
      .eq('id', peerId)
      .maybeSingle();
    if (error) {
      console.warn('Could not verify contact presence', error);
      return null;
    }
    return data || null;
  }

  async function refreshVideoButton(peer = activePeer(), liveOverride = null) {
    if (!videoButton) return;
    if (!user || !peer || peer.id === user.id) {
      videoButton.disabled = true;
      videoButton.title = !peer ? 'Abre una conversación para iniciar una videollamada' : 'No puedes llamarte a ti mismo';
      return;
    }
    const live = liveOverride?.id === peer.id ? liveOverride : await getLivePeerPresence(peer.id);
    if (activePeer()?.id !== peer.id) return;
    const online = isPresenceOnline(live);
    videoButton.disabled = !online;
    videoButton.title = online ? 'Iniciar videollamada' : 'Este contacto está desconectado';
  }

  function addSystem(text) {
    const row = document.createElement('div');
    row.className = 'message msn-system-event';
    row.textContent = `MSN Messenger: ${text}`;
    messagePane.appendChild(row);
    messagePane.scrollTop = messagePane.scrollHeight;
  }

  function setBanner(text, actions = []) {
    banner.replaceChildren();
    const label = document.createElement('b');
    label.textContent = text;
    banner.appendChild(label);
    for (const item of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      if (item.primary) button.className = 'video-primary-action';
      button.onclick = item.action;
      banner.appendChild(button);
    }
    banner.classList.add('show');
  }

  function hideBanner() {
    banner.classList.remove('show');
    banner.replaceChildren();
  }

  async function ensureRealtimeAuth() {
    if (!client) return;
    try {
      const { data } = await client.auth.getSession();
      const token = data?.session?.access_token;
      if (token && client.realtime?.setAuth) await client.realtime.setAuth(token);
    } catch (error) {
      console.warn('Realtime auth refresh failed', error);
    }
  }

  async function sendSignalTo(callId, peerId, signalType, payload = {}) {
    if (!client || !user || !callId || !peerId) throw new Error('Videollamada no disponible.');
    const { data, error } = await client.from('video_call_signals').insert({
      call_id: callId,
      sender_id: user.id,
      recipient_id: peerId,
      signal_type: signalType,
      payload,
    }).select('id').single();
    if (error) throw error;
    return data;
  }
  async function sendSignal(signalType, payload = {}) {
    if (!call) throw new Error('Videollamada no disponible.');
    return sendSignalTo(call.id, call.peerId, signalType, payload);
  }

  function clearCallTimers() {
    clearTimeout(callTimer);
    clearTimeout(disconnectTimer);
    callTimer = null;
    disconnectTimer = null;
  }

  function armRingingTimeout() {
    clearTimeout(callTimer);
    const expectedId = call?.id;
    callTimer = setTimeout(async () => {
      if (!call || call.id !== expectedId || call.phase !== 'ringing') return;
      const outgoing = call.role === 'caller';
      const name = call.peerName;
      if (outgoing) await sendSignal('cancel', { reason: 'timeout' }).catch(() => {});
      restoreRail();
      call = null;
      addSystem(outgoing ? `${name} no respondió la videollamada.` : `La invitación de videollamada de ${name} expiró.`);
    }, INVITE_MAX_AGE_MS);
  }

  function stopMedia() {
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    localStream = null;
    remoteStream = null;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    pc = null;
    pendingIce = [];
  }

  function restoreRail() {
    clearCallTimers();
    stopMedia();
    rail.classList.remove('video-call');
    if (savedTopHTML) topFrame.innerHTML = savedTopHTML;
    if (savedBottomHTML) bottomFrame.innerHTML = savedBottomHTML;
    savedTopHTML = '';
    savedBottomHTML = '';
    const selfButton = $('#openDisplayPicturesChat');
    if (selfButton) selfButton.onclick = () => $('#openDisplayPictures')?.click();
    controls.querySelector('.video-call-status').textContent = 'Videollamada';
    hideBanner();
  }

  function buildCallUI() {
    if (!rail.classList.contains('video-call')) {
      savedTopHTML = topFrame.innerHTML;
      savedBottomHTML = bottomFrame.innerHTML;
    }
    rail.classList.add('video-call');
    topFrame.innerHTML = '<div class="display-pic contact-pic video-frame"><video id="msnRemoteVideo" autoplay playsinline></video><div id="remoteVideoWait" class="video-self-wait">Esperando la cámara del contacto…</div><span class="video-label"></span></div><button class="rail-arrow" type="button">⌄</button>';
    bottomFrame.innerHTML = '<div class="display-pic me-small video-frame self"><video id="msnSelfVideo" autoplay muted playsinline></video><div id="selfVideoWait" class="video-self-wait">Activando tu cámara…</div><span class="video-label">Tú</span></div><button class="rail-arrow" type="button">⌄</button>';
    topFrame.querySelector('.video-label').textContent = call?.peerName || 'Contacto';
    controls.querySelector('.video-call-status').textContent = 'Conectando videollamada…';
    hideBanner();
  }

  async function ensureLocalMedia() {
    if (localStream) return localStream;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no permite usar cámara y micrófono.');
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const localVideo = $('#msnSelfVideo');
    if (localVideo) {
      localVideo.srcObject = localStream;
      localVideo.muted = true;
      localVideo.playsInline = true;
      await localVideo.play().catch(() => {});
    }
    $('#selfVideoWait')?.remove();
    return localStream;
  }

  async function ensurePeerConnection() {
    if (pc) return pc;
    pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    remoteStream = new MediaStream();
    const remoteVideo = $('#msnRemoteVideo');
    if (remoteVideo) remoteVideo.srcObject = remoteStream;

    pc.ontrack = event => {
      const stream = event.streams?.[0];
      if (stream) {
        remoteStream = stream;
        const video = $('#msnRemoteVideo');
        if (video) video.srcObject = stream;
      } else if (!remoteStream.getTracks().some(track => track.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }
      $('#remoteVideoWait')?.remove();
      $('#msnRemoteVideo')?.play().catch(() => {});
    };

    pc.onicecandidate = event => {
      if (event.candidate && call) {
        sendSignal('ice', { candidate: event.candidate.toJSON() }).catch(error => console.warn('ICE signal failed', error));
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc?.connectionState;
      const status = controls.querySelector('.video-call-status');
      if (!status) return;
      if (state === 'connected') {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
        if (call) call.phase = 'active';
        status.textContent = 'Conversación de vídeo activa';
      } else if (state === 'connecting') {
        status.textContent = 'Conectando videollamada…';
      } else if (state === 'disconnected') {
        status.textContent = 'Reconectando videollamada…';
        clearTimeout(disconnectTimer);
        const expectedId = call?.id;
        disconnectTimer = setTimeout(() => {
          if (call?.id === expectedId && pc?.connectionState === 'disconnected') finish(true, 'La conexión de vídeo se perdió.').catch(() => {});
        }, 10000);
      } else if (state === 'failed') {
        status.textContent = 'No fue posible conectar la videollamada';
        finish(false, 'La conexión de vídeo falló.').catch(() => {});
      }
    };

    const stream = await ensureLocalMedia();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    return pc;
  }

  async function flushIce() {
    if (!pc?.remoteDescription) return;
    const queue = pendingIce.splice(0);
    for (const candidate of queue) {
      await pc.addIceCandidate(candidate).catch(() => {});
    }
  }

  async function beginAsCaller() {
    if (!call || call.role !== 'caller') return;
    buildCallUI();
    try {
      const connection = await ensurePeerConnection();
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await sendSignal('offer', { description: connection.localDescription });
    } catch (error) {
      await sendSignal('end', { reason: 'camera-error' }).catch(() => {});
      restoreRail();
      call = null;
      toast(error.message || 'No se pudo activar la cámara.');
    }
  }

  async function acceptIncoming() {
    if (!call || call.role !== 'recipient' || call.phase !== 'ringing') return;
    clearTimeout(callTimer);
    callTimer = null;
    call.phase = 'connecting';
    buildCallUI();
    try {
      await ensurePeerConnection();
      await sendSignal('accept');
      addSystem(`Aceptaste la videollamada de ${call.peerName}.`);
      controls.querySelector('.video-call-status').textContent = 'Esperando conexión del contacto…';
    } catch (error) {
      await sendSignal('reject', { reason: 'camera-error' }).catch(() => {});
      restoreRail();
      call = null;
      toast(error.message || 'No se pudo activar la cámara.');
    }
  }

  async function rejectIncoming() {
    if (!call || call.role !== 'recipient') return;
    const name = call.peerName;
    await sendSignal('reject').catch(() => {});
    restoreRail();
    call = null;
    addSystem(`Rechazaste la videollamada de ${name}.`);
  }

  async function cancelOutgoing() {
    if (!call || call.role !== 'caller') return;
    await sendSignal('cancel').catch(() => {});
    const name = call.peerName;
    restoreRail();
    call = null;
    addSystem(`Cancelaste la videollamada con ${name}.`);
  }

  async function finish(notifyPeer = true, message = 'La conversación de vídeo ha finalizado.') {
    if (!call) return;
    if (notifyPeer) await sendSignal('end').catch(() => {});
    restoreRail();
    call = null;
    addSystem(message);
  }

  async function invite() {
    const peer = activePeer();
    if (!user || !client) return toast('La videollamada todavía no está disponible.');
    if (!peer) return toast('Abre primero la conversación del contacto.');
    if (peer.id === user.id) return toast('No puedes iniciar una videollamada contigo mismo.');
    if (call) return toast('Ya tienes una videollamada en curso.');

    const livePresence = await getLivePeerPresence(peer.id);
    if (!isPresenceOnline(livePresence)) {
      await refreshVideoButton(peer);
      return toast(`${peer.display_name || peer.email || 'El contacto'} está desconectado. No se puede iniciar una videollamada.`);
    }

    call = {
      id: crypto.randomUUID(),
      peerId: peer.id,
      peerName: peer.display_name || peer.email || 'Contacto',
      role: 'caller',
      phase: 'ringing',
    };
    setBanner(`Llamando a ${call.peerName}…`, [{ label: 'Cancelar', action: cancelOutgoing }]);
    try {
      await sendSignal('invite', { from_name: profile?.display_name || user.email || 'Un contacto' });
      armRingingTimeout();
    } catch (error) {
      call = null;
      hideBanner();
      const message = String(error?.message || '');
      if (message.includes('RECIPIENT_OFFLINE')) {
        await refreshVideoButton(peer);
        toast(`${peer.display_name || peer.email || 'El contacto'} está desconectado. No se puede iniciar una videollamada.`);
      } else {
        toast(message || 'No se pudo enviar la invitación.');
      }
    }
  }

  async function showIncoming(signal) {
    const createdAt = signal?.created_at ? new Date(signal.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > INVITE_MAX_AGE_MS) {
      await discardSignal(signal.id);
      return;
    }
    if (!(await isMutualContact(signal.sender_id))) {
      await discardSignal(signal.id);
      return;
    }
    if (call) {
      if (call.id === signal.call_id) return;
      await sendSignalTo(signal.call_id, signal.sender_id, 'busy').catch(() => {});
      return;
    }

    const reservation = {
      id: signal.call_id,
      peerId: signal.sender_id,
      peerName: signal.payload?.from_name || 'Un contacto',
      role: 'recipient',
      phase: 'preparing',
    };
    call = reservation;

    const { data: sender } = await client.from('profiles')
      .select('id,email,display_name,display_picture,status,personal_message')
      .eq('id', signal.sender_id)
      .maybeSingle();
    if (!sender) {
      if (call === reservation) call = null;
      return;
    }

    if (activePeer()?.id !== sender.id) await window.MessengerApp?.openContact?.(sender);
    if (call !== reservation) return;
    reservation.peerName = sender.display_name || sender.email || reservation.peerName;
    reservation.phase = 'ringing';

    setBanner(`${call.peerName} te invita a una videollamada.`, [
      { label: 'Aceptar', action: acceptIncoming, primary: true },
      { label: 'Rechazar', action: rejectIncoming },
    ]);
    armRingingTimeout();
    window.MessengerSounds?.playMessage?.();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Messenger Revival', { body: `${call.peerName} te invita a una videollamada.` });
    }
  }

  async function handleSignal(signal) {
    if (!user || !signal?.id || signal.recipient_id !== user.id || processed.has(signal.id)) return;
    processed.add(signal.id);
    if (processed.size > 1000) processed.delete(processed.values().next().value);
    const numericId = Number(signal.id) || 0;
    if (numericId > lastSignalId) lastSignalId = numericId;
    if (signal.expires_at && new Date(signal.expires_at) <= new Date()) return;

    if (signal.signal_type === 'invite') {
      const createdAt = signal.created_at ? new Date(signal.created_at).getTime() : 0;
      if (!createdAt || Date.now() - createdAt > INVITE_MAX_AGE_MS) {
        await discardSignal(signal.id);
        return;
      }
      await showIncoming(signal);
      return;
    }

    if (!call || signal.call_id !== call.id || signal.sender_id !== call.peerId) return;

    if (signal.signal_type === 'accept' && call.role === 'caller' && call.phase === 'ringing') {
      clearTimeout(callTimer);
      callTimer = null;
      call.phase = 'connecting';
      addSystem(`${call.peerName} aceptó tu invitación de videollamada.`);
      await beginAsCaller();
      return;
    }

    if (signal.signal_type === 'offer' && call.role === 'recipient' && call.phase === 'connecting') {
      const connection = await ensurePeerConnection();
      await connection.setRemoteDescription(signal.payload?.description);
      await flushIce();
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      await sendSignal('answer', { description: connection.localDescription });
      return;
    }

    if (signal.signal_type === 'answer' && call.role === 'caller' && call.phase === 'connecting') {
      if (!pc) await ensurePeerConnection();
      await pc.setRemoteDescription(signal.payload?.description);
      await flushIce();
      return;
    }

    if (signal.signal_type === 'ice' && signal.payload?.candidate) {
      if (pc?.remoteDescription) await pc.addIceCandidate(signal.payload.candidate).catch(() => {});
      else pendingIce.push(signal.payload.candidate);
      return;
    }

    if (signal.signal_type === 'reject') {
      await finish(false, `${call.peerName} rechazó la videollamada.`);
      return;
    }
    if (signal.signal_type === 'busy') {
      await finish(false, `${call.peerName} está en otra videollamada.`);
      return;
    }
    if (signal.signal_type === 'cancel') {
      await finish(false, `${call.peerName} canceló la invitación de videollamada.`);
      return;
    }
    if (signal.signal_type === 'end') {
      await finish(false, `${call.peerName} finalizó la videollamada.`);
    }
  }

  async function pollSignals() {
    if (!client || !user || polling) return;
    polling = true;
    try {
      let query = client.from('video_call_signals')
        .select('*')
        .eq('recipient_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('id', { ascending: true })
        .limit(100);
      if (lastSignalId > 0) query = query.gt('id', lastSignalId);
      const { data, error } = await query;
      if (error) throw error;
      for (const signal of data || []) await handleSignal(signal);
    } catch (error) {
      console.warn('Video signal polling failed', error);
    } finally {
      polling = false;
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!realtimeReady && document.visibilityState === 'visible') pollSignals();
    }, 15000);
    pollSignals();
  }

  function subscribe() {
    if (!client || !user) return;
    if (channel) client.removeChannel?.(channel);
    channel = client.channel(`video-calls-${user.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'video_call_signals',
        filter: `recipient_id=eq.${user.id}`,
      }, payload => handleSignal(payload.new).catch(error => console.warn('Video signal failed', error)))
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          realtimeReady = true;
          pollSignals();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeReady = false;
        }
      });
  }

  function cleanupSession() {
    clearInterval(pollTimer);
    clearCallTimers();
    pollTimer = null;
    polling = false;
    realtimeReady = false;
    if (channel && client) client.removeChannel?.(channel);
    channel = null;
    processed.clear();
    lastSignalId = 0;
    if (call || rail.classList.contains('video-call')) restoreRail();
    call = null;
    user = null;
    profile = null;
  }

  async function init(event) {
    cleanupSession();
    client = window.MessengerSession?.client || null;
    user = event?.detail?.user || window.MessengerSession?.user || null;
    profile = event?.detail?.profile || window.MessengerSession?.profile || null;
    if (!client || !user) return;
    await ensureRealtimeAuth();
    subscribe();
    startPolling();
    refreshVideoButton();
  }

  videoButton.onclick = invite;
  controls.querySelector('#endVideoReliable2005').onclick = () => finish(true);
  window.addEventListener('messenger-revival:auth-ready', init);
  window.addEventListener('messenger-revival:conversation-opened', event => refreshVideoButton(event.detail?.peer));
  window.addEventListener('messenger-revival:profile-updated', event => {
    const peer = activePeer();
    if (peer?.id && event.detail?.id === peer.id) refreshVideoButton(peer, event.detail);
  });
  window.addEventListener('messenger-revival:auth-signed-out', () => {
    videoButton.disabled = true;
    videoButton.title = 'Inicia sesión para usar videollamadas';
    cleanupSession();
  });
  window.addEventListener('online', () => {
    if (!user) return;
    ensureRealtimeAuth().then(() => subscribe()).catch(() => {});
    pollSignals();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && user && !realtimeReady) pollSignals();
  });
  window.addEventListener('beforeunload', stopMedia);
  window.MessengerVideoCall = { invite, finish, poll: pollSignals };
  if (window.MessengerSession?.user) init();
})();
