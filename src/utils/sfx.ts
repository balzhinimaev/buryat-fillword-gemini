type SfxType = 'select' | 'wood' | 'success' | 'error' | 'win' | 'timeout';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

function beep(ctx: AudioContext, at: number, freq: number, duration: number, gain = 0.05, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);

  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(g);
  g.connect(ctx.destination);

  osc.start(at);
  osc.stop(at + duration + 0.02);
}

function woodTap(ctx: AudioContext, at: number, gain = 0.035) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.03);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (bufferSize * 0.2));
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(850, at);
  band.Q.value = 0.9;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);

  src.connect(band);
  band.connect(g);
  g.connect(ctx.destination);

  // body resonance
  beep(ctx, at, 230, 0.035, gain * 0.5, 'triangle');

  src.start(at);
  src.stop(at + 0.045);
}

export function playSfx(type: SfxType, enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }

  const t = ctx.currentTime + 0.005;

  switch (type) {
    case 'select':
      beep(ctx, t, 520, 0.05, 0.02, 'triangle');
      break;
    case 'wood':
      woodTap(ctx, t, 0.028);
      break;
    case 'success':
      beep(ctx, t, 660, 0.08, 0.045, 'triangle');
      beep(ctx, t + 0.07, 880, 0.1, 0.05, 'triangle');
      break;
    case 'error':
      beep(ctx, t, 220, 0.08, 0.045, 'sawtooth');
      beep(ctx, t + 0.06, 180, 0.1, 0.04, 'sawtooth');
      break;
    case 'win':
      beep(ctx, t, 523.25, 0.09, 0.045, 'triangle');
      beep(ctx, t + 0.08, 659.25, 0.11, 0.05, 'triangle');
      beep(ctx, t + 0.18, 783.99, 0.14, 0.055, 'triangle');
      break;
    case 'timeout':
      beep(ctx, t, 280, 0.12, 0.04, 'square');
      beep(ctx, t + 0.11, 210, 0.16, 0.035, 'square');
      break;
  }
}
