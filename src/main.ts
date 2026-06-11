import * as THREE from 'three';
import { Input } from './core/input';
import { buildWorld } from './world/environment';
import { CameraRig } from './camera/cameraRig';
import { LocalPlayer } from './character/player';
import { WaterJet } from './hose/water';
import { Hud } from './ui/hud';
import { Sfx } from './audio/sfx';
import { Net } from './net/p2p';
import { RemotePlayers } from './net/sync';
import { clamp } from './core/math';
import type { WaterSource } from './hose/sources';

const FIXED_STEP = 1 / 60;
const NET_SEND_HZ = 12;

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// palette fidelity over filmic drama (§9.4) — colors stay exactly canon
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const world = buildWorld(scene);
const sourcesById = new Map<string, WaterSource>(world.sources.map((s) => [s.id, s]));

// ---------------------------------------------------------------- systems
const input = new Input(canvas);
const camera = new CameraRig(window.innerWidth / window.innerHeight, world.colliders);
const sfx = new Sfx();
const hud = new Hud();
const net = new Net();
const water = new WaterJet(scene);
const remotes = new RemotePlayers(scene);

const player = new LocalPlayer(
  scene,
  world.colliders,
  'local',
  {
    requestClaim: (id) => net.requestClaim(id),
    requestRelease: (id) => net.requestRelease(id),
    toast: (msg) => hud.toast(msg),
  },
  sfx,
);
player.controller.position.copy(world.spawn);
player.bindLanding((impact) => camera.addTrauma(clamp(impact / 16, 0.05, 0.45)));

// ---------------------------------------------------------------- net wiring
const overlay = document.getElementById('overlay') as HTMLElement;
const netStatus = document.getElementById('net-status') as HTMLElement;
const hostCodeEl = document.getElementById('host-code') as HTMLElement;
const btnHost = document.getElementById('btn-host') as HTMLButtonElement;
const btnJoin = document.getElementById('btn-join') as HTMLButtonElement;
const btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
const joinInput = document.getElementById('join-code') as HTMLInputElement;

net.onStatus = (text, kind) => {
  netStatus.textContent = text;
  netStatus.className = `net-status ${kind === 'info' ? '' : kind}`;
};
net.onPeerJoin = (id, name) => {
  remotes.add(id, name);
  sfx.peerJoin();
};
net.onPeerLeave = (id) => {
  remotes.remove(id);
  hud.toast('A firefighter left the yard');
};
net.onPeerState = (id, s) => remotes.pushState(id, s);
net.onClaim = (src, peerId) => {
  const source = sourcesById.get(src);
  if (!source) return;
  const mine = peerId === net.selfId;
  source.occupiedBy = mine ? player.id : peerId;
  if (mine) player.onClaimGranted(source);
};
net.onRelease = (src) => {
  const source = sourcesById.get(src);
  if (source) source.occupiedBy = null;
};
net.onDeny = () => player.onClaimDenied();
net.onReservoirs = (levels) => {
  for (const [id, r] of Object.entries(levels)) {
    const s = sourcesById.get(id);
    if (s) s.reservoir = r;
  }
};

btnHost.addEventListener('click', () => {
  net.host();
  btnHost.disabled = true;
  btnJoin.disabled = true;
  hostCodeEl.textContent = net.code;
  hostCodeEl.classList.remove('hidden');
});
btnJoin.addEventListener('click', () => {
  const code = joinInput.value.trim();
  if (code.length < 4) {
    net.onStatus('Enter the 6-character code', 'err');
    return;
  }
  net.join(code);
  btnHost.disabled = true;
  btnJoin.disabled = true;
});

// ---------------------------------------------------------------- menu flow
let started = false;

function enterGame(): void {
  sfx.init();
  started = true;
  overlay.classList.add('hidden');
  hud.setVisible(true);
  input.enabled = true;
  input.requestLock();
}

btnPlay.addEventListener('click', enterGame);
input.onLockChange = (locked) => {
  if (!locked && started) {
    overlay.classList.remove('hidden');
    input.enabled = false;
  } else if (locked) {
    overlay.classList.add('hidden');
    input.enabled = true;
  }
};
// clicking the canvas after Esc re-enters
canvas.addEventListener('click', () => {
  if (started && !input.locked) enterGame();
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.resize(window.innerWidth / window.innerHeight);
});

