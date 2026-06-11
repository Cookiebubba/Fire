import * as THREE from 'three';
import { PALETTE, mat } from './palette';
import { WaterSource } from '../hose/sources';

/**
 * Water source props — readable at a glance (§9.4): the hydrant is a fat
 * brick-red street icon, the spigot is a brass tap on a wall with pipework.
 */

export interface PropBuild {
  group: THREE.Group;
  colliders: THREE.Box3[];
  source: WaterSource;
}

export function buildHydrant(id: string, x: number, z: number, rotY = 0): PropBuild {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.12, 8), mat(PALETTE.coolSlate));
  base.position.y = 0.06;
  g.add(base);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.62, 9), mat(PALETTE.brickRed));
  body.position.y = 0.43;
  body.castShadow = true;
  g.add(body);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(PALETTE.brickRed),
  );
  dome.position.y = 0.74;
  dome.castShadow = true;
  g.add(dome);

  const bonnet = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.09, 6), mat(PALETTE.brassGold));
  bonnet.position.y = 0.88;
  g.add(bonnet);

  // side caps
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.1, 7), mat(PALETTE.steelSilver));
    cap.rotation.z = Math.PI / 2;
    cap.position.set(0.2 * side, 0.5, 0);
    cap.castShadow = true;
    g.add(cap);
  }

  // front outlet — the hose anchor
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 7), mat(PALETTE.brassGold));
  outlet.rotation.x = Math.PI / 2;
  outlet.position.set(0, 0.45, 0.22);
  outlet.castShadow = true;
  g.add(outlet);

  // collar band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.05, 9), mat(PALETTE.hiVisYellow));
  band.position.y = 0.16;
  g.add(band);

  g.updateMatrixWorld(true);
  const anchorLocal = new THREE.Vector3(0, 0.45, 0.32);
  const anchor = anchorLocal.applyMatrix4(g.matrixWorld);
  const interact = new THREE.Vector3(0, 0, 0.9).applyMatrix4(g.matrixWorld);
  interact.y = 0;

  const collider = new THREE.Box3(
    new THREE.Vector3(x - 0.28, 0, z - 0.28),
    new THREE.Vector3(x + 0.28, 0.92, z + 0.28),
  );

  return { group: g, colliders: [collider], source: new WaterSource(id, 'hydrant', anchor, interact) };
}

export function buildSpigotWall(id: string, x: number, z: number, rotY = 0): PropBuild {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  // building wall fragment — tan with a stripe, "a bathroom = a spigot" (§9.4)
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 0.4), mat(PALETTE.turnoutTanLight));
  wall.position.y = 1.3;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.42), mat(PALETTE.coolSlate));
  trim.position.y = 0.09;
  g.add(trim);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), mat(PALETTE.hiVisYellow));
  sign.position.set(-0.9, 1.7, 0.21);
  g.add(sign);
  const drop = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 6), mat(PALETTE.waterBlue));
  drop.rotation.x = Math.PI;
  drop.position.set(-0.9, 1.7, 0.25);
  g.add(drop);

  // pipework: riser + elbow + tap
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 7), mat(PALETTE.steelSilver));
  riser.position.set(0.35, 0.55, 0.22);
  riser.castShadow = true;
  g.add(riser);

  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), mat(PALETTE.steelSilver));
  elbow.position.set(0.35, 1.1, 0.22);
  g.add(elbow);

  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 7), mat(PALETTE.brassGold));
  stub.rotation.x = Math.PI / 2;
  stub.position.set(0.35, 1.1, 0.32);
  g.add(stub);

  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.07, 7), mat(PALETTE.brassGold));
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0.35, 1.1, 0.43);
  mouth.castShadow = true;
  g.add(mouth);

  // valve wheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 5, 10), mat(PALETTE.brickRed));
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0.35, 1.24, 0.32);
  wheel.castShadow = true;
  g.add(wheel);

  g.updateMatrixWorld(true);
  const anchor = new THREE.Vector3(0.35, 1.08, 0.5).applyMatrix4(g.matrixWorld);
  const interact = new THREE.Vector3(0.35, 0, 1.0).applyMatrix4(g.matrixWorld);
  interact.y = 0;

  const colliders = [new THREE.Box3().setFromObject(wall)];

  return { group: g, colliders, source: new WaterSource(id, 'spigot', anchor, interact) };
}
