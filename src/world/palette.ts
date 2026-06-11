import * as THREE from 'three';

/** Canonical palette — GameConceptTracker §9.2. Single source of truth. */
export const PALETTE = {
  brickRed: 0xc14b33,
  brassGold: 0xd9a53c,
  flameOrange: 0xe06b35,
  turnoutTan: 0xc8a165,
  turnoutTanLight: 0xd4b077,
  hiVisYellow: 0xe8c95c,
  reflectiveSilver: 0xbfbcad,
  charcoal: 0x3b3833,
  charcoalLight: 0x45413b,
  steelSilver: 0xa9adb0,
  skinCream: 0xf2e3ce,
  warmPaper: 0xede8dc,
  coolSlate: 0x7e8a96,
  coolSlateLight: 0x97a3ae,
  waterBlue: 0x6fa8c4,
  waterFoam: 0xe8f2f6,
  grassWarm: 0xa8b06b,
  eyeDark: 0x2b2926,
} as const;

const cache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Shared flat-shaded matte material per color — one material per hue keeps
 * the whole scene within a handful of shader programs (§9.3).
 */
export function mat(color: number, opts: { emissive?: number; emissiveIntensity?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.emissive ?? 0}|${opts.emissiveIntensity ?? 0}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0,
      flatShading: true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
    cache.set(key, m);
  }
  return m;
}
