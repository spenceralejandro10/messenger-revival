// Recreated Messenger sounds. Audio is unlocked by the first real user gesture,
// as required by Safari, Chrome and Firefox autoplay policies.
(() => {
  let audioCtx = null;
  let soundOn = localStorage.getItem('messenger-revival:sound-enabled') !== '0';
  let pendingTone = null;

  function context() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      try { audioCtx = new AudioContext(); } catch { return null; }
    }
    return audioCtx;
  }

  async function unlockAudio() {
    const ctx = context();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') await ctx.resume();
      if (ctx.state !== 'running') return false;
      if (pendingTone) {
        const tone = pendingTone;
        pendingTone = null;
        tone();
      }
      return true;
    } catch {
      return false;
    }
  }

  function scheduleTone(play) {
    if (!soundOn) return false;
    const ctx = context();
    if (!ctx || ctx.state !== 'running') {
      pendingTone = play;
      return false;
    }
    play();
    return true;
  }

  function messageTone() {
    const ctx = context();
    if (!ctx) return;
    const start = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
    gain.connect(ctx.destination);
    [659.25, 783.99].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(start + index * 0.11);
      oscillator.stop(start + 0.22 + index * 0.11);
    });
  }

  function nudgeTone() {
    const ctx = context();
    if (!ctx) return;
    const start = ctx.currentTime;
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    master.gain.setValueAtTime(0.72, start);
    compressor.threshold.setValueAtTime(-8, start);
    compressor.knee.setValueAtTime(4, start);
    compressor.ratio.setValueAtTime(8, start);
    compressor.attack.setValueAtTime(0.002, start);
    compressor.release.setValueAtTime(0.08, start);
    master.connect(compressor);
    compressor.connect(ctx.destination);
    [0, 0.075, 0.15, 0.225, 0.3].forEach((delay, index) => {
      [220, 330].forEach((frequency, voice) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = voice ? 'square' : 'sawtooth';
        oscillator.frequency.setValueAtTime(frequency + (index % 2 ? 45 : 0), start + delay);
        gain.gain.setValueAtTime(0.55, start + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.065);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(start + delay);
        oscillator.stop(start + delay + 0.07);
      });
    });
  }

  function syncToggle() {
    const button = document.querySelector('#soundToggle');
    if (!button) return;
    button.textContent = soundOn ? '🔊' : '🔇';
    button.title = soundOn ? 'Desactivar sonidos de Messenger' : 'Activar sonidos de Messenger';
    button.setAttribute('aria-pressed', String(soundOn));
  }

  function setEnabled(enabled) {
    soundOn = Boolean(enabled);
    localStorage.setItem('messenger-revival:sound-enabled', soundOn ? '1' : '0');
    if (!soundOn) pendingTone = null;
    syncToggle();
    if (soundOn) unlockAudio();
  }

  window.unlockAudio = unlockAudio;
  window.playNudge = () => scheduleTone(nudgeTone);
  window.MessengerSounds = {
    unlock: unlockAudio,
    playMessage: () => scheduleTone(messageTone),
    playNudge: () => scheduleTone(nudgeTone),
    setEnabled,
    get enabled() { return soundOn; },
  };

  document.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });
  document.addEventListener('click', event => {
    if (!event.target.closest('#soundToggle')) return;
    event.preventDefault();
    setEnabled(!soundOn);
  }, true);
  window.addEventListener('messenger-revival:auth-ready', syncToggle);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncToggle);
  else syncToggle();
})();
