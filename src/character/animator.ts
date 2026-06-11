import { Spring, clamp, damp, lerp, rand } from '../core/math';
import type { TankRigParts } from './tankRig';

/**
 * Procedural animation for the Stout Tank. No keyframe assets — every pose
 * is computed, which keeps remote players, future classes and recolors free.
 *
 * Layers (applied in order):
 *   1. locomotion      idle ⇄ walk ⇄ run cycles, phase-driven
 *   2. airborne        jump tuck / fall flail, blended by time off ground
 *   3. crouch          lowers hips, folds legs, pitches torso (smoke crawl)
 *   4. hose (upper)    two-handed nozzle grip tracking aim pitch + recoil
 *   5. interact        connect/disconnect wrench-twist, overrides arms
 *   6. squash          landing impact spring on torso scale
 */

export interface AnimContext {
  /** Horizontal speed, m/s. */
  speed: number;
  /** 0..1 walk→run blend. */
  run01: number;
  grounded: boolean;
  /** Vertical velocity, m/s. */
  velY: number;
  crouch01: number;
  /** Hose deployed → upper-body grip layer active. */
  deployed: boolean;
  /** Aim pitch in radians, positive = up. */
  aimPitch: number;
  spraying: boolean;
  /** 0 mist, 1 stream, 2 blast — recoil strength. */
  sprayPower: number;
  /** Connect interaction progress 0..1, or -1 when inactive. */
  interactT: number;
  /** Yaw turn rate rad/s for lean. */
  turnRate: number;
}

export class TankAnimator {
  private phase = 0;
  private airBlend = 0;
  private deployBlend = 0;
  private crouchBlend = 0;
  private squash = new Spring(1, 220, 16);
  private recoil = new Spring(0, 240, 18);
  private helmetLag = new Spring(0, 160, 12);
  private breathe = 0;
  private lastStepSide = 0;

  /** Fired when a foot plants — hook for SFX / dust. */
  onFootstep: ((intensity: number) => void) | null = null;

  constructor(private rig: TankRigParts) {}

  /** Landing impact — call from the controller with impact speed (m/s). */
  notifyLand(impactSpeed: number): void {
    this.squash.impulse(-clamp(impactSpeed * 0.5, 0.8, 4.5));
    this.helmetLag.impulse(clamp(impactSpeed * 0.25, 0.3, 1.4));
    this.onFootstep?.(clamp(impactSpeed / 8, 0.4, 1));
  }

  notifyJump(): void {
    this.squash.impulse(1.6);
    this.helmetLag.impulse(-0.8);
  }

