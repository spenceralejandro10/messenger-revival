(() => {
  if (document.querySelector('script[data-msn-video-reliable]')) return;
  const script = document.createElement('script');
  script.src = 'video-conversation-reliable-2005.js?v=20260918-3';
  script.dataset.msnVideoReliable = '1';
  document.body.appendChild(script);
})();
