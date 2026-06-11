import * as THREE from 'three';
import { PALETTE, mat } from '../world/palette';

/**
 * Verlet rope for the hose — the signature object in the game gets real
 * physics: gravity, ground contact with friction, and distance constraints,
 * pinned at the water source and at the nozzle.
 */

const GRAVITY = -16;
const DAMPING = 0.985;
const ITERATIONS = 5;
const GROUND_FRICTION = 0.72;
export const ROPE_RADIUS = 0.042;

export class VerletRope {
  points: THREE.Vector3[] = [];
  prev: THREE.Vector3[] = [];
  segLen: number;

  constructor(from: THREE.Vector3, to: THREE.Vector3, public length: number, segmentLen = 0.34) {
    this.segLen = segmentLen;
    const n = Math.max(4, Math.round(length / segmentLen) + 1);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      // spawn with a little slack sag so it doesn't pop
      const p = from.clone().lerp(to, t);
      p.y += Math.sin(t * Math.PI) * 0.2;
      this.points.push(p);
      this.prev.push(p.clone());
    }
    this.segLen = length / (n - 1);
  }

  get count(): number {
    return this.points.length;
  }

  /** Total slack length of the rope. */
  get restLength(): number {
    return this.segLen * (this.count - 1);
  }

  extend(extra: number): void {
    const n = Math.round(extra / this.segLen);
    const tail = this.points[this.points.length - 1];
    for (let i = 0; i < n; i++) {
      this.points.push(tail.clone());
      this.prev.push(tail.clone());
    }
    this.length += n * this.segLen;
  }

  update(dt: number, headPin: THREE.Vector3, tailPin: THREE.Vector3): void {
    const pts = this.points;
    const prev = this.prev;
    const n = pts.length;

    // integrate
    const dt2 = dt * dt;
    for (let i = 1; i < n - 1; i++) {
      const p = pts[i];
      const q = prev[i];
      const vx = (p.x - q.x) * DAMPING;
      const vy = (p.y - q.y) * DAMPING;
      const vz = (p.z - q.z) * DAMPING;
      q.copy(p);
      p.x += vx;
      p.y += vy + GRAVITY * dt2;
      p.z += vz;
    }

    pts[0].copy(headPin);
    pts[n - 1].copy(tailPin);

    // relax distance constraints
    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (let i = 0; i < n - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = ((d - this.segLen) / d) * 0.5;
        dx *= diff;
        dy *= diff;
        dz *= diff;
        const aPinned = i === 0;
        const bPinned = i + 1 === n - 1;
        if (!aPinned && !bPinned) {
          a.x += dx; a.y += dy; a.z += dz;
          b.x -= dx; b.y -= dy; b.z -= dz;
        } else if (aPinned && !bPinned) {
          b.x -= dx * 2; b.y -= dy * 2; b.z -= dz * 2;
        } else if (!aPinned && bPinned) {
          a.x += dx * 2; a.y += dy * 2; a.z += dz * 2;
        }
      }
      // ground contact
      for (let i = 1; i < n - 1; i++) {
        const p = pts[i];
        if (p.y < ROPE_RADIUS) {
          p.y = ROPE_RADIUS;
          // friction: bleed horizontal motion while touching ground
          const q = prev[i];
          q.x = p.x + (q.x - p.x) * GROUND_FRICTION;
          q.z = p.z + (q.z - p.z) * GROUND_FRICTION;
        }
      }
    }
  }

  /** How taut the rope is, 0 slack → 1 fully stretched (head→tail distance vs rest length). */
  tautness(): number {
    const d = this.points[0].distanceTo(this.points[this.points.length - 1]);
    return Math.min(d / this.restLength, 1);
  }
}

/**
 * Tube mesh updated in place from rope points each frame — fixed buffers,
 * zero allocation, parallel-transport frames so the tube doesn't twist.
 */
export class RopeMesh {
  mesh: THREE.Mesh;
  private positions: Float32Array;
  private normals: Float32Array;
  private geometry: THREE.BufferGeometry;
  private radial: number;

  constructor(private maxPoints: number, radius = ROPE_RADIUS, radial = 7) {
    this.radial = radial;
    this.positions = new Float32Array(maxPoints * radial * 3);
    this.normals = new Float32Array(maxPoints * radial * 3);

    const indices: number[] = [];
    for (let i = 0; i < maxPoints - 1; i++) {
      for (let r = 0; r < radial; r++) {
        const a = i * radial + r;
        const b = i * radial + ((r + 1) % radial);
        const c = (i + 1) * radial + r;
        const d = (i + 1) * radial + ((r + 1) % radial);
        indices.push(a, c, b, b, c, d);
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    this.geometry.setIndex(indices);

    this.mesh = new THREE.Mesh(this.geometry, mat(PALETTE.brickRed));
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.radius = radius;
  }

  private radius: number;

  update(points: THREE.Vector3[]): void {
    const n = Math.min(points.length, this.maxPoints);
    const radial = this.radial;
    const tangent = new THREE.Vector3();
    const normal = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
      const p = points[i];
      const next = points[Math.min(i + 1, n - 1)];
      const prev = points[Math.max(i - 1, 0)];
      tangent.subVectors(next, prev).normalize();

      // parallel transport: keep normal perpendicular to tangent
      tmp.copy(normal).addScaledVector(tangent, -normal.dot(tangent));
      if (tmp.lengthSq() < 1e-6) tmp.set(tangent.y, tangent.z, tangent.x); // degenerate fallback
      normal.copy(tmp.normalize());
      binormal.crossVectors(tangent, normal);

      for (let r = 0; r < radial; r++) {
        const a = (r / radial) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const idx = (i * radial + r) * 3;
        const nx = normal.x * ca + binormal.x * sa;
        const ny = normal.y * ca + binormal.y * sa;
        const nz = normal.z * ca + binormal.z * sa;
        this.positions[idx] = p.x + nx * this.radius;
        this.positions[idx + 1] = p.y + ny * this.radius;
        this.positions[idx + 2] = p.z + nz * this.radius;
        this.normals[idx] = nx;
        this.normals[idx + 1] = ny;
        this.normals[idx + 2] = nz;
      }
    }

    this.geometry.setDrawRange(0, Math.max(0, (n - 1) * radial * 6));
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    this.mesh.visible = n > 1;
  }

  hide(): void {
    this.mesh.visible = false;
  }
}
