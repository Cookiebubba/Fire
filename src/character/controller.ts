import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/math';

/**
 * Kinematic character controller tuned for "snappy and weighty" (§9.7).
 * Vertical cylinder vs. static AABBs + flat ground — grid-based levels
 * read as fair, and so should the collision (§9.4).
 */

export interface MoveIntent {
  /** Camera-relative move, already normalized. */
  move: THREE.Vector2;
  jumpPressed: boolean;
  jumpHeld: boolean;
  sprint: boolean;
  crouch: boolean;
  /** Model faces this yaw when aiming the hose; otherwise faces velocity. */
  aimYaw: number;
  aiming: boolean;
  /** 0..1 movement penalty from dragging hose (§6). */
  hoseDrag: number;
}

const WALK_SPEED = 2.3;
const SPRINT_SPEED = 4.3;
const CROUCH_SPEED = 1.15;
const GROUND_ACCEL = 30;
const AIR_ACCEL = 11;
const GRAVITY = 22;
const JUMP_SPEED = 7.1; // ≈1.15 m apex — clears a 1 m ledge with authority
const COYOTE = 0.12;
const JUMP_BUFFER = 0.14;
const TERMINAL = 18;

export const PLAYER_RADIUS = 0.34;
export const PLAYER_HEIGHT = 1.2;
const CROUCH_HEIGHT = 0.78;

export class CharacterController {
  position = new THREE.Vector3(0, 0, 0);
  velocity = new THREE.Vector3();
  /** Model facing (rad). */
  yaw = 0;
  turnRate = 0;
  grounded = true;
  crouching = false;
  /** Set true while the connect interaction plays — locks movement. */
  movementLocked = false;

  private coyote = 0;
  private buffer = 0;
  private jumpCut = false;
  private extForce = new THREE.Vector3();

  onJump: (() => void) | null = null;
  onLand: ((impactSpeed: number) => void) | null = null;
  /** Optional positional constraint (hose length limit). */
  constrain: ((pos: THREE.Vector3, vel: THREE.Vector3) => void) | null = null;

  constructor(private colliders: THREE.Box3[]) {}

  get height(): number {
    return this.crouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
  }

  get speedHorizontal(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Accumulate an external acceleration for this frame (water thrust, hose tug). */
  addForce(f: THREE.Vector3): void {
    this.extForce.add(f);
  }

  update(dt: number, intent: MoveIntent): void {
    const wasGrounded = this.grounded;
    const fallSpeed = -this.velocity.y;

    // ---- crouch (stand up only with headroom) --------------------------
    if (intent.crouch && !this.crouching) this.crouching = true;
    else if (!intent.crouch && this.crouching && this.headroomClear()) this.crouching = false;

    // ---- horizontal drive ----------------------------------------------
    const drag = clamp(intent.hoseDrag, 0, 1);
    let maxSpeed = this.crouching ? CROUCH_SPEED : intent.sprint ? SPRINT_SPEED : WALK_SPEED;
    maxSpeed *= 1 - drag * 0.45;

    const wishX = intent.move.x * maxSpeed;
    const wishZ = intent.move.y * maxSpeed;
    const accel = (this.grounded ? GROUND_ACCEL : AIR_ACCEL) * (this.movementLocked ? 0 : 1);
    this.velocity.x = damp(this.velocity.x, this.movementLocked ? 0 : wishX, 1 / (accel / 8), dt);
    this.velocity.z = damp(this.velocity.z, this.movementLocked ? 0 : wishZ, 1 / (accel / 8), dt);

    // ---- jump: buffer + coyote + variable height ------------------------
    this.coyote = this.grounded ? COYOTE : Math.max(0, this.coyote - dt);
    this.buffer = intent.jumpPressed ? JUMP_BUFFER : Math.max(0, this.buffer - dt);

    if (this.buffer > 0 && this.coyote > 0 && !this.movementLocked && !this.crouching) {
      this.velocity.y = JUMP_SPEED;
      this.grounded = false;
      this.coyote = 0;
      this.buffer = 0;
      this.jumpCut = false;
      this.onJump?.();
    }
    // releasing jump while rising cuts the arc — tap-jump vs. held-jump
    if (!intent.jumpHeld && this.velocity.y > 2 && !this.jumpCut) {
      this.velocity.y *= 0.5;
      this.jumpCut = true;
    }

    // ---- gravity + external forces --------------------------------------
    this.velocity.y -= GRAVITY * dt;
    this.velocity.addScaledVector(this.extForce, dt);
    this.extForce.set(0, 0, 0);
    this.velocity.y = clamp(this.velocity.y, -TERMINAL, 30);

    // ---- integrate + collide ---------------------------------------------
    this.position.addScaledVector(this.velocity, dt);
    this.grounded = false;
    this.collide();

    if (this.position.y <= 0) {
      this.position.y = 0;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.grounded = true;
    }

    this.constrain?.(this.position, this.velocity);

    if (!wasGrounded && this.grounded && fallSpeed > 1.5) this.onLand?.(fallSpeed);

    // ---- facing -----------------------------------------------------------
    const prevYaw = this.yaw;
    if (intent.aiming) {
      this.yaw = dampAngle(this.yaw, intent.aimYaw, 0.05, dt);
    } else if (this.speedHorizontal > 0.4) {
      this.yaw = dampAngle(this.yaw, Math.atan2(this.velocity.x, this.velocity.z), 0.08, dt);
    }
    this.turnRate = dt > 0 ? (this.yaw - prevYaw) / dt : 0;
  }

  private headroomClear(): boolean {
    const head = new THREE.Box3(
      new THREE.Vector3(this.position.x - PLAYER_RADIUS * 0.8, this.position.y + CROUCH_HEIGHT, this.position.z - PLAYER_RADIUS * 0.8),
      new THREE.Vector3(this.position.x + PLAYER_RADIUS * 0.8, this.position.y + PLAYER_HEIGHT + 0.05, this.position.z + PLAYER_RADIUS * 0.8),
    );
    return !this.colliders.some((b) => b.intersectsBox(head));
  }

  private collide(): void {
    const p = this.position;
    const r = PLAYER_RADIUS;
    const h = this.height;

    for (const b of this.colliders) {
      // overlap test: cylinder approximated by an expanded AABB
      if (
        p.x + r <= b.min.x || p.x - r >= b.max.x ||
        p.z + r <= b.min.z || p.z - r >= b.max.z ||
        p.y >= b.max.y || p.y + h <= b.min.y
      ) {
        continue;
      }

      const pushUp = b.max.y - p.y;
      const pushDown = p.y + h - b.min.y;
      const pushXPos = b.max.x - (p.x - r);
      const pushXNeg = p.x + r - b.min.x;
      const pushZPos = b.max.z - (p.z - r);
      const pushZNeg = p.z + r - b.min.z;
      const minHoriz = Math.min(pushXPos, pushXNeg, pushZPos, pushZNeg);

      // land on top when falling onto it (or barely inside it)
      if (pushUp < Math.min(pushDown, minHoriz) || (this.velocity.y <= 0 && pushUp < 0.3)) {
        p.y = b.max.y;
        if (this.velocity.y < 0) this.velocity.y = 0;
        this.grounded = true;
      } else if (pushDown < minHoriz) {
        p.y = b.min.y - h;
        if (this.velocity.y > 0) this.velocity.y = 0;
      } else if (minHoriz === pushXPos) {
        p.x = b.max.x + r;
        if (this.velocity.x < 0) this.velocity.x = 0;
      } else if (minHoriz === pushXNeg) {
        p.x = b.min.x - r;
        if (this.velocity.x > 0) this.velocity.x = 0;
      } else if (minHoriz === pushZPos) {
        p.z = b.max.z + r;
        if (this.velocity.z < 0) this.velocity.z = 0;
      } else {
        p.z = b.min.z - r;
        if (this.velocity.z > 0) this.velocity.z = 0;
      }
    }
  }
}
