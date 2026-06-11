# 🚒 FIRE — Training Yard (playable systems sandbox)

The first playable slice of the co-op firefighting platformer described in
[`GameConceptTracker.md`](./GameConceptTracker.md). Everything here is built
from code — the Stout Tank hero, his animations, the hose physics, the water,
the audio — no external assets.

## Run it

```bash
npm install
npm run dev        # → http://localhost:5173
```

`npm run build` produces a static site in `dist/` — host it anywhere.

## What's in the slice

| System | Details |
|---|---|
| **The Stout Tank** | Procedural build of the approved hero sheet (§10.3 of the tracker): faceted helmet + gold flame emblem, stripe-banded turnout coat, harness, air tank, hip hose coil, brass nozzle. Canon palette only. |
| **Animation** | Fully procedural, layered: idle breathing, walk/run cycles with counter-swinging arms, jump tuck / fall, landing squash & stretch, crouch-crawl, two-handed hose grip tracking aim, spray recoil, connect wrench-twist, helmet bobble. |
| **Control** | WASD + mouse, sprint, crouch, jump with coyote time, jump buffering and variable height. Hose drag slows you; a taut line hard-stops you. |
| **Cameras** | Third-person orbit with collision boom + shoulder offset, true first person (body visible when you look down), smooth V-key transition, FOV kicks, impact shake. |
| **Hose** | Verlet rope (gravity, ground friction, taut-line tension) rendered as a zero-allocation tube. Deploy/holster, connect/disconnect/switch sources, extendable +4 m segments to 28 m. |
| **Water** | Pressure-driven particle jet — mist / stream / blast — with ground splashes, dribble at low pressure, and the **water jump**: blast straight down mid-air to rocket to high ledges (climb-rate capped). |
| **Sources** | **Hydrant** — mains-fed, pressure 1.0, infinite. **Spigot** — building plumbing, pressure 0.55, 240 L reservoir that sputters as it runs dry. Underdamped spool-up on connect. |
| **P2P co-op** | Host gets a 6-character invite code; friends join with it. WebRTC via PeerJS, star topology, host-authoritative source claims, interpolated remote avatars with name tags, remote hoses & water simulated from synced intent. No game servers. |
| **Audio** | 100 % synthesized WebAudio: pressure-shaped spray noise, connect clunk + spool whine, footsteps, jump/land thuds, sputters. |

## Controls

| Key | Action | Key | Action |
|---|---|---|---|
| WASD | move | Mouse | look |
| Space | jump | Shift | sprint |
| C | crouch / crawl | V | 1st ⇄ 3rd person |
| H | deploy / holster hose | E | connect / disconnect / switch |
| LMB (hold) | spray | 1 · 2 · 3 / wheel | mist · stream · blast |
| G | couple on a hose segment | M | mute |

**Water jump:** connect to a source, switch to **blast**, jump, aim straight
down, hold spray.

## Co-op notes

- Default signalling uses the free PeerJS cloud broker — works on the open
  internet with zero setup.
- Self-hosting (LAN parties, no third parties): run `npx peerjs --port 9100`
  and open the game with `?peer=yourhost:9100`.
- The host's browser is the authority for who owns each water source and for
  reservoir levels; everything else is peer-simulated from synced intent.

## Dev / testing hooks

In dev builds, `window.__fire` exposes `teleport(x, z)`, `look(yaw, pitch)`,
`state()`, `water()` (particle stats) and `setReservoir(id, liters)` — used by
the Playwright verification scripts and handy for tuning.

## Tuning ledger (feel decisions, revisit during playtests)

- Jump: 7.1 m/s ≈ 1.15 m apex · gravity 22 · coyote 0.12 s · buffer 0.14 s
- Speeds: walk 2.3 · sprint 4.3 · crouch 1.15 m/s · hose drag up to −45 %
- Water jump: thrust 34 m/s², climb capped at 6.5 m/s, needs pressure > 0.45
- Stream 14.5 m/s · blast 21 m/s · mist short cone; demand 3/8/16 L/s
- Spigot sputters below 14 % reservoir
