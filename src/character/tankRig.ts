import * as THREE from 'three';
import { PALETTE, mat } from '../world/palette';

/**
 * The Stout Tank — procedural build of the approved hero turnaround
 * (GameConceptTracker §10.3 / §11). Faceted primitives, flat shading,
 * canon palette only. ~1.2 m tall, helmet+head ≈ 40% of silhouette.
 *
 * The rig is a plain Object3D hierarchy; animation rotates/offsets the
 * named joints below. No SkinnedMesh — chunky toy parts moving rigidly
 * IS the style.
 */

export interface TankJoints {
  /** Vertical bob/crouch offset + body yaw live here. */
  hips: THREE.Group;
  /** Lean, twist, squash. */
  torso: THREE.Group;
  head: THREE.Group;
  helmet: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
}

export interface TankRigParts {
  root: THREE.Group;
  joints: TankJoints;
  /** Brass nozzle prop, parented into the right glove. */
  nozzle: THREE.Group;
  /** Coiled hose on the left hip — visible while holstered. */
  hipCoil: THREE.Group;
  /** Where a deployed hose's last rope segment visually attaches. */
  hoseAnchor: THREE.Object3D;
  /** Tip of the nozzle — water emission point. */
  nozzleTip: THREE.Object3D;
  /** Meshes hidden in first person (head/helmet so the camera sits inside). */
  firstPersonHidden: THREE.Object3D[];
}

/** Barrel coat silhouette — radius of the torso at height y (model space). */
function coatRadius(y: number): number {
  // piecewise bulge: hips 0.26 → belly 0.33 → shoulders 0.22
  const pts: Array<[number, number]> = [
    [0.0, 0.255],
    [0.1, 0.3],
    [0.24, 0.33],
    [0.4, 0.315],
    [0.52, 0.27],
    [0.6, 0.225],
  ];
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [y0, r0] = pts[i - 1];
      const [y1, r1] = pts[i];
      return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
    }
  }
  return pts[pts.length - 1][1];
}

const RADIAL = 10; // facet count around the barrel — visible facets are the look

function lathe(profile: Array<[number, number]>, material: THREE.Material): THREE.Mesh {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(points, RADIAL);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

/** Stripe band hugging the coat at local torso height y. */
function stripeBand(y: number, height: number, color: number): THREE.Mesh {
  const r = coatRadius(y) + 0.008;
  const r2 = coatRadius(y + height) + 0.008;
  return lathe(
    [
      [r, y],
      [r2, y + height],
    ],
    mat(color),
  );
}

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true;
  return m;
}

export function buildNozzleProp(): { group: THREE.Group; tip: THREE.Object3D } {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.2, 8), mat(PALETTE.brassGold));
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  g.add(body);

  const tipRing = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.05, 8), mat(PALETTE.brassGold));
  tipRing.rotation.x = Math.PI / 2;
  tipRing.position.z = 0.115;
  tipRing.castShadow = true;
  g.add(tipRing);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 8), mat(PALETTE.charcoal));
  collar.rotation.x = Math.PI / 2;
  collar.position.z = -0.07;
  g.add(collar);

  const handle = box(0.018, 0.07, 0.03, PALETTE.brassGold);
  handle.position.set(0, 0.07, -0.02);
  g.add(handle);
  const handleTop = box(0.018, 0.022, 0.075, PALETTE.brassGold);
  handleTop.position.set(0, 0.105, -0.02);
  g.add(handleTop);

  const tip = new THREE.Object3D();
  tip.position.set(0, 0, 0.15);
  g.add(tip);
  return { group: g, tip };
}

export interface TankColors {
  coat?: number;
  helmet?: number;
}