  update(dt: number, ctx: AnimContext): void {
    const j = this.rig.joints;
    this.breathe += dt;

    // ---- blends -------------------------------------------------------
    this.airBlend = damp(this.airBlend, ctx.grounded ? 0 : 1, 0.06, dt);
    this.deployBlend = damp(this.deployBlend, ctx.deployed ? 1 : 0, 0.09, dt);
    this.crouchBlend = damp(this.crouchBlend, ctx.crouch01, 0.08, dt);

    const speed01 = clamp(ctx.speed / 3.2, 0, 1);
    const moveAmt = clamp(ctx.speed / 1.2, 0, 1); // reaches 1 quickly: walk fully animated

    // stride frequency scales with speed; crawling paddles faster + smaller
    const strideHz = lerp(1.6, 3.1, ctx.run01) * lerp(1, 1.35, this.crouchBlend);
    const prevPhase = this.phase;
    if (ctx.grounded && moveAmt > 0.05) this.phase += dt * Math.PI * 2 * strideHz * lerp(0.6, 1, speed01);

    // footstep events on each half-cycle
    const stepNow = Math.floor(this.phase / Math.PI);
    if (ctx.grounded && moveAmt > 0.3 && stepNow !== Math.floor(prevPhase / Math.PI) && stepNow !== this.lastStepSide) {
      this.lastStepSide = stepNow;
      this.onFootstep?.(lerp(0.25, 0.7, speed01));
    }

    const swing = Math.sin(this.phase);
    const swingB = Math.sin(this.phase + Math.PI);

    // ---- layer 1+2: legs ----------------------------------------------
    const legAmp = lerp(0.5, 0.95, ctx.run01) * moveAmt * lerp(1, 0.4, this.crouchBlend);
    const airLegL = -0.55 + clamp(-ctx.velY * 0.04, -0.25, 0.3);
    const airLegR = 0.3 + clamp(ctx.velY * 0.03, -0.2, 0.2);
    j.legL.rotation.x = lerp(swing * legAmp, airLegL, this.airBlend) + this.crouchBlend * 0.55;
    j.legR.rotation.x = lerp(swingB * legAmp, airLegR, this.airBlend) + this.crouchBlend * 0.55;

    // ---- hips: bob + crouch -------------------------------------------
    const bob =
      ctx.grounded && moveAmt > 0.05
        ? Math.abs(Math.sin(this.phase)) * lerp(0.012, 0.035, ctx.run01) * moveAmt
        : 0;
    const idleBreath = Math.sin(this.breathe * 1.7) * 0.004 * (1 - moveAmt);
    j.hips.position.y = 0.18 + bob + idleBreath - this.crouchBlend * 0.19;

    // ---- torso: lean, roll, squash ------------------------------------
    this.squash.update(dt);
    const sq = clamp(this.squash.value, 0.62, 1.25);
    j.torso.scale.set(1 + (1 - sq) * 0.55, sq, 1 + (1 - sq) * 0.55);

    const runLean = lerp(0, 0.14, ctx.run01) * moveAmt;
    const fallLean = this.airBlend * clamp(-ctx.velY * 0.012, -0.12, 0.18);
    const crouchPitch = this.crouchBlend * 0.42;
    let torsoPitch = runLean + fallLean + crouchPitch;
    let torsoRoll = Math.sin(this.phase) * 0.045 * moveAmt * (1 - this.airBlend) - clamp(ctx.turnRate * 0.05, -0.12, 0.12);

    // ---- layer 4: hose grip (upper body) ------------------------------
    this.recoil.target = 0;
    if (ctx.spraying) {
      const power = [0.25, 0.6, 1.0][Math.round(clamp(ctx.sprayPower, 0, 2))];
      this.recoil.impulse(dt * 60 * power * rand(0.5, 1) * 0.06);
      torsoPitch -= this.recoil.value * 0.5;
    }
    this.recoil.update(dt);

    const pitch = clamp(ctx.aimPitch, -1.1, 1.1);
    const d = this.deployBlend;

    // arm swing while holstered
    const armAmp = lerp(0.3, 0.65, ctx.run01) * moveAmt;
    const idleSwayL = Math.sin(this.breathe * 1.3) * 0.03;
    const freeL = { x: swingB * armAmp + idleSwayL, z: -0.16 };
    const freeR = { x: swing * armAmp - idleSwayL, z: 0.16 };
    const airArm = this.airBlend * 0.9;

    // two-handed nozzle grip: right arm drives, left supports underneath
    const gripRX = -Math.PI / 2 - pitch * 0.9 + this.recoil.value;
    const gripLX = -Math.PI / 2 - pitch * 0.9 + this.recoil.value * 0.7 + 0.18;

    j.shoulderR.rotation.x = lerp(freeR.x - airArm * 0.4, gripRX, d);
    j.shoulderR.rotation.z = lerp(freeR.z + airArm, -0.3 * d, d);
    j.shoulderL.rotation.x = lerp(freeL.x - airArm * 0.4, gripLX, d);
    j.shoulderL.rotation.z = lerp(freeL.z - airArm, 0.38 * d, d);
    j.shoulderR.rotation.y = lerp(0, -0.12, d);
    j.shoulderL.rotation.y = lerp(0, 0.3, d);

    // ---- layer 5: interact override ------------------------------------
    if (ctx.interactT >= 0) {
      const t = clamp(ctx.interactT, 0, 1);
      const kneel = Math.sin(Math.min(t * 1.3, 1) * Math.PI);
      j.hips.position.y -= kneel * 0.1;
      torsoPitch += kneel * 0.35;
      const wiggle = t > 0.25 && t < 0.85 ? Math.sin(t * 34) * 0.18 : 0;
      j.shoulderR.rotation.x = -1.15 + wiggle;
      j.shoulderR.rotation.z = -0.1;
      j.shoulderR.rotation.y = wiggle * 0.5;
      j.shoulderL.rotation.x = -0.25;
      j.shoulderL.rotation.z = 0.3;
    }

    j.torso.rotation.x = damp(j.torso.rotation.x, torsoPitch, 0.05, dt);
    j.torso.rotation.z = damp(j.torso.rotation.z, torsoRoll, 0.07, dt);

    // ---- head + helmet bobble ------------------------------------------
    j.head.rotation.x = damp(j.head.rotation.x, -pitch * 0.45 * d - this.crouchBlend * 0.25, 0.06, dt);
    this.helmetLag.target = 0;
    this.helmetLag.update(dt);
    j.helmet.rotation.x = clamp(this.helmetLag.value, -0.4, 0.4) * 0.35 - j.head.rotation.x * 0.3;

    // nozzle + coil visibility follows deploy state
    this.rig.nozzle.visible = this.deployBlend > 0.25;
    this.rig.hipCoil.visible = this.deployBlend < 0.75;
  }
}
