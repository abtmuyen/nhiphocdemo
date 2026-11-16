const SOUND_STORAGE_KEY = 'nhiphoc_sound_enabled';

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // ignore storage restrictions
  }
}

function playTone(
  ctx: AudioContext,
  startTime: number,
  freqStart: number,
  freqEnd: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), startTime + duration);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.015);
}

export function playClickSound(): void {
  if (!isSoundEnabled()) return;
  const nowMs = Date.now();
  if (nowMs - lastPlayedAt < 55) return;
  lastPlayedAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    playTone(ctx, ctx.currentTime, 520, 740, 0.055, 0.055, 'triangle');
  } catch {
    // ignore
  }
}

export function playMascotSound(mood?: string): void {
  if (!isSoundEnabled()) return;
  lastPlayedAt = Date.now();

  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  try {
    if (mood === 'relax') {
      playTone(ctx, t, 523.25, 440, 0.14, 0.06, 'sine');
      playTone(ctx, t + 0.09, 392, 349.23, 0.16, 0.05, 'sine');
    } else if (mood === 'surprised') {
      playTone(ctx, t, 587.33, 880, 0.09, 0.07, 'triangle');
      playTone(ctx, t + 0.07, 880, 1046.5, 0.11, 0.065, 'sine');
    } else {
      playTone(ctx, t, 587.33, 783.99, 0.08, 0.065, 'sine');
      playTone(ctx, t + 0.065, 783.99, 987.77, 0.11, 0.06, 'triangle');
    }
  } catch {
    // ignore
  }
}

export function playToastSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  try {
    playTone(ctx, t, 587.33, 587.33, 0.18, 0.07, 'sine');
    playTone(ctx, t + 0.09, 880, 880, 0.22, 0.07, 'sine');
  } catch {
    // ignore
  }
}

export function playSuccessSound(): void {
  if (!isSoundEnabled()) return;
  lastPlayedAt = Date.now();
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  try {
    playTone(ctx, t, 523.25, 523.25, 0.1, 0.06, 'sine');
    playTone(ctx, t + 0.08, 659.25, 659.25, 0.1, 0.06, 'sine');
    playTone(ctx, t + 0.16, 783.99, 1046.5, 0.18, 0.07, 'triangle');
  } catch {
    // ignore
  }
}
