import * as THREE from 'three';

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Frame-rate independent exponential smoothing. `halflife` in seconds. */
export const damp = (current: number, target: number, halflife: number, dt: number): number =>
  lerp(current, target, 1 - Math.pow(2, -dt / Math.max(halflife, 1e-5)));

export const dampAngle = (current: number, target: number, halflife: number, dt: number): number => {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.pow(2, -dt / Math.max(halflife, 1e-5)));
};

export const dampV3 = (current: THREE.Vector3, target: THREE.Vector3, halflife: number, dt: number): void => {
  const t = 1 - Math.pow(2, -dt / Math.max(halflife, 1e-5));
  current.lerp(target, t);
};

/**
 * Critically-damped spring used for juicy squash/recoil values.
 * Integrates toward `target`; call update(dt) each frame, read `.value`.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  constructor(value = 0, public stiffness = 120, public damping = 14) {
    this.value = value;
    this.target = value;
  }
  /** Instant kick, e.g. landing impact. */
  impulse(v: number): void {
    this.velocity += v;
  }
  update(dt: number): number {
    // semi-implicit Euler keeps this stable at 60 Hz fixed step
    const accel = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
    this.velocity += accel * dt;
    this.value += this.velocity * dt;
    return this.value;
  }
}

/** Deterministic-ish small RNG helpers for visual jitter. */
export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

export const randDir = (out: THREE.Vector3, spread: number): THREE.Vector3 => {
  out.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(spread * Math.random());
  return out;
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