export function buildTankRig(colors: TankColors = {}): TankRigParts {
  const coatColor = colors.coat ?? PALETTE.turnoutTan;
  const helmetColor = colors.helmet ?? PALETTE.brickRed;

  const root = new THREE.Group();
  root.name = 'tank';

  const hips = new THREE.Group();
  hips.position.y = 0.18;
  root.add(hips);

  // ---------------------------------------------------------------- legs
  const buildLeg = (side: 1 | -1): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(0.13 * side, 0.02, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.16, 8), mat(coatColor));
    thigh.position.y = -0.06;
    thigh.castShadow = true;
    leg.add(thigh);

    // enormous chunky boot
    const boot = new THREE.Group();
    boot.position.y = -0.13;
    const heel = box(0.17, 0.11, 0.2, PALETTE.charcoal);
    heel.position.set(0, 0, -0.01);
    boot.add(heel);
    const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 7), mat(PALETTE.charcoal));
    toe.rotation.z = Math.PI / 2;
    toe.rotation.y = Math.PI / 2;
    toe.position.set(0, -0.018, 0.12);
    toe.castShadow = true;
    boot.add(toe);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.105, 0.05, 8), mat(PALETTE.charcoalLight));
    cuff.position.y = 0.07;
    boot.add(cuff);
    leg.add(boot);
    return leg;
  };
  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  hips.add(legL, legR);

  // ---------------------------------------------------------------- torso
  const torso = new THREE.Group();
  torso.position.y = 0.06;
  hips.add(torso);

  // coat barrel (lathe of the silhouette profile)
  const coatProfile: Array<[number, number]> = [];
  for (let i = 0; i <= 8; i++) {
    const y = (i / 8) * 0.6;
    coatProfile.push([coatRadius(y), y]);
  }
  coatProfile.push([0.16, 0.64]); // close toward collar
  const coat = lathe(coatProfile, mat(coatColor));
  torso.add(coat);

  // hi-vis stripe bands: yellow-silver-yellow, twice (§10.3)
  for (const baseY of [0.13, 0.38]) {
    torso.add(stripeBand(baseY, 0.028, PALETTE.hiVisYellow));
    torso.add(stripeBand(baseY + 0.028, 0.018, PALETTE.reflectiveSilver));
    torso.add(stripeBand(baseY + 0.046, 0.028, PALETTE.hiVisYellow));
  }

  // belt + buckle
  torso.add(stripeBand(0.075, 0.04, PALETTE.charcoal));
  const buckle = box(0.07, 0.05, 0.02, PALETTE.steelSilver);
  buckle.position.set(0, 0.095, coatRadius(0.095) + 0.012);
  torso.add(buckle);

  // chest harness straps (front + back verticals over the shoulders)
  const strap = (x: number, zSign: 1 | -1): void => {
    const s = box(0.05, 0.34, 0.016, PALETTE.charcoal);
    const zr = coatRadius(0.42) * zSign;
    s.position.set(x, 0.4, zr * 0.92);
    s.rotation.x = zSign * -0.22;
    torso.add(s);
    if (zSign === 1) {
      const b = box(0.06, 0.06, 0.02, PALETTE.steelSilver);
      b.position.set(x, 0.42, coatRadius(0.42) * 0.92 + 0.012);
      b.rotation.x = -0.22;
      torso.add(b);
    }
  };
  strap(-0.12, 1);
  strap(0.12, 1);
  strap(-0.12, -1);
  strap(0.12, -1);

  // collar — high tan funnel that hides the chin
  const collar = lathe(
    [
      [0.17, 0.6],
      [0.155, 0.68],
      [0.125, 0.73],
    ],
    mat(coatColor),
  );
  torso.add(collar);

  // ------------------------------------------------------------- back tank
  const tank = new THREE.Group();
  tank.position.set(0, 0.42, -0.3);
  tank.rotation.x = 0.08;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.3, 9), mat(PALETTE.steelSilver));
  cyl.castShadow = true;
  tank.add(cyl);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(PALETTE.steelSilver));
  cap.position.y = 0.15;
  tank.add(cap);
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 6), mat(PALETTE.brassGold));
  valve.position.y = 0.235;
  tank.add(valve);
  const valveT = box(0.07, 0.016, 0.016, PALETTE.brassGold);
  valveT.position.y = 0.26;
  tank.add(valveT);
  // flame decal
  const decal = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.07, 6), mat(PALETTE.flameOrange));
  decal.position.set(0, 0.02, -0.085);
  decal.rotation.x = -0.1;
  tank.add(decal);
  torso.add(tank);

  // ------------------------------------------------------------- hip coil
  const hipCoil = new THREE.Group();
  hipCoil.position.set(-0.3, 0.16, 0.05);
  hipCoil.rotation.z = Math.PI / 2;
  hipCoil.rotation.y = 0.25;
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105 - i * 0.012, 0.03, 6, 12), mat(PALETTE.brickRed));
    ring.position.z = i * 0.045 - 0.045;
    ring.castShadow = true;
    hipCoil.add(ring);
  }
  const coilNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.09, 7), mat(PALETTE.brassGold));
  coilNozzle.position.set(0.1, -0.06, 0);
  coilNozzle.rotation.z = 0.5;
  hipCoil.add(coilNozzle);
  torso.add(hipCoil);

  // ----------------------------------------------------------------- head
  const head = new THREE.Group();
  head.position.y = 0.7;
  torso.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.115, 9, 7), mat(PALETTE.skinCream));
  face.position.y = 0.05;
  face.castShadow = true;
  head.add(face);

  for (const x of [-0.042, 0.042]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), mat(PALETTE.eyeDark));
    eye.position.set(x, 0.06, 0.1);
    head.add(eye);
  }

  // -------------------------------------------------------------- helmet
  const helmet = new THREE.Group();
  helmet.position.y = 0.12;
  head.add(helmet);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.185, RADIAL, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(helmetColor));
  dome.scale.y = 0.92;
  dome.castShadow = true;
  helmet.add(dome);

  const brim = lathe(
    [
      [0.16, 0.0],
      [0.27, -0.015],
      [0.285, -0.045],
      [0.255, -0.05],
      [0.155, -0.02],
    ],
    mat(helmetColor),
  );
  brim.position.y = 0.02;
  helmet.add(brim);

  const crest = box(0.05, 0.07, 0.16, helmetColor === PALETTE.brickRed ? PALETTE.brickRed : helmetColor);
  crest.position.y = 0.17;
  helmet.add(crest);

  // gold hexagonal flame emblem on the front crest
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.014, 6), mat(PALETTE.brassGold));
  emblem.rotation.x = Math.PI / 2 - 0.35;
  emblem.position.set(0, 0.075, 0.165);
  helmet.add(emblem);
  const emblemFlame = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.055, 6), mat(PALETTE.flameOrange));
  emblemFlame.position.set(0, 0.085, 0.176);
  emblemFlame.rotation.x = -0.35;
  helmet.add(emblemFlame);

  // ----------------------------------------------------------------- arms
  const buildArm = (side: 1 | -1): { pivot: THREE.Group; glove: THREE.Group } => {
    const pivot = new THREE.Group();
    pivot.position.set(0.27 * side, 0.5, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.26, 8), mat(coatColor));
    arm.position.y = -0.13;
    arm.castShadow = true;
    pivot.add(arm);
    const cuffY = -0.21;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.09, 0.045, 8), mat(PALETTE.hiVisYellow));
    cuff.position.y = cuffY;
    pivot.add(cuff);
    const glove = new THREE.Group();
    glove.position.y = -0.3;
    const mitt = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), mat(PALETTE.charcoal));
    mitt.scale.set(1, 1.12, 1);
    mitt.castShadow = true;
    glove.add(mitt);
    pivot.add(glove);
    pivot.rotation.z = side * 0.16; // slight outward hang
    return { pivot, glove };
  };
  const armL = buildArm(-1);
  const armR = buildArm(1);
  torso.add(armL.pivot, armR.pivot);

  // nozzle prop lives in the right glove; hidden while holstered
  const { group: nozzle, tip: nozzleTip } = buildNozzleProp();
  nozzle.position.set(0, -0.06, 0.06);
  nozzle.visible = false;
  armR.glove.add(nozzle);

  // deployed hose connects visually at the bottom of the nozzle grip
  const hoseAnchor = new THREE.Object3D();
  hoseAnchor.position.set(0, -0.02, -0.12);
  nozzle.add(hoseAnchor);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });

  return {
    root,
    joints: { hips, torso, head, helmet, shoulderL: armL.pivot, shoulderR: armR.pivot, legL, legR },
    nozzle,
    hipCoil,
    hoseAnchor,
    nozzleTip,
    firstPersonHidden: [head],
  };
}

/** Floating name tag for remote co-op players. */
export function buildNameTag(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(59,56,51,0.78)';
  const w = Math.min(240, 44 + name.length * 18);
  ctx.beginPath();
  ctx.roundRect((256 - w) / 2, 8, w, 52, 14);
  ctx.fill();
  ctx.font = 'bold 32px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ede8dc';
  ctx.fillText(name, 128, 36);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true }));
  sprite.scale.set(0.72, 0.2, 1);
  sprite.position.y = 1.62;
  return sprite;
}
