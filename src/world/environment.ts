import * as THREE from 'three';
import { PALETTE, mat } from './palette';
import { buildHydrant, buildSpigotWall } from './props';
import type { WaterSource } from '../hose/sources';

/**
 * The training yard — a cozy proving ground for every system in the slice:
 * flat pad for hose play, a platforming stair for movement feel, the hydrant
 * by the street and the spigot on a wall. Warm storybook light (§9).
 */

export interface World {
  colliders: THREE.Box3[];
  sources: WaterSource[];
  spawn: THREE.Vector3;
}

export function buildWorld(scene: THREE.Scene): World {
  const colliders: THREE.Box3[] = [];
  const sources: WaterSource[] = [];

  // ---------------- sky, fog, light ----------------
  scene.background = new THREE.Color(PALETTE.warmPaper);
  scene.fog = new THREE.Fog(PALETTE.warmPaper, 38, 95);

  const hemi = new THREE.HemisphereLight(PALETTE.warmPaper, PALETTE.coolSlate, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(14, 22, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ---------------- ground ----------------
  const grass = new THREE.Mesh(new THREE.CircleGeometry(60, 24), mat(PALETTE.grassWarm));
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  // top sits 2 cm proud of the grass so the planes never z-fight
  const pad = new THREE.Mesh(new THREE.BoxGeometry(22, 0.1, 18), mat(PALETTE.coolSlateLight));
  pad.position.set(0, -0.03, 0);
  pad.receiveShadow = true;
  scene.add(pad);

  // painted yard markings
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.3, 24), mat(PALETTE.hiVisYellow));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  scene.add(ring);

  const addBox = (
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    color: number,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, y, z - d / 2),
      new THREE.Vector3(x + w / 2, y + h, z + d / 2),
    ));
    return m;
  };

  // ---------------- platforming course (0.5 m grid, §9.5) ----------------
  // climbing stair — each step within single-jump reach (~1.1 m apex)
  addBox(7, 0, -5, 2, 0.5, 2, PALETTE.coolSlate);
  addBox(9.5, 0, -5, 2, 1.0, 2, PALETTE.coolSlate);
  addBox(12, 0, -5, 2, 1.5, 2, PALETTE.coolSlateLight);
  addBox(12, 0, -8, 2, 2.5, 2, PALETTE.coolSlate);
  addBox(12, 0, -11.5, 2.5, 3.5, 2.5, PALETTE.coolSlateLight);
  // gap-jump pillars
  addBox(8, 0, -11.5, 1.5, 2.0, 1.5, PALETTE.coolSlate);
  addBox(4.5, 0, -11.5, 1.5, 1.0, 1.5, PALETTE.coolSlateLight);
  // crawl tunnel — slab on legs, only passable crouched
  addBox(-6, 0.85, -8, 4, 0.4, 2.5, PALETTE.turnoutTanLight);
  addBox(-4.2, 0, -8, 0.4, 0.85, 2.5, PALETTE.coolSlate);
  addBox(-7.8, 0, -8, 0.4, 0.85, 2.5, PALETTE.coolSlate);
  // water-jump tower: out of normal jump reach — blast straight down to summit
  addBox(-11, 0, 3, 3, 2.6, 3, PALETTE.coolSlateLight);

  // ---------------- water sources ----------------
  const hydrant = buildHydrant('src-hydrant', 3.5, 6.5, Math.PI);
  scene.add(hydrant.group);
  colliders.push(...hydrant.colliders);
  sources.push(hydrant.source);

  const spigot = buildSpigotWall('src-spigot', -8, -2.5, 0.5);
  scene.add(spigot.group);
  colliders.push(...spigot.colliders);
  sources.push(spigot.source);

  // ---------------- set dressing ----------------
  const tree = (x: number, z: number, s: number): void => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 0.7 * s, 6), mat(PALETTE.charcoalLight));
    trunk.position.y = 0.35 * s;
    trunk.castShadow = true;
    t.add(trunk);
    let y = 0.8 * s;
    for (const r of [0.85, 0.62, 0.4]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * s, 0.85 * s, 7), mat(PALETTE.grassWarm));
      cone.position.y = y;
      cone.castShadow = true;
      t.add(cone);
      y += 0.55 * s;
    }
    t.position.set(x, 0, z);
    scene.add(t);
  };
  tree(16, 4, 1.4);
  tree(-15, -10, 1.1);
  tree(-16, 8, 1.6);
  tree(14, -14, 1.2);

  const cone = (x: number, z: number): void => {
    const c = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.34), mat(PALETTE.flameOrange));
    base.position.y = 0.02;
    c.add(base);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 7), mat(PALETTE.flameOrange));
    body.position.y = 0.23;
    body.castShadow = true;
    c.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.07, 7), mat(PALETTE.warmPaper));
    band.position.y = 0.22;
    c.add(band);
    c.position.set(x, 0, z);
    scene.add(c);
  };
  cone(2, 2);
  cone(-2, 2.4);
  cone(0.4, -2.6);

  // water barrel (future portable source — §6) as dressing
  const barrel = new THREE.Group();
  const bbody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.85, 9), mat(PALETTE.waterBlue));
  bbody.position.y = 0.425;
  bbody.castShadow = true;
  barrel.add(bbody);
  for (const y of [0.18, 0.65]) {
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.05, 9), mat(PALETTE.steelSilver));
    hoop.position.y = y;
    barrel.add(hoop);
  }
  barrel.position.set(-7.2, 0, 1.6);
  scene.add(barrel);
  colliders.push(new THREE.Box3(new THREE.Vector3(-7.6, 0, 1.2), new THREE.Vector3(-6.8, 0.9, 2.0)));

  return { colliders, sources, spawn: new THREE.Vector3(0, 0, 0) };
}
