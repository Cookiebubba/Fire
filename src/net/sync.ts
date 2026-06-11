import * as THREE from 'three';
import { buildNameTag, buildTankRig, type TankRigParts } from '../character/tankRig';
import { TankAnimator } from '../character/animator';
import { Hose, MODE_DEMAND, type NozzleMode } from '../hose/hose';
import type { WaterSource } from '../hose/sources';
import type { WaterJet } from '../hose/water';
import type { WireState } from './p2p';
import { dampAngle, lerp } from '../core/math';

/**
 * Remote co-op players — full Tank rigs driven by interpolated network
 * state (~130 ms behind real time, like every respectable netcode), with
 * their own hose ropes and water simulated locally from synced intent.
 */

const INTERP_DELAY = 0.13;

interface Snapshot {
  time: number;
  s: WireState;
}

export class RemotePlayer {
  rig: TankRigParts;
  private animator: TankAnimator;
  private hose: Hose;
  private buffer: Snapshot[] = [];
  private latest: WireState | null = null;
  private yaw = 0;
  private interactT = -1;
  private aimDir = new THREE.Vector3();
  private handPos = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    public readonly id: string,
    name: string,
  ) {
    this.rig = buildTankRig();
    this.rig.root.add(buildNameTag(name));
    this.animator = new TankAnimator(this.rig);
    this.hose = new Hose(scene, id);
    scene.add(this.rig.root);
  }

  push(s: WireState, now: number): void {
    this.buffer.push({ time: now, s });
    if (this.buffer.length > 30) this.buffer.shift();
    this.latest = s;
  }

  /** Liters/sec this player is drawing from `sourceId`. */
  demandFor(sourceId: string): number {
    if (!this.latest || this.latest.src !== sourceId || !this.latest.spr) return 0;
    return MODE_DEMAND[this.latest.mode as NozzleMode];
  }

  update(dt: number, now: number, sources: Map<string, WaterSource>, water: WaterJet): void {
    if (!this.latest) return;
    const t = now - INTERP_DELAY;

    // find the two snapshots bracketing t
    let a = this.buffer[0];
    let b = this.buffer[this.buffer.length - 1];
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].time <= t && this.buffer[i + 1].time >= t) {
        a = this.buffer[i];
        b = this.buffer[i + 1];
        break;
      }
    }
    const span = Math.max(b.time - a.time, 1e-4);
    const f = Math.min(Math.max((t - a.time) / span, 0), 1.25); // mild extrapolation

    const root = this.rig.root;
    root.position.set(
      lerp(a.s.p[0], b.s.p[0], f),
      lerp(a.s.p[1], b.s.p[1], f),
      lerp(a.s.p[2], b.s.p[2], f),
    );
    this.yaw = dampAngle(this.yaw, b.s.yaw, 0.06, dt);
    root.rotation.y = this.yaw;

    const s = this.latest;

    // hose intent → local rope
    const src = s.src ? (sources.get(s.src) ?? null) : null;
    this.hose.mode = s.mode as NozzleMode;
    while (this.hose.maxLength < s.len && this.hose.canExtend) this.hose.extend();

    this.rig.root.updateMatrixWorld(true);
    this.rig.hoseAnchor.getWorldPosition(this.handPos);

    if (src && this.hose.source?.id !== s.src) {
      this.hose.attach(src, this.handPos);
      this.interactT = 0;
    } else if (!src && this.hose.connected) {
      this.hose.detach();
      this.interactT = 0;
    }
    if (this.hose.deployed !== (s.dep === 1)) this.hose.toggleDeploy();

    if (this.interactT >= 0) {
      this.interactT += dt / 0.9;
      if (this.interactT >= 1) this.interactT = -1;
    }

    this.animator.update(dt, {
      speed: s.spd,
      run01: s.run,
      grounded: s.gnd === 1,
      velY: s.v[1],
      crouch01: s.cr,
      deployed: s.dep === 1,
      aimPitch: s.pitch,
      spraying: s.spr === 1,
      sprayPower: s.mode,
      interactT: this.interactT,
      turnRate: 0,
    });

    this.rig.root.updateMatrixWorld(true);
    this.rig.hoseAnchor.getWorldPosition(this.handPos);
    this.hose.update(dt, this.handPos);

    // their water, simulated here from intent
    if (s.spr === 1 && this.hose.connected && this.hose.pressure > 0.02) {
      const tip = new THREE.Vector3();
      this.rig.nozzleTip.getWorldPosition(tip);
      const cp = Math.cos(s.pitch);
      this.aimDir.set(Math.sin(this.yaw) * cp, Math.sin(s.pitch), Math.cos(this.yaw) * cp);
      water.emit(tip, this.aimDir, this.hose.mode, this.hose.pressure, dt);
    }
  }

  dispose(): void {
    this.hose.dispose(this.scene);
    this.scene.remove(this.rig.root);
  }
}

export class RemotePlayers {
  readonly players = new Map<string, RemotePlayer>();
  private clock = 0;

  constructor(private scene: THREE.Scene) {}

  add(id: string, name: string): void {
    if (!this.players.has(id)) this.players.set(id, new RemotePlayer(this.scene, id, name));
  }

  remove(id: string): void {
    this.players.get(id)?.dispose();
    this.players.delete(id);
  }

  pushState(id: string, s: WireState): void {
    // states can arrive before the join event in rare orderings
    if (!this.players.has(id)) this.add(id, 'TANK-??');
    this.players.get(id)!.push(s, this.clock);
  }

  demandFor(sourceId: string): number {
    let d = 0;
    for (const p of this.players.values()) d += p.demandFor(sourceId);
    return d;
  }

  update(dt: number, sources: Map<string, WaterSource>, water: WaterJet): void {
    this.clock += dt;
    for (const p of this.players.values()) p.update(dt, this.clock, sources, water);
  }
}
