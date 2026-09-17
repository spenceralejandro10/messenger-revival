(() => {
  if (document.querySelector('script[data-msn-video-reliable]')) return;
  const script = document.createElement('script');
  script.src = 'video-conversation-reliable-2005.js?v=20260917-2';
  script.dataset.msnVideoReliable = '1';
  document.body.appendChild(script);
})();
