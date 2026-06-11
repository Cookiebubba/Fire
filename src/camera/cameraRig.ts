import * as THREE from 'three';
import { clamp, damp } from '../core/math';

/**
 * One rig, two views (§ user spec): collision-aware third-person orbit with a
 * shoulder offset, and a true first-person eye. V toggles; the camera flies
 * smoothly between them rather than snapping.
 */

const SENSITIVITY = 0.0023;
const TP_DISTANCE = 3.4;
const TP_SHOULDER = 0.45;
const TP_PIVOT_HEIGHT = 1.02;
const FP_EYE_STANDING = 0.98;
const FP_EYE_CROUCHED = 0.6;
const BASE_FOV = 62;

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  yaw = Math.PI; // start facing the yard
  pitch = -0.12;
  firstPerson = false;

  private blend = 0; // 0 = third person, 1 = first person
  private trauma = 0;
  private fov = BASE_FOV;
  private pivot = new THREE.Vector3();
  private shakeT = 0;
  private eyeHeight = FP_EYE_STANDING;

  constructor(aspect: number, private colliders: THREE.Box3[]) {
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.05, 220);
  }

  toggleView(): void {
    this.firstPerson = !this.firstPerson;
  }

  /** 0..1 — used to hide the head mesh near full first person. */
  get firstPersonBlend(): number {
    return this.blend;
  }

  addTrauma(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  applyLook(dx: number, dy: number): void {
    this.yaw -= dx * SENSITIVITY;
    this.pitch = clamp(this.pitch - dy * SENSITIVITY, -1.45, 1.45);
  }

  /** True view direction (matches Euler(pitch, yaw) camera orientation). */
  aimDir(out: THREE.Vector3): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    opts: { crouched: boolean; sprinting: boolean; sprayKick: number },
  ): void {
    this.blend = damp(this.blend, this.firstPerson ? 1 : 0, 0.07, dt);
    this.eyeHeight = damp(this.eyeHeight, opts.crouched ? FP_EYE_CROUCHED : FP_EYE_STANDING, 0.08, dt);

    // ---------- third-person pose ----------
    this.pivot.x = damp(this.pivot.x, playerPos.x, 0.035, dt);
    this.pivot.z = damp(this.pivot.z, playerPos.z, 0.035, dt);
    this.pivot.y = damp(this.pivot.y, playerPos.y + TP_PIVOT_HEIGHT, 0.07, dt);

    const view = this.aimDir(new THREE.Vector3());
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const desired = this.pivot
      .clone()
      .addScaledVector(view, -TP_DISTANCE)
      .addScaledVector(right, TP_SHOULDER)
      .add(new THREE.Vector3(0, 0.18, 0));

    // pull in when geometry blocks the boom
    const boom = desired.clone().sub(this.pivot);
    const boomLen = boom.length();
    boom.normalize();
    let dist = boomLen;
    for (const b of this.colliders) {
      const t = rayBox(this.pivot, boom, b);
      if (t !== null && t < dist) dist = Math.max(t - 0.18, 0.3);
    }
    if (desired.y < 0.15) desired.y = 0.15; // never under the ground
    const tpPos = this.pivot.clone().addScaledVector(boom, dist);
    if (tpPos.y < 0.15) tpPos.y = 0.15;

    // ---------- first-person pose ----------
    const fpPos = new THREE.Vector3(playerPos.x, playerPos.y + this.eyeHeight, playerPos.z);

    // ---------- blend + apply ----------
    const pos = tpPos.lerp(fpPos, this.blend);
    this.camera.position.copy(pos);

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // shake: smooth pseudo-noise driven by trauma²
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.shakeT += dt * 30;
    const s = this.trauma * this.trauma * 0.05;
    if (s > 0.0001) {
      this.camera.rotation.x += Math.sin(this.shakeT * 1.1) * s;
      this.camera.rotation.y += Math.sin(this.shakeT * 0.9 + 4.7) * s;
      this.camera.rotation.z += Math.sin(this.shakeT * 1.3 + 9.2) * s * 0.6;
    }

    // FOV juice
    const targetFov = BASE_FOV + (opts.sprinting ? 6 : 0) + opts.sprayKick * 4;
    this.fov = damp(this.fov, targetFov, 0.1, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

/** Slab-method ray vs AABB. Returns hit distance or null. */
function rayBox(origin: THREE.Vector3, dir: THREE.Vector3, box: THREE.Box3): number | null {
  let tmin = 0;
  let tmax = Infinity;
  for (const axis of ['x', 'y', 'z'] as const) {
    const o = origin[axis];
    const d = dir[axis];
    if (Math.abs(d) < 1e-8) {
      if (o < box.min[axis] || o > box.max[axis]) return null;
    } else {
      let t1 = (box.min[axis] - o) / d;
      let t2 = (box.max[axis] - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin > 0 ? tmin : null;
}
