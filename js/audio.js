let ctx = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

function envelope(node, gain, attack, sustain, release, peak = 0.3) {
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.linearRampToValueAtTime(peak * 0.6, now + attack + sustain);
  gain.gain.linearRampToValueAtTime(0, now + attack + sustain + release);
  node.start(now);
  node.stop(now + attack + sustain + release + 0.05);
}

export function playClick() {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + 0.06);
  osc.connect(gain).connect(c.destination);
  envelope(osc, gain, 0.005, 0.04, 0.05, 0.15);
}

export function playWind() {
  const c = ensureCtx();
  if (!c) return;
  const buffer = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const fade = Math.sin((i / data.length) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * fade * 0.3;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 700;
  filter.Q.value = 0.8;
  const gain = c.createGain();
  gain.gain.value = 0.4;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}

export function playSplash() {
  const c = ensureCtx();
  if (!c) return;
  const buffer = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const fade = Math.exp(-i / (c.sampleRate * 0.15));
    data[i] = (Math.random() * 2 - 1) * fade * 0.5;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  src.connect(filter).connect(c.destination);
  src.start();

  // splash also has a low thud
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.25);
  osc.connect(gain).connect(c.destination);
  envelope(osc, gain, 0.01, 0.1, 0.2, 0.4);
}

export function playStep() {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(330, c.currentTime + 0.08);
  osc.connect(gain).connect(c.destination);
  envelope(osc, gain, 0.005, 0.05, 0.06, 0.18);
}

export function playVictory() {
  const c = ensureCtx();
  if (!c) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gain).connect(c.destination);
    const start = c.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.4);
    osc.start(start);
    osc.stop(start + 0.45);
  });

  // Bell ding overlay
  setTimeout(() => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1568; // G6
    osc.connect(gain).connect(c.destination);
    const now = c.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.start(now);
    osc.stop(now + 1.3);
  }, 480);
}
