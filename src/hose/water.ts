import * as THREE from 'three';
import { rand } from '../core/math';
import type { NozzleMode } from './hose';

/**
 * Water jet — pooled CPU particles rendered as soft round point sprites.
 * Three personalities (§6): mist is a wide cool cloud, stream is the honest
 * working arc, blast is a fire-killing piston. Droplets burst into foam
 * splashes on the ground. Snappy and readable, never fog (§9.4).
 */

const CAPACITY = 6000;

// kind: 0 droplet, 1 mist, 2 splash foam
const KIND_DROPLET = 0;
const KIND_MIST = 1;
const KIND_SPLASH = 2;

interface ModeTuning {
  rate: number; // particles/sec at pressure 1
  speed: number;
  spread: number;
  life: number;
  size: number;
  kind: number;
}

const MODES: Record<NozzleMode, ModeTuning> = {
  0: { rate: 900, speed: 5.0, spread: 0.4, life: 1.1, size: 0.6, kind: KIND_MIST },
  1: { rate: 520, speed: 14.5, spread: 0.055, life: 1.6, size: 0.42, kind: KIND_DROPLET },
  2: { rate: 760, speed: 21.0, spread: 0.034, life: 1.5, size: 0.5, kind: KIND_DROPLET },
};

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute float aKind;
varying float vAlpha;
varying float vKind;
void main() {
  vAlpha = aAlpha;
  vKind = aKind;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aSize * (160.0 / -mv.z), 72.0);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
precision mediump float;
varying float vAlpha;
varying float vKind;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float soft = vKind > 0.5 && vKind < 1.5 ? 0.5 : 0.18;
  float a = (1.0 - smoothstep(0.5 - soft, 0.5, d)) * vAlpha;
  if (a < 0.01) discard;
  vec3 water = vec3(0.46, 0.68, 0.79);
  vec3 foam  = vec3(0.93, 0.96, 0.97);
  vec3 col = vKind > 1.5 ? foam : mix(foam, water, smoothstep(0.0, 0.25, d));
  if (vKind > 0.5 && vKind < 1.5) col = mix(water, foam, 0.35);
  gl_FragColor = vec4(col, a);
}
`;

export class WaterJet {
  points: THREE.Points;

  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private kind: Float32Array;
  private cursor = 0;
  private spawnRemainder = 0;

  private geo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.pos = new Float32Array(CAPACITY * 3);
    this.vel = new Float32Array(CAPACITY * 3);
    this.life = new Float32Array(CAPACITY);
    this.maxLife = new Float32Array(CAPACITY);
    this.size = new Float32Array(CAPACITY);
    this.alpha = new Float32Array(CAPACITY);
    this.kind = new Float32Array(CAPACITY);

    // park dead particles far underground
    for (let i = 0; i < CAPACITY; i++) this.pos[i * 3 + 1] = -100;

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute('aKind', new THREE.BufferAttribute(this.kind, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geo, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  private spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    life: number, size: number, alpha: number, kind: number,
  ): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % CAPACITY;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.alpha[i] = alpha;
    this.kind[i] = kind;
  }

  /**
   * Emit from the nozzle for one frame.
   * @param pressure 0..1 — scales speed, rate, reach
   */
  emit(tip: THREE.Vector3, dir: THREE.Vector3, mode: NozzleMode, pressure: number, dt: number): void {
    if (pressure <= 0.02) return;
    const t = MODES[mode];

    this.spawnRemainder += t.rate * Math.min(pressure * 1.4, 1) * dt;
    let count = Math.floor(this.spawnRemainder);
    this.spawnRemainder -= count;

    // weak pressure = pathetic dribble (low speed, droopy) — reads instantly
    const speed = t.speed * (0.25 + 0.75 * pressure);

    while (count-- > 0) {
      const sx = dir.x + rand(-1, 1) * t.spread;
      const sy = dir.y + rand(-1, 1) * t.spread;
      const sz = dir.z + rand(-1, 1) * t.spread;
      const inv = 1 / Math.hypot(sx, sy, sz);
      const v = speed * rand(0.85, 1.1);
      this.spawn(
        tip.x + rand(-0.02, 0.02),
        tip.y + rand(-0.02, 0.02),
        tip.z + rand(-0.02, 0.02),
        sx * inv * v,
        sy * inv * v,
        sz * inv * v,
        t.life * rand(0.7, 1),
        t.size * rand(0.8, 1.3),
        t.kind === KIND_MIST ? 0.16 : 0.85,
        t.kind,
      );
    }
  }

  /** Foam burst — connect moments, splashdowns, water-jump exhaust. */
  burst(at: THREE.Vector3, intensity: number): void {
    const n = Math.round(14 * intensity);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(0.5, 2.2) * intensity;
      this.spawn(
        at.x, at.y + 0.05, at.z,
        Math.cos(a) * r, rand(1, 3.4) * intensity, Math.sin(a) * r,
        rand(0.25, 0.5), rand(0.5, 0.9), 0.9, KIND_SPLASH,
      );
    }
  }

  /** Dev diagnostics: live particle count and speed range. */
  stats(): { alive: number; maxSpeed: number; meanSpeed: number } {
    let alive = 0;
    let maxSpeed = 0;
    let sum = 0;
    for (let i = 0; i < CAPACITY; i++) {
      if (this.life[i] <= 0) continue;
      alive++;
      const s = Math.hypot(this.vel[i * 3], this.vel[i * 3 + 1], this.vel[i * 3 + 2]);
      maxSpeed = Math.max(maxSpeed, s);
      sum += s;
    }
    return { alive, maxSpeed, meanSpeed: alive ? sum / alive : 0 };
  }

  update(dt: number): void {
    for (let i = 0; i < CAPACITY; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -100;
        this.alpha[i] = 0;
        continue;
      }

      const k = this.kind[i];
      const gravity = k === KIND_MIST ? 1.2 : k === KIND_SPLASH ? 9 : 15;
      this.vel[i * 3 + 1] -= gravity * dt;
      if (k === KIND_MIST) {
        // mist drifts and slows
        this.vel[i * 3] *= 1 - dt * 1.8;
        this.vel[i * 3 + 1] *= 1 - dt * 1.8;
        this.vel[i * 3 + 2] *= 1 - dt * 1.8;
        this.size[i] += dt * 1.1;
      }

      let x = this.pos[i * 3] + this.vel[i * 3] * dt;
      let y = this.pos[i * 3 + 1] + this.vel[i * 3 + 1] * dt;
      let z = this.pos[i * 3 + 2] + this.vel[i * 3 + 2] * dt;

      // ground hit → splash
      if (y < 0.03 && this.vel[i * 3 + 1] < 0) {
        if (k === KIND_DROPLET && this.life[i] > 0.2) {
          const vy = -this.vel[i * 3 + 1];
          this.life[i] = rand(0.15, 0.35);
          this.maxLife[i] = this.life[i];
          this.kind[i] = KIND_SPLASH;
          this.vel[i * 3] = rand(-1, 1) * vy * 0.12;
          this.vel[i * 3 + 1] = vy * rand(0.1, 0.28);
          this.vel[i * 3 + 2] = rand(-1, 1) * vy * 0.12;
          this.size[i] *= 1.5;
          y = 0.03;
        } else {
          y = 0.03;
          this.vel[i * 3 + 1] = 0;
          this.vel[i * 3] *= 0.8;
          this.vel[i * 3 + 2] *= 0.8;
        }
      }

      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;

      const lifeFrac = this.life[i] / this.maxLife[i];
      if (k === KIND_MIST) this.alpha[i] = 0.16 * lifeFrac;
      else if (k === KIND_SPLASH) this.alpha[i] = 0.9 * lifeFrac;
      else this.alpha[i] = 0.85 * Math.min(1, lifeFrac * 3);
    }

    (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('aKind') as THREE.BufferAttribute).needsUpdate = true;
  }
}
