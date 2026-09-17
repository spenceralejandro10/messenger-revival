// Louder recreated nudge while respecting the browser/device output ceiling.
async function playNudge(){
  if(!soundOn)return;
  const ok=await unlockAudio();
  if(!ok)return;
  const t=audioCtx.currentTime;
  const master=audioCtx.createGain();
  const compressor=audioCtx.createDynamicsCompressor();
  master.gain.setValueAtTime(1,t);
  compressor.threshold.setValueAtTime(-8,t);
  compressor.knee.setValueAtTime(4,t);
  compressor.ratio.setValueAtTime(8,t);
  compressor.attack.setValueAtTime(.002,t);
  compressor.release.setValueAtTime(.08,t);
  master.connect(compressor);compressor.connect(audioCtx.destination);
  [0,.075,.15,.225,.30].forEach((d,i)=>{
    [220,330].forEach((freq,j)=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type=j?'square':'sawtooth';
      o.frequency.setValueAtTime(freq+(i%2?45:0),t+d);
      g.gain.setValueAtTime(.95,t+d);
      g.gain.exponentialRampToValueAtTime(.0001,t+d+.065);
      o.connect(g);g.connect(master);o.start(t+d);o.stop(t+d+.07);
    });
  });
}