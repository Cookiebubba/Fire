import * as THREE from 'three';
import { buildTankRig, type TankRigParts } from './tankRig';
import { TankAnimator } from './animator';
import { CharacterController } from './controller';
import { Hose, NOZZLE_MODES, type NozzleMode } from '../hose/hose';
import type { WaterSource } from '../hose/sources';
import type { WaterJet } from '../hose/water';
import type { Input } from '../core/input';
import type { CameraRig } from '../camera/cameraRig';
import type { Sfx } from '../audio/sfx';
import type { WireState } from '../net/p2p';
import { clamp, damp } from '../core/math';

/**
 * The local player: glues input → controller → animator → hose → water,
 * including the connect interaction and water-jump propulsion (§6).
 */

const INTERACT_RANGE = 2.0;
const INTERACT_DURATION = 0.9;

export interface PlayerEvents {
  /** Ask the arbitration layer (net or offline) for a source. */
  requestClaim: (sourceId: string) => void;
  requestRelease: (sourceId: string) => void;
  toast: (msg: string) => void;
}

export class LocalPlayer {
  rig: TankRigParts;
  animator: TankAnimator;
  controller: CharacterController;
  hose: Hose;

  spraying = false;
  /** Source we asked for and are waiting on (net round-trip). */
  pendingClaim: string | null = null;

  private interactT = -1;
  private interactAction: (() => void) | null = null;
  private interactFired = false;
  private crouchBlend = 0;
  private handPos = new THREE.Vector3();
  private tipPos = new THREE.Vector3();
  private aimDir = new THREE.Vector3();
  private tension = new THREE.Vector3();
  private thrust = new THREE.Vector3();
  private waterJumping = false;
  private lastAimPitch = 0;

  constructor(
    scene: THREE.Scene,
    colliders: THREE.Box3[],
    public readonly id: string,
    private events: PlayerEvents,
    private sfx: Sfx,
  ) {
    this.rig = buildTankRig();
    scene.add(this.rig.root);
    this.controller = new CharacterController(colliders);
    this.animator = new TankAnimator(this.rig);
    this.hose = new Hose(scene, id);

    this.controller.constrain = (p, v) => this.hose.constrainPosition(p, v);
    this.controller.onJump = () => {
      this.animator.notifyJump();
      this.sfx.jump();
    };
    this.animator.onFootstep = (i) => this.sfx.footstep(i);
  }

  get position(): THREE.Vector3 {
    return this.controller.position;
  }

  /** Called by arbitration when our claim is granted. */
  onClaimGranted(source: WaterSource): void {
    if (this.pendingClaim !== source.id) return;
    this.pendingClaim = null;
    if (!this.hose.deployed) this.hose.toggleDeploy();
    this.beginInteraction(() => {
      this.rig.hoseAnchor.getWorldPosition(this.handPos);
      this.hose.attach(source, this.handPos);
      this.sfx.connectClunk();
      this.sfx.spoolUp();
    });
  }

  onClaimDenied(): void {
    this.pendingClaim = null;
    this.events.toast('Source already in use');
  }

  private beginInteraction(action: () => void): void {
    this.interactT = 0;
    this.interactFired = false;
    this.interactAction = action;
    this.controller.movementLocked = true;
    this.spraying = false;
  }

  private nearestSource(sources: WaterSource[]): WaterSource | null {
    let best: WaterSource | null = null;
    let bestD = INTERACT_RANGE;
    for (const s of sources) {
      const d = Math.min(
        s.interactPoint.distanceTo(this.position),
        s.anchor.distanceTo(this.position),
      );
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  /** What the prompt should read for the nearby source, if any. */
  promptFor(sources: WaterSource[]): { key: string; text: string } | null {
    if (this.interactT >= 0) return null;
    const near = this.nearestSource(sources);
    if (!near) {
      if (this.hose.connected) return null;
      return null;
    }
    if (this.hose.source?.id === near.id) return { key: 'E', text: `Disconnect from ${near.label}` };
    if (near.occupiedBy && near.occupiedBy !== this.id) return { key: 'E', text: `${near.label} in use` };
    if (this.hose.connected) return { key: 'E', text: `Switch line to ${near.label}` };
    return { key: 'E', text: `Connect to ${near.label}` };
  }

  update(
    dt: number,
    input: Input,
    camera: CameraRig,
    sources: WaterSource[],
    water: WaterJet,
  ): void {
    // ---------------- interaction timeline ----------------
    if (this.interactT >= 0) {
      this.interactT += dt / INTERACT_DURATION;
      if (this.interactT >= 0.55 && !this.interactFired) {
        this.interactFired = true;
        this.interactAction?.();
      }
      if (this.interactT >= 1) {
        this.interactT = -1;
        this.controller.movementLocked = false;
      }
    }

    // ---------------- discrete inputs ----------------
    if (input.pressed('KeyE') && this.interactT < 0) {
      const near = this.nearestSource(sources);
      if (near) {
        if (this.hose.source?.id === near.id) {
          const srcId = near.id;
          this.beginInteraction(() => {
            this.hose.detach();
            this.events.requestRelease(srcId);
            this.sfx.detach();
          });
        } else if (near.occupiedBy && near.occupiedBy !== this.id) {
          this.events.toast(`${near.label} is in use`);
        } else {
          if (this.hose.connected && this.hose.source) {
            this.events.requestRelease(this.hose.source.id);
            this.hose.detach();
          }
          this.pendingClaim = near.id;
          this.events.requestClaim(near.id);
        }
      }
    }

    if (input.pressed('KeyH') && this.interactT < 0) {
      if (this.hose.connected && this.hose.source) {
        this.events.requestRelease(this.hose.source.id);
        this.sfx.detach();
      }
      this.hose.toggleDeploy();
      this.sfx.uiClick();
    }

    if (input.pressed('KeyG') && this.hose.deployed) {
      if (this.hose.extend()) {
        this.sfx.extend();
        this.events.toast(`Hose length: ${this.hose.maxLength} m`);
      } else {
        this.events.toast('Line is at max length');
      }
    }

    if (input.pressed('Digit1')) this.hose.mode = 0;
    if (input.pressed('Digit2')) this.hose.mode = 1;
    if (input.pressed('Digit3')) this.hose.mode = 2;
    const wheel = input.consumeWheel();
    if (wheel !== 0) {
      this.hose.mode = ((this.hose.mode + wheel + 3) % 3) as NozzleMode;
      this.sfx.uiClick();
    }

    // ---------------- spray state ----------------
    this.spraying =
      input.mouseDown &&
      this.hose.connected &&
      this.interactT < 0 &&
      this.hose.pressure > 0.02;

    // ---------------- movement intent (camera-view relative) ----------------
    const fwd = new THREE.Vector2(-Math.sin(camera.yaw), -Math.cos(camera.yaw));
    const right = new THREE.Vector2(Math.cos(camera.yaw), -Math.sin(camera.yaw));
    const move = new THREE.Vector2();
    if (input.down('KeyW')) move.add(fwd);
    if (input.down('KeyS')) move.sub(fwd);
    if (input.down('KeyD')) move.add(right);
    if (input.down('KeyA')) move.sub(right);
    if (move.lengthSq() > 1) move.normalize();

    this.controller.update(dt, {
      move,
      jumpPressed: input.pressed('Space'),
      jumpHeld: input.down('Space'),
      sprint: input.down('ShiftLeft') || input.down('ShiftRight'),
      crouch: input.down('KeyC'),
      // model is built facing +Z; camera view dir is (-sin yaw, -cos yaw)
      aimYaw: camera.yaw + Math.PI,
      aiming: this.hose.deployed,
      hoseDrag: this.hose.drag,
    });

    // ---------------- hose physics on the player ----------------
    this.controller.addForce(this.hose.tensionForce(this.position, this.tension));

    // ---------------- water: emission, recoil, propulsion ----------------
    camera.aimDir(this.aimDir);
    if (this.spraying) {
      const p = this.hose.pressure;
      this.rig.root.updateMatrixWorld(true);
      this.rig.nozzleTip.getWorldPosition(this.tipPos);
      water.emit(this.tipPos, this.aimDir, this.hose.mode, p, dt);

      // recoil: planted boots absorb most of it; airborne it's a real shove
      const recoil = [1.2, 3.2, 7.5][this.hose.mode] * p * (this.controller.grounded ? 0.22 : 1);
      this.thrust.copy(this.aimDir).multiplyScalar(-recoil);
      this.controller.addForce(this.thrust);

      // WATER JUMP — blast aimed down rockets you up (§6); climb rate is
      // capped so it reads as a controlled launch, not free flight
      const aimingDown = this.aimDir.y < -0.72;
      if (this.hose.mode === 2 && aimingDown && p > 0.45 && this.controller.velocity.y < 6.5) {
        this.thrust.set(0, 34 * p, 0);
        this.controller.addForce(this.thrust);
        if (!this.waterJumping) {
          water.burst(this.position, 1.2);
          camera.addTrauma(0.35);
          this.waterJumping = true;
        }
        camera.addTrauma(dt * 1.2);
      } else {
        this.waterJumping = false;
      }
      if (this.hose.mode === 2) camera.addTrauma(dt * 0.35);
    } else {
      this.waterJumping = false;
    }

    // audio follows the water
    const src = this.hose.source;
    this.sfx.setSpray(this.spraying ? 1 : 0, this.hose.mode, this.hose.pressure);
    if (src?.sputtering && Math.random() < dt * 7) this.sfx.sputter();

    // ---------------- pose ----------------
    this.lastAimPitch = camera.pitch;
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.controller.yaw;

    this.crouchBlend = damp(this.crouchBlend, this.controller.crouching ? 1 : 0, 0.08, dt);

    this.animator.update(dt, {
      speed: this.controller.speedHorizontal,
      run01: clamp((this.controller.speedHorizontal - 2.0) / 2.2, 0, 1),
      grounded: this.controller.grounded,
      velY: this.controller.velocity.y,
      crouch01: this.crouchBlend,
      deployed: this.hose.deployed,
      aimPitch: camera.pitch,
      spraying: this.spraying,
      sprayPower: this.hose.mode,
      interactT: this.interactT,
      turnRate: this.controller.turnRate,
    });

    // first person: hide the head so the camera lives inside the helmet
    const fp = camera.firstPersonBlend > 0.6;
    for (const o of this.rig.firstPersonHidden) o.visible = !fp;

    // ---------------- rope follows the nozzle ----------------
    this.rig.root.updateMatrixWorld(true);
    this.rig.hoseAnchor.getWorldPosition(this.handPos);
    this.hose.update(dt, this.handPos);
  }

  /** Land event plumbing (camera shake + sfx wired in main). */
  bindLanding(onLand: (impact: number) => void): void {
    this.controller.onLand = (impact) => {
      this.animator.notifyLand(impact);
      this.sfx.land(clamp(impact / 9, 0.2, 1));
      onLand(impact);
    };
  }

  snapshot(): WireState {
    return {
      p: [this.position.x, this.position.y, this.position.z],
      v: [this.controller.velocity.x, this.controller.velocity.y, this.controller.velocity.z],
      yaw: this.controller.yaw,
      pitch: clamp(this.lastAimPitch, -1.45, 1.45),
      spd: this.controller.speedHorizontal,
      run: clamp((this.controller.speedHorizontal - 2.0) / 2.2, 0, 1),
      gnd: this.controller.grounded ? 1 : 0,
      cr: this.crouchBlend,
      dep: this.hose.deployed ? 1 : 0,
      spr: this.spraying ? 1 : 0,
      mode: this.hose.mode,
      src: this.hose.source?.id ?? null,
      len: this.hose.maxLength,
    };
  }

  /** HUD copy describing the current line. */
  hoseText(): string {
    if (!this.hose.deployed) return 'Hose holstered — H to deploy';
    if (!this.hose.connected) return `Nozzle out (${NOZZLE_MODES[this.hose.mode]}) — find a source`;
    const src = this.hose.source!;
    const cap = src.spec.capacity === Infinity ? 'mains' : `${Math.ceil(src.reservoir)} L`;
    return `${src.label} · ${this.hose.maxLength} m line · ${cap}`;
  }
}