// dev-only debug hook for automated verification + playtest tooling
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__fire = {
    teleport: (x: number, z: number) => {
      player.controller.position.set(x, 0, z);
      player.controller.velocity.set(0, 0, 0);
    },
    look: (yaw: number, pitch: number) => {
      camera.yaw = yaw;
      camera.pitch = pitch;
    },
    water: () => water.stats(),
    setReservoir: (id: string, liters: number) => {
      const s = sourcesById.get(id);
      if (s) s.reservoir = liters;
    },
    state: () => ({
      pos: player.position.toArray(),
      camYaw: camera.yaw,
      camPitch: camera.pitch,
      hose: player.hose.state,
      pressure: player.hose.pressure,
      spraying: player.spraying,
      grounded: player.controller.grounded,
    }),
  };
}

// ---------------------------------------------------------------- game loop
let last = performance.now();
let accumulator = 0;
let netTimer = 0;
let reservoirTimer = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  const renderDt = Math.min((now - last) / 1000, 0.1);
  last = now;

  // look is per-render-frame for buttery aim
  const look = input.consumeLook();
  if (input.locked) camera.applyLook(look.x, look.y);

  if (input.pressed('KeyV')) camera.toggleView();
  if (input.pressed('KeyM')) hud.toast(sfx.toggleMute() ? 'Muted' : 'Sound on');

  // ---------------- fixed-step simulation ----------------
  accumulator += renderDt;
  let steps = 0;
  while (accumulator >= FIXED_STEP && steps < 5) {
    player.update(FIXED_STEP, input, camera, world.sources, water);

    for (const src of world.sources) {
      const localDemand = src.id === player.hose.source?.id ? player.hose.demand(player.spraying) : 0;
      src.update(FIXED_STEP, localDemand + remotes.demandFor(src.id));
    }

    steps++;
    if (steps === 1) input.endFrame(); // discrete presses consumed exactly once
  }
  accumulator = Math.min(accumulator, FIXED_STEP * 4);

  // ---------------- per-frame visuals ----------------
  remotes.update(renderDt, sourcesById, water);
  water.update(renderDt);

  camera.update(renderDt, player.position, {
    crouched: player.controller.crouching,
    sprinting: player.controller.speedHorizontal > 3.2,
    sprayKick: player.spraying && player.hose.mode === 2 ? player.hose.pressure : 0,
  });

  // ---------------- HUD ----------------
  if (started) {
    hud.update({
      pressure: clamp(player.hose.pressure, 0, 1),
      water01: player.hose.connected ? player.hose.source!.reservoir01 : 0,
      hoseText: player.hoseText(),
      mode: player.hose.mode,
      spraying: player.spraying,
      prompt: player.promptFor(world.sources),
    });

    const lines: string[] = [];
    if (net.role === 'host') {
      lines.push(`CODE <span class="code-mini">${net.code}</span>`);
      lines.push(`${net.connectedCount + 1} firefighter${net.connectedCount > 0 ? 's' : ''} in the yard`);
    } else if (net.role === 'client') {
      lines.push(`room <span class="code-mini">${net.code}</span>`);
      lines.push(`${remotes.players.size + 1} firefighters in the yard`);
    }
    hud.setNetInfo(lines);
  }

  // ---------------- network send ----------------
  if (net.role !== 'offline') {
    netTimer += renderDt;
    if (netTimer >= 1 / NET_SEND_HZ) {
      netTimer = 0;
      net.sendState(player.snapshot());
    }
    if (net.role === 'host') {
      reservoirTimer += renderDt;
      if (reservoirTimer >= 1) {
        reservoirTimer = 0;
        const levels: Record<string, number> = {};
        for (const s of world.sources) if (s.spec.capacity !== Infinity) levels[s.id] = s.reservoir;
        net.broadcastReservoirs(levels);
      }
    }
  }

  renderer.render(scene, camera.camera);
}

requestAnimationFrame(frame);
