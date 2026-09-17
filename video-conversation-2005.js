(() => {
  const $ = selector => document.querySelector(selector);
  const videoButton = $('#videoBtn');
  const rail = $('.display-rail');
  const topFrame = rail?.querySelector('.avatar-frame:first-child');
  const bottomFrame = rail?.querySelector('.avatar-frame.bottom');
  const messagePane = $('#messagePane');
  if (!videoButton || !rail || !topFrame || !bottomFrame || !messagePane) return;

  let client = null, user = null, profile = null, signalChannel = null, signalReady = false;
  let call = null, peerConnection = null, localStream = null, remoteStream = null;
  let pendingIce = [], savedTopHTML = '', savedBottomHTML = '';
  const processedSignals = new Set();

  const banner = document.createElement('div');
  banner.className = 'video-invite-banner';
  messagePane.parentNode.insertBefore(banner, messagePane);
  const controls = document.createElement('div');
  controls.className = 'video-call-controls';
  controls.innerHTML = '<span class="video-call-status">Conectando videollamada…</span><button type="button" id="endVideo2005">Finalizar vídeo</button>';
  rail.appendChild(controls);

  function toast(text) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(window.__videoToast);
    window.__videoToast = setTimeout(() => node.classList.remove('show'), 2400);
  }
  function activePeer() { return window.MessengerChat?.getActivePeer?.() || null; }
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
    actions.forEach(({ label: actionLabel, action, primary }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = actionLabel;
      if (primary) button.className = 'video-primary-action';
      button.onclick = action;
      banner.appendChild(button);
    });
    banner.classList.add('show');
  }
  function hideBanner() { banner.classList.remove('show'); banner.replaceChildren(); }

  async function sendSignal(signalType, payload = {}) {
    if (!client || !user || !call) throw new Error('Videollamada no disponible.');
    const { error } = await client.from('video_call_signals').insert({
      call_id: call.id,
      sender_id: user.id,
      recipient_id: call.peerId,
      signal_type: signalType,
      payload,
    });
    if (error) throw error;
  }

  function stopMedia() {
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    localStream = null;
    remoteStream = null;
    if (peerConnection) {
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
    }
    peerConnection = null;
    pendingIce = [];
  }
  function restoreRail() {
    stopMedia();
    rail.classList.remove('video-call');
    if (savedTopHTML) topFrame.innerHTML = savedTopHTML;
    if (savedBottomHTML) bottomFrame.innerHTML = savedBottomHTML;
    savedTopHTML = '';
    savedBottomHTML = '';
    const selfButton = $('#openDisplayPicturesChat');
    if (selfButton) selfButton.onclick = () => $('#openDisplayPictures')?.click();
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
    const wait = $('#selfVideoWait');
    if (wait) wait.style.display = 'none';
    return localStream;
  }
  async function ensurePeerConnection() {
    if (peerConnection) return peerConnection;
    peerConnection = new RTCPeerConnection({ iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ] });
    remoteStream = new MediaStream();
    const remoteVideo = $('#msnRemoteVideo');
    if (remoteVideo) remoteVideo.srcObject = remoteStream;
    peerConnection.ontrack = event => {
      const stream = event.streams?.[0];
      if (stream) {
        remoteStream = stream;
        if (remoteVideo) remoteVideo.srcObject = stream;
      } else if (!remoteStream.getTracks().some(track => track.id === event.track.id)) remoteStream.addTrack(event.track);
      $('#remoteVideoWait')?.remove();
      remoteVideo?.play().catch(() => {});
    };
    peerConnection.onicecandidate = event => {
      if (event.candidate && call) sendSignal('ice', { candidate: event.candidate.toJSON() }).catch(error => console.warn('ICE signal failed', error));
    };
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection?.connectionState;
      const status = controls.querySelector('.video-call-status');
      if (state === 'connected') {
        call.phase = 'active';
        status.textContent = 'Conversación de vídeo activa';
      } else if (state === 'failed') {
        status.textContent = 'No fue posible conectar la videollamada';
        finish(false, 'La conexión de vídeo falló.');
      }
    };
    const stream = await ensureLocalMedia();
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    return peerConnection;
  }
  async function flushIce() {
    if (!peerConnection?.remoteDescription) return;
    const candidates = pendingIce.splice(0);
    for (const candidate of candidates) await peerConnection.addIceCandidate(candidate).catch(() => {});
  }
  async function beginAsCaller() {
    buildCallUI();
    try {
      const connection = await ensurePeerConnection();
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await sendSignal('offer', { description: connection.localDescription });
    } catch (error) {
      await sendSignal('end', { reason: 'camera-error' }).catch(() => {});
      restoreRail(); call = null;
      toast(error.message || 'No se pudo activar la cámara.');
    }
  }
  async function acceptIncoming() {
    if (!call || call.role !== 'recipient') return;
    call.phase = 'connecting';
    buildCallUI();
    try {
      await ensurePeerConnection();
      await sendSignal('accept');
      addSystem(`Aceptaste la videollamada de ${call.peerName}.`);
    } catch (error) {
      await sendSignal('reject', { reason: 'camera-error' }).catch(() => {});
      restoreRail(); call = null;
      toast(error.message || 'No se pudo activar la cámara.');
    }
  }
  async function rejectIncoming() {
    if (!call || call.role !== 'recipient') return;
    const name = call.peerName;
    await sendSignal('reject').catch(() => {});
    call = null; hideBanner();
    addSystem(`Rechazaste la videollamada de ${name}.`);
  }
  async function cancelOutgoing() {
    if (!call || call.role !== 'caller') return;
    await sendSignal('cancel').catch(() => {});
    call = null; hideBanner();
    addSystem('Cancelaste la invitación de videollamada.');
  }
  async function finish(notifyPeer = true, message = 'La conversación de vídeo ha finalizado.') {
    if (!call) return;
    if (notifyPeer) await sendSignal('end').catch(() => {});
    restoreRail(); call = null;
    addSystem(message);
  }

  async function invite() {
    const peer = activePeer();
    if (!user || !client || !signalReady) return toast('La conexión realtime todavía no está lista.');
    if (!peer) return toast('Abre primero la conversación del contacto.');
    if (peer.id === user.id) return toast('No puedes iniciar una videollamada contigo mismo.');
    if (call) return toast('Ya tienes una videollamada en curso.');
    call = { id: crypto.randomUUID(), peerId: peer.id, peerName: peer.display_name || peer.email || 'Contacto', role: 'caller', phase: 'ringing' };
    setBanner(`Llamando a ${call.peerName}…`, [{ label: 'Cancelar', action: cancelOutgoing }]);
    try {
      await sendSignal('invite', { from_name: profile?.display_name || user.email || 'Un contacto' });
    } catch (error) {
      call = null; hideBanner();
      toast(error.message || 'No se pudo enviar la invitación.');
    }
  }
  async function showIncoming(signal) {
    if (call) {
      const previous = call;
      call = { id: signal.call_id, peerId: signal.sender_id };
      await sendSignal('busy').catch(() => {});
      call = previous;
      return;
    }
    const { data: sender } = await client.from('profiles').select('id,email,display_name,display_picture,status,personal_message').eq('id', signal.sender_id).maybeSingle();
    if (!sender) return;
    if (activePeer()?.id !== sender.id) await window.MessengerApp?.openContact?.(sender);
    call = { id: signal.call_id, peerId: signal.sender_id, peerName: sender.display_name || sender.email || signal.payload?.from_name || 'Un contacto', role: 'recipient', phase: 'ringing' };
    setBanner(`${call.peerName} te invita a una videollamada.`, [
      { label: 'Aceptar', action: acceptIncoming, primary: true },
      { label: 'Rechazar', action: rejectIncoming },
    ]);
    window.MessengerSounds?.playMessage?.();
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Messenger Revival', { body: `${call.peerName} te invita a una videollamada.` });
  }
  async function handleSignal(signal) {
    if (!user || !signal?.id || signal.recipient_id !== user.id || processedSignals.has(signal.id)) return;
    processedSignals.add(signal.id);
    if (new Date(signal.expires_at) <= new Date()) return;
    if (signal.signal_type === 'invite') return showIncoming(signal);
    if (!call || signal.call_id !== call.id || signal.sender_id !== call.peerId) return;
    if (signal.signal_type === 'accept' && call.role === 'caller' && call.phase === 'ringing') {
      call.phase = 'connecting';
      addSystem(`${call.peerName} aceptó tu invitación de videollamada.`);
      return beginAsCaller();
    }
    if (signal.signal_type === 'offer' && call.role === 'recipient' && call.phase === 'connecting') {
      const connection = await ensurePeerConnection();
      await connection.setRemoteDescription(signal.payload.description);
      await flushIce();
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      return sendSignal('answer', { description: connection.localDescription });
    }
    if (signal.signal_type === 'answer' && call.role === 'caller' && call.phase === 'connecting') {
      await peerConnection?.setRemoteDescription(signal.payload.description);
      return flushIce();
    }
    if (signal.signal_type === 'ice' && signal.payload?.candidate) {
      if (peerConnection?.remoteDescription) await peerConnection.addIceCandidate(signal.payload.candidate).catch(() => {});
      else pendingIce.push(signal.payload.candidate);
      return;
    }
    if (signal.signal_type === 'reject') return finish(false, `${call.peerName} rechazó la videollamada.`);
    if (signal.signal_type === 'busy') return finish(false, `${call.peerName} está en otra videollamada.`);
    if (signal.signal_type === 'cancel') return finish(false, `${call.peerName} canceló la invitación de videollamada.`);
    if (signal.signal_type === 'end') return finish(false, `${call.peerName} finalizó la videollamada.`);
  }
  async function loadPendingSignals() {
    if (!client || !user) return;
    const { data: invites } = await client.from('video_call_signals').select('*').eq('recipient_id', user.id).eq('signal_type', 'invite').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(10);
    for (const invite of invites || []) {
      const { data: latest } = await client.from('video_call_signals').select('signal_type').eq('call_id', invite.call_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (latest?.signal_type === 'invite') {
        await handleSignal(invite);
        break;
      }
    }
  }
  function cleanupSession() {
    if (signalChannel && client) client.removeChannel?.(signalChannel);
    signalChannel = null; signalReady = false; processedSignals.clear();
    if (call) restoreRail();
    call = null; user = null; profile = null;
  }
  function init(event) {
    cleanupSession();
    client = window.MessengerSession?.client || null;
    user = event?.detail?.user || window.MessengerSession?.user || null;
    profile = event?.detail?.profile || window.MessengerSession?.profile || null;
    if (!client || !user) return;
    signalChannel = client.channel(`video-calls-${user.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_call_signals' }, payload => handleSignal(payload.new).catch(error => console.warn('Video signal failed', error)))
      .subscribe(status => {
        signalReady = status === 'SUBSCRIBED';
        if (signalReady) loadPendingSignals().catch(() => {});
      });
  }

  videoButton.onclick = invite;
  controls.querySelector('#endVideo2005').onclick = () => finish(true);
  window.addEventListener('messenger-revival:auth-ready', init);
  window.addEventListener('messenger-revival:auth-signed-out', cleanupSession);
  window.addEventListener('beforeunload', stopMedia);
  if (window.MessengerSession?.user) init();
})();
