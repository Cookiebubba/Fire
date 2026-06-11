import * as THREE from 'three';
import { Spring, clamp } from '../core/math';

/**
 * Water sources (§6): the hydrant is street power — high pressure, endless.
 * The spigot taps building plumbing — gentler, and the tank runs dry.
 * Pressure spools up with an underdamped spring so connecting has that
 * satisfying turbo-spool overshoot.
 */

export type SourceKind = 'hydrant' | 'spigot';

export interface SourceSpec {
  kind: SourceKind;
  /** Max pressure 0..1 — drives spray reach, force, propulsion. */
  pressureMax: number;
  /** Liters. Infinity for mains-fed. */
  capacity: number;
  label: string;
}

export const SOURCE_SPECS: Record<SourceKind, SourceSpec> = {
  hydrant: { kind: 'hydrant', pressureMax: 1.0, capacity: Infinity, label: 'Hydrant' },
  spigot: { kind: 'spigot', pressureMax: 0.55, capacity: 240, label: 'Spigot' },
};

export class WaterSource {
  readonly spec: SourceSpec;
  /** World point the hose pins to. */
  readonly anchor: THREE.Vector3;
  /** Peer id of whoever is connected, or null. */
  occupiedBy: string | null = null;
  reservoir: number;

  private spool = new Spring(0, 26, 5.5); // underdamped → overshoot on connect
  private sputterT = 0;

  constructor(
    public readonly id: string,
    kind: SourceKind,
    anchor: THREE.Vector3,
    /** Where the player stands to interact. */
    public readonly interactPoint: THREE.Vector3,
  ) {
    this.spec = SOURCE_SPECS[kind];
    this.anchor = anchor.clone();
    this.reservoir = this.spec.capacity;
  }

  get label(): string {
    return this.spec.label;
  }

  /** 0..1 of capacity left (1 for mains-fed). */
  get reservoir01(): number {
    return this.spec.capacity === Infinity ? 1 : this.reservoir / this.spec.capacity;
  }

  /** Current pressure 0..1 after spool, depletion and sputter. */
  pressure = 0;

  /** True while the reservoir is nearly dry and the flow stutters. */
  sputtering = false;

  connect(peerId: string): boolean {
    if (this.occupiedBy !== null) return false;
    this.occupiedBy = peerId;
    return true;
  }

  disconnect(peerId: string): void {
    if (this.occupiedBy === peerId) this.occupiedBy = null;
  }

  /**
   * @param demand liters/sec being drawn right now (0 when not spraying)
   */
  update(dt: number, demand: number): void {
    this.spool.target = this.occupiedBy !== null ? this.spec.pressureMax : 0;
    this.spool.update(dt);
    let p = clamp(this.spool.value, 0, this.spec.pressureMax * 1.18);

    if (this.spec.capacity !== Infinity && this.occupiedBy !== null) {
      this.reservoir = Math.max(0, this.reservoir - demand * dt);
      const r = this.reservoir01;
      this.sputtering = r < 0.14 && r > 0;
      if (this.sputtering) {
        this.sputterT += dt;
        // intermittent coughing flow as the tank drains
        const gate = Math.sin(this.sputterT * 22) * 0.5 + Math.sin(this.sputterT * 7.3) * 0.5;
        p *= gate > -0.2 ? clamp(r / 0.14, 0.25, 1) : 0.08;
      } else if (r <= 0) {
        p = 0;
        this.sputtering = false;
      }
    } else {
      this.sputtering = false;
    }

    this.pressure = p;
  }
}
