import * as THREE from 'three';
import { clamp } from '../core/math';
import { RopeMesh, VerletRope } from './rope';
import type { WaterSource } from './sources';

/**
 * The hose — signature mechanic (§6). Carried as an item: deploy it to grip
 * the nozzle, connect it to a source to get water. Length is freedom *and*
 * burden: more reach, more drag, and the line goes taut at its limit.
 */

export type NozzleMode = 0 | 1 | 2;
export const NOZZLE_MODES = ['mist', 'stream', 'blast'] as const;

/** Liters/sec drawn per nozzle mode at full pressure. */
export const MODE_DEMAND: Record<NozzleMode, number> = { 0: 3, 1: 8, 2: 16 };

const BASE_LENGTH = 12;
const SEGMENT_LENGTH = 4;
const MAX_LENGTH = 28;
const MAX_ROPE_POINTS = Math.ceil(MAX_LENGTH / 0.34) + 4;

export type HoseState = 'holstered' | 'deployed' | 'connected';

export class Hose {
  state: HoseState = 'holstered';
  source: WaterSource | null = null;
  mode: NozzleMode = 1;
  maxLength = BASE_LENGTH;

  private rope: VerletRope | null = null;
  private ropeMesh: RopeMesh;
  private tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene, public ownerId: string) {
    this.ropeMesh = new RopeMesh(MAX_ROPE_POINTS);
    scene.add(this.ropeMesh.mesh);
  }

  get deployed(): boolean {
    return this.state !== 'holstered';
  }
  get connected(): boolean {
    return this.state === 'connected';
  }

  /** Pressure at the nozzle: source pressure with a mild length falloff. */
  get pressure(): number {
    if (!this.connected || !this.source) return 0;
    const falloff = 1 - clamp((this.maxLength - BASE_LENGTH) / (MAX_LENGTH - BASE_LENGTH), 0, 1) * 0.22;
    return this.source.pressure * falloff;
  }

  /** Movement penalty 0..1 from dragging the line (§6). */
  get drag(): number {
    if (!this.connected || !this.rope) return 0;
    const lengthBurden = clamp(this.maxLength / MAX_LENGTH, 0, 1) * 0.45;
    const tautBurden = this.rope.tautness() > 0.9 ? 0.3 : 0;
    return lengthBurden + tautBurden;
  }

  get canExtend(): boolean {
    return this.maxLength + SEGMENT_LENGTH <= MAX_LENGTH;
  }

  toggleDeploy(): void {
    if (this.state === 'holstered') {
      this.state = 'deployed';
    } else {
      this.detach();
      this.state = 'holstered';
    }
  }

  /**
   * Build the line to a source. Occupancy arbitration happens outside
   * (host-authoritative in co-op) — this only manages the rope.
   */
  attach(source: WaterSource, handPos: THREE.Vector3): void {
    this.detach();
    this.source = source;
    this.state = 'connected';
    this.rope = new VerletRope(source.anchor, handPos, this.maxLength);
  }

  detach(): void {
    this.source = null;
    this.rope = null;
    this.ropeMesh.hide();
    if (this.state === 'connected') this.state = 'deployed';
  }

  /** Couple a spare segment on — more reach, more drag. */
  extend(): boolean {
    if (!this.canExtend) return false;
    this.maxLength += SEGMENT_LENGTH;
    this.rope?.extend(SEGMENT_LENGTH);
    return true;
  }

  /** Water drawn this frame (liters/sec) given spray state. */
  demand(spraying: boolean): number {
    return spraying && this.connected ? MODE_DEMAND[this.mode] * clamp(this.pressure, 0, 1) : 0;
  }

  /**
   * Soft pull on the player as the line approaches its limit, then the
   * controller's hard constraint takes over.
   */
  tensionForce(playerPos: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    out.set(0, 0, 0);
    if (!this.connected || !this.source) return out;
    const d = this.tmp.subVectors(this.source.anchor, playerPos);
    const dist = d.length();
    const slack = this.maxLength * 0.92;
    if (dist > slack) {
      const over = (dist - slack) / (this.maxLength - slack);
      out.copy(d.normalize()).multiplyScalar(clamp(over, 0, 1) * 26);
    }
    return out;
  }

  /** Hard position clamp for the character controller. */
  constrainPosition(pos: THREE.Vector3, vel: THREE.Vector3): void {
    if (!this.connected || !this.source) return;
    const a = this.source.anchor;
    const dx = pos.x - a.x;
    const dy = pos.y + 0.6 - a.y;
    const dz = pos.z - a.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const limit = this.maxLength + 0.4;
    if (dist > limit) {
      const s = limit / dist;
      pos.x = a.x + dx * s;
      pos.y = Math.max(a.y + dy * s - 0.6, 0);
      pos.z = a.z + dz * s;
      // kill outward velocity along the rope direction
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;
      const outward = vel.x * nx + vel.y * ny + vel.z * nz;
      if (outward > 0) {
        vel.x -= nx * outward;
        vel.y -= ny * outward;
        vel.z -= nz * outward;
      }
    }
  }

  /** @param handPos world position of the nozzle's hose anchor */
  update(dt: number, handPos: THREE.Vector3): void {
    if (this.rope && this.source) {
      this.rope.update(dt, this.source.anchor, handPos);
      this.ropeMesh.update(this.rope.points);
    }
  }

  dispose(scene: THREE.Scene): void {
    this.detach();
    scene.remove(this.ropeMesh.mesh);
  }
}
