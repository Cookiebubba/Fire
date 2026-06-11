/**
 * Procedural audio — every sound is synthesized, no assets. Water is
 * filtered noise whose color follows pressure and nozzle mode; impacts are
 * tuned thuds; the connect clunk + pressure spool sell the signature moment.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private sprayGain: GainNode | null = null;
  private sprayFilter: BiquadFilterNode | null = null;
  private sprayLow: BiquadFilterNode | null = null;

  muted = false;

  /** Must be called from a user gesture. */
  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    // 2 s of white noise, looped for everything fluid
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // persistent spray loop: noise → bandpass → lowpass → gain
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.sprayFilter = this.ctx.createBiquadFilter();
    this.sprayFilter.type = 'bandpass';
    this.sprayFilter.frequency.value = 1400;
    this.sprayFilter.Q.value = 0.8;
    this.sprayLow = this.ctx.createBiquadFilter();
    this.sprayLow.type = 'lowpass';
    this.sprayLow.frequency.value = 6000;
    this.sprayGain = this.ctx.createGain();
    this.sprayGain.gain.value = 0;
    src.connect(this.sprayFilter).connect(this.sprayLow).connect(this.sprayGain).connect(this.master);
    src.start();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  /** Drive the looped water sound. mode: 0 mist, 1 stream, 2 blast. */
  setSpray(intensity: number, mode: number, pressure: number): void {
    if (!this.ctx || !this.sprayGain || !this.sprayFilter || !this.sprayLow) return;
    const t = this.ctx.currentTime;
    const target = intensity * (0.1 + pressure * 0.35) * [0.5, 0.85, 1.15][mode];
    this.sprayGain.gain.setTargetAtTime(target, t, 0.05);
    const freq = [3200, 1500, 900][mode] * (0.6 + pressure * 0.5);
    this.sprayFilter.frequency.setTargetAtTime(freq, t, 0.08);
    this.sprayLow.frequency.setTargetAtTime(2500 + pressure * 5500, t, 0.08);
  }

  private burst(opts: { dur: number; freq: number; q?: number; gain: number; type?: BiquadFilterType }): void {
    if (!this.ctx || !this.noiseBuf || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = this.ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.value = opts.freq;
    f.Q.value = opts.q ?? 1;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(opts.gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + opts.dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + opts.dur + 0.05);
  }

  private tone(freq: number, endFreq: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  footstep(intensity: number): void {
    this.burst({ dur: 0.09, freq: 220 + Math.random() * 120, gain: 0.16 * intensity, type: 'lowpass' });
  }

  jump(): void {
    this.burst({ dur: 0.18, freq: 900, q: 2, gain: 0.08 });
    this.tone(240, 420, 0.14, 0.05, 'triangle');
  }

  land(intensity: number): void {
    this.tone(110, 60, 0.16, 0.2 * intensity);
    this.burst({ dur: 0.12, freq: 300, gain: 0.14 * intensity, type: 'lowpass' });
  }

  /** Metallic coupling clunk. */
  connectClunk(): void {
    this.tone(520, 180, 0.12, 0.22, 'square');
    this.tone(340, 120, 0.2, 0.14, 'triangle');
    this.burst({ dur: 0.1, freq: 2400, q: 3, gain: 0.1 });
  }

  /** Pressure spool — rising whine into the line. */
  spoolUp(): void {
    this.tone(160, 640, 0.9, 0.07, 'sawtooth');
    this.burst({ dur: 0.9, freq: 800, q: 0.7, gain: 0.06 });
  }

  detach(): void {
    this.tone(420, 150, 0.16, 0.16, 'square');
    this.burst({ dur: 0.25, freq: 1400, q: 0.8, gain: 0.12 });
  }

  sputter(): void {
    this.burst({ dur: 0.07, freq: 600 + Math.random() * 600, q: 2.5, gain: 0.1 });
  }

  uiClick(): void {
    this.tone(660, 520, 0.07, 0.08, 'triangle');
  }

  extend(): void {
    this.tone(300, 480, 0.12, 0.1, 'triangle');
    this.burst({ dur: 0.08, freq: 1800, q: 2, gain: 0.07 });
  }

  peerJoin(): void {
    this.tone(440, 660, 0.12, 0.09, 'triangle');
    this.tone(660, 880, 0.14, 0.07, 'triangle');
  }
}
