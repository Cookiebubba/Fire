# 🧯 Kanban Board

> The live board. Companion to [`BUILD_SCHEDULE.md`](BUILD_SCHEDULE.md) (milestones, gates, process rules §6) and [`GameConceptTracker.md`](GameConceptTracker.md) (design canon).
>
> **How to use:** assign an agent a card from **✅ Ready** by pasting its detail block (below the board) into the session. Sizes: **S** = 1 agent session · **M** = 2–3 sessions · **L** = split before pulling. **🎮** = requires human play/judgment to close. Move cards by editing this file; date every move.

**Last updated:** 2026-06-11

---

## The Board

### ✅ Ready *(pull from here, top = highest priority)*
| ID | Title | Size | Seat |
|---|---|:--:|---|
| ENG-001 | 🎮 Lock the engine (decision + spike) | M | ENG |
| DES-001 | Extract systems specs + tuning parameter tables | M | DES |
| PROD-001 | Board & process bootstrap | S | PROD |

### 🧊 Blocked / Waiting
| ID | Title | Blocked on |
|---|---|---|
| ENG-002 | Project scaffold & conventions | ENG-001 |
| ENG-003 | CI: headless build + test on push | ENG-002 |
| ENG-004 | Input system (controller + KB/M, rebindable) | ENG-002 |
| ENG-005 | Debug console & live tuning panel | ENG-002, DES-001 |
| LVL-001 | Greybox kit v0 (0.5 m grid modules) | ENG-002 |

### 🔧 In Progress *(WIP limit: 3)*
| ID | Title | Agent / since |
|---|---|---|
| — | | |

### 👀 Review
| ID | Title | Needs |
|---|---|---|
| — | | |

### ✔ Done
| ID | Title | Date |
|---|---|---|
| — | *(concept phase tracked in GameConceptTracker changelog)* | |

### 📋 Backlog *(by milestone — promoted to Ready as deps clear)*

**M0 — Foundations:** ENG-002 · ENG-003 · ENG-004 · ENG-005 · LVL-001 · **GATE-G0**
**M1 — The Toy 🔥:** GP-101 · GP-102 · GP-103 · GP-104 · GP-105 · GP-106 · GP-107 · QA-101 · LVL-101 · **GATE-G1 🎮**
**M2 — Vertical Slice:** GP-201 · GP-202 · GP-203 · GP-204 · GP-205 · UI-201 · LVL-201 · DES-201 · AUD-201 · QA-201 · **GATE-G2 🎮**
**M3 — Co-op:** NET-301 · DES-301 · NET-302 · NET-303 · NET-304 · NET-305 · LVL-301 · QA-301 · **GATE-G3 🎮**
**M4 — Production (epics):** ART-401 · ART-402 · ART-403 · ART-404 · ART-405 · ART-406 · LVL-401 · LVL-402 · LVL-403 · GP-401 · UI-401 · AUD-401 · **GATE-G4 🎮**
**M5 — Beta & Meta (epics):** BE-501 · BE-502 · BE-503 · ENG-501 · ENG-502 · QA-501 · **GATE-G5 🎮**
**M6 — Launch (epics):** MKT-601 · MKT-602 · MKT-603 · MKT-604 · REL-601 · **GATE-G6 🎮**

---

# Card Details

> Format: each card = context → deliverable → acceptance criteria. Briefs are written to be self-contained for a fresh agent session (with the repo's three docs as standing context).

---

## M0 — Foundations

### PROD-001 · Board & process bootstrap — `S` `PROD`
**Deps:** none
**Brief:** Confirm the board/process docs are committed and coherent; add a `docs/decisions/` folder for decision records (ADR-style, one file per locked decision, starting with the engine when ENG-001 closes).
**Accept:** `BUILD_SCHEDULE.md` + `KANBAN.md` on main branch · `docs/decisions/README.md` explains the format · tracker changelog notes production kickoff.

### ENG-001 · 🎮 Lock the engine (decision + spike) — `M` `ENG` **[HUMAN DECISION]**
**Deps:** none
**Brief:** Recommendation on the table: **Godot 4.x** (text-format scenes = clean git diffs for agents, headless CI, built-in high-level multiplayer, free; PC-first per tracker §3). Agent prepares the decision: build the same 5-minute spike in Godot (and Unity if contested) — greybox room, capsule character walking/jumping, one particle emitter, headless test run in CI. Write up findings as `docs/decisions/001-engine.md` with a filled-in recommendation. **Human makes the call.**
**Accept:** decision doc merged with human sign-off · tracker §3 updated with locked engine · spike project committed and CI-green.

### ENG-002 · Project scaffold & conventions — `S` `ENG`
**Deps:** ENG-001
**Brief:** Initialize the real project: folder layout (`/src` or engine-idiomatic, `/art/concepts`, `/docs/design`, `/docs/decisions`, `/tests`), `.gitignore`, formatter/linter config, glTF 2.0 import defaults (1 unit = 1 m, Y-up per tracker §3), 0.5 m grid snap defaults, `CONTRIBUTING.md` with the naming conventions from tracker §9.8 and branch/commit rules from BUILD_SCHEDULE §6.
**Accept:** empty scene opens and runs · conventions doc exists · a sample `env_` asset imports at correct scale.

### ENG-003 · CI: headless build + test on push — `S` `ENG`
**Deps:** ENG-002
**Brief:** GitHub Actions workflow: on push, headless import + build, run the test suite, export a dev build artifact. Fail loudly. This is the backbone of agent verification — most cards' Definition of Done runs through it.
**Accept:** pushing a broken test fails the workflow · green run produces a downloadable dev build.

### ENG-004 · Input system — `S` `ENG`
**Deps:** ENG-002
**Brief:** Input abstraction layer with controller + KB/M from day one (tracker §3). Logical actions (move, jump, interact, aim, spray, nozzle-cycle, crouch) mapped, rebindable, hot-swappable mid-play. No gameplay code reads raw keys, ever.
**Accept:** demo scene prints logical actions from both device types · remap persists across restart.

### ENG-005 · Debug console & live tuning panel — `M` `ENG`
**Deps:** ENG-002, DES-001
**Brief:** In-game debug overlay: console commands (spawn fire, fill water, teleport, toggle godmode) + a tuning panel that live-edits every parameter from the DES-001 tables (water pressure, heat rates, spread speed…) with save-to-file. This tool is how G1 "find the fun" iteration happens at conversation speed instead of recompile speed.
**Accept:** change a fire-spread value at runtime and watch behavior change · export tuned values back into the parameter file.

### DES-001 · Systems specs + tuning parameter tables — `M` `DES`
**Deps:** none *(parallel with ENG-001)*
**Brief:** Split tracker §6 into per-system design specs in `/docs/design/`: `water-hose.md`, `fire-heat.md`, `smoke-oxygen.md`, `civilians.md`, `run-rules.md`. Each spec: behavior description, edge cases, and a **parameter table** (name, initial value, expected tuning range, units) — e.g. `hose_drag_per_segment`, `heat_gain_rate`, `oxygen_zone_charges: 5`. These tables become the single source of truth the tuning panel (ENG-005) reads.
**Accept:** five specs merged · every tunable in tracker §6 appears in exactly one table · no spec contradicts the tracker (or tracker is updated via changelog).

### LVL-001 · Greybox kit v0 — `S` `LVL`
**Deps:** ENG-002
**Brief:** Untextured modular kit on the 0.5 m grid per tracker §9.5: floor slab, wall, ledge block, bolted ladder, doorway (2.4 m), stairs, fire-door placeholder, spigot marker, window. Floor-to-floor height 4 m. Cool-slate / warm-tan two-tone vertex color only (safe/hot readability from the first greybox).
**Accept:** kit pieces snap cleanly on grid · a two-story test shell assembles in under 10 min of editor work.

### GATE-G0 · Foundations review — `S` `PROD` **🎮**
**Deps:** all M0 cards
**Accept (from BUILD_SCHEDULE §3):** engine locked & recorded · CI green · human walks/jumps a greybox room at 60 fps · tuning panel live-edits a value. → Promote M1 cards to Ready.

---

## M1 — The Toy 🔥 *(prove the hose before anything else)*

### GP-101 · Character controller v1 — `M` `GP`
**Deps:** GATE-G0
**Brief:** Run/jump controller tuned **snappy + weighty** (tracker §9.7 feel target): acceleration curves, coyote time, jump buffering, landing squash hook. Hero capsule at 1.2 m proportions. All values in the DES-001 parameter tables. This is the foundation every other verb sits on — feel quality here is non-negotiable.
**Accept:** traversal of LVL-001 test shell feels responsive at 60 fps · coyote/buffer verifiable in tests · zero hardcoded tuning values.

### GP-102 · Climb suite — `M` `GP`
**Deps:** GP-101
**Brief:** Ladders (mount/dismount top & bottom), ledge hang + mantle, crouch-crawl (smoke prep). Grid-predictable: any LVL-001 ledge block is grabbable, any ladder climbable, no bespoke markup per instance (tracker §9.4 rule 5 — platforming must read as fair).
**Accept:** an agent-scripted bot can ladder + mantle through a 3-story greybox in tests · crawl reduces height to clear 1 m gaps.

### GP-103 · Hose system core — `L → split on pull` `GP`
**Deps:** GP-101
**Brief:** The signature mechanic (tracker §6). Hose as carried inventory item: connect/disconnect at spigots with the **pressure ramp-up moment**, water drawn from spigot supply (finite), segment extension for reach, **length-based movement drag** (the co-op haul hook lands in M3). Rope/verlet sim acceptable; robustness > realism — hose must never wedge the player.
**Split suggestion:** 103a connect/disconnect + supply · 103b segments + drag physics.
**Accept:** connect→spray→disconnect→reconnect loop works across two spigots · drag scales with deployed length per parameter table · no soft-lock in 10 min of adversarial play.

### GP-104 · Water & nozzle modes — `M` `GP`
**Deps:** GP-103
**Brief:** Water emission with mist / stream / blast modes (spread, range, consumption per mode from parameter tables), water meter, placeholder VFX (faceted particles fine — real shader is ART-404). Water must visibly *hit things* — impact feedback even in greybox.
**Accept:** three modes visually & mechanically distinct · supply drains per table values · spray-on-fire interaction point exposed for GP-106.

### GP-105 · Water propulsion (rocket jump) — `M` `GP`
**Deps:** GP-104
**Brief:** High-pressure downward blast launches the player (tracker §6: ties platforming to water economy). Launch impulse vs. water cost from tables; teammate-launch stub interface (implemented in NET-304). This is the award-clip move — bias toward generous, readable, repeatable.
**Accept:** player clears a 4 m floor gap via propulsion · cost makes it a *decision* not a default · bot test verifies deterministic launch height for fixed parameters.

### GP-106 · Fire system v1 — `L → split on pull` `GP`
**Deps:** GATE-G0 *(parallel with GP-10x)*
**Brief:** Grid-cell fire sim: ignition, time-based spread, density, suppression when hit by water (per-mode effectiveness), fire doors block spread when closed (tracker §6). **Deterministic, fixed-tick, headless-runnable** — non-negotiable, it's what makes QA-101 and M3 netcode possible. Visuals = emissive placeholder cells.
**Split suggestion:** 106a sim core + tests · 106b suppression + fire doors.
**Accept:** identical seed + inputs ⇒ identical sim state (test-enforced) · suppression clears a corridor in greybox · fire door demonstrably contains a spread.

### GP-107 · Heat & overheat — `S` `GP`
**Deps:** GP-106
**Brief:** Fire density → zone heat → player heat gain; overheat stagger state; cool-down in safe zones. Debug heat-vision overlay so testers see what the player will eventually *feel* through art (cool = safe color language, tracker §9.2).
**Accept:** standing in dense fire staggers per table timings · retreating to cool zone recovers · overlay matches sim state.

### QA-101 · Headless sim regression suite — `S` `QA`
**Deps:** GP-106
**Brief:** CI-run determinism + behavior tests for the fire/water sim: golden-state snapshots for seeded scenarios (spread containment, suppression, door behavior). Any future change that alters sim outcomes fails CI until the snapshot is consciously re-blessed.
**Accept:** suite runs in CI < 2 min · a deliberate sim change fails it · re-bless procedure documented.

### LVL-101 · The Hose Gym — `M` `LVL`
**Deps:** GP-102, GP-103, GP-105, GP-107
**Brief:** A vertical greybox gauntlet purpose-built to answer G1: 4–5 floors forcing connect→spray→climb→repeat — spigot relocation, a fire-blocked corridor, a propulsion-only ledge, one optional risk/reward detour. No objectives, no timer, no fail state: **pure toy**.
**Accept:** all M1 verbs exercised in one continuous climb · completable in ~5 min by a familiar player · adversarial 15-min session finds no soft-locks.

### GATE-G1 · 🎮 "Is the hose fun?" — `S` `PROD` **[KILL/PIVOT GATE]**
**Deps:** all M1 cards
**Brief:** Agent prepares: dev build of the hose gym, one-page playtest script, feedback form (replay desire / propulsion discovery / verbatim hose description). **Human plays.**
**Accept (pass):** tester replays voluntarily · uses propulsion unprompted · calls the hose fun unprompted. **Fail:** open tuning/pivot cards against DES-001 tables; M2 stays locked.

---

## M2 — Vertical Slice *(one full mission, solo)*

### GP-201 · Smoke & ceiling accumulation — `M` `GP`
**Deps:** GATE-G1
**Brief:** Smoke volumes accumulating at ceiling height in enclosed corridors → forces crouch-crawl (GP-102). Cap opacity ~70%, **never occlude a platform edge or grab-point** (tracker §9.3) — enforce via placement rules, not luck. Audio-dampening hook for AUD-201.
**Accept:** corridor fills over table-driven time · crawling under works · ledge visibility audit passes in smoke-filled test room.

### GP-202 · Oxygen masks & share-to-revive — `S` `GP`
**Deps:** GP-201
**Brief:** Mask = limited consumable (~5 zone-charges, tracker §6) enabling upright movement through smoke; sharing your mask revives a passed-out civilian (the costly-compassion mechanic). Mask-on visual state per tracker §11 (collar swap).
**Accept:** charges deplete per zone · share transfers per table cost · revive interaction completes on a downed test dummy.

### GP-203 · Civilian AI — `L → split on pull` `GP`
**Deps:** GP-202, GP-107
**Brief:** Civilians: idle/trapped, passed-out (revivable via GP-202), escort-follow with slower speed, severe slowdown in high heat, vulnerable to fire/heat (their death = team fail). Pathing only needs corridor-following competence — they're cargo with feelings, not tactical actors.
**Split suggestion:** 203a states + revive · 203b escort-follow + heat response.
**Accept:** full chain in greybox: find passed-out civ → revive → escort through cleared corridor → civ slows in heat → reaches extraction zone.

### GP-204 · Run state machine — `M` `GP`
**Deps:** GP-203
**Brief:** Mission lifecycle: briefing → timer running → objectives (civilians aboard) → extraction (helo zone) → win, or **any death = team fail** (tracker §6). Results screen with time + stats (leaderboard-shaped for BE-501). Restart loop fast — "run it back" is the hook (tracker §5).
**Accept:** win and all fail paths reachable and clearly communicated in greybox · restart < 5 s.

### GP-205 · Map view & run-specific gear — `S` `GP`
**Deps:** GP-204
**Brief:** In-run building map (floors, spigots, known gear spots — tracker §6 Gear & Discovery) + run-seeded gear spawns (masks, hose segments, portable water). No permanent unlocks, ever.
**Accept:** map readable mid-action · gear placement varies by seed · pickup integrates with inventory.

### UI-201 · HUD v1 — `S` `UI`
**Deps:** GP-204
**Brief:** Water, heat, oxygen charges, timer, objective ticker. **Grayscale-readable** (tracker §9.4 rule 4), diegetic-leaning where cheap. Placeholder styling on Warm Paper tone — real visual pass in M4 (UI-401).
**Accept:** all five readouts legible in a grayscale screenshot · nothing overlaps reserved screen-center.

### DES-201 · Decision: exit types per-building vs universal — `S` `DES` **[HUMAN DECISION]**
**Deps:** GATE-G1
**Brief:** Pinned in tracker §14, blocks LVL-201 authoring. Agent drafts `docs/decisions/00X-exit-types.md` with the case each way (rec on table: per-building, for level identity). Human signs.
**Accept:** decision doc signed · tracker §7/§14 updated.

### LVL-201 · Alpha skyscraper greybox — `L → split on pull` `LVL`
**Deps:** GP-204, DES-201, LVL-101 learnings
**Brief:** The tracker §8 building: tall skyscraper, civilians near top, rooftop helo extraction, ~30 min target session (tracker §3). Difficulty curve: floors 1–2 teach, mid floors combine, top floors test. Environmental storytelling per §9.4 rule 6 (bathroom = spigot, hallway = ledges). Use LVL-001 kit only.
**Split suggestion:** 201a floors+layout · 201b fire/civ/gear placement + pacing pass.
**Accept:** full mission playable solo start→finish · completable ~30 min on first honest attempt · all systems (smoke, oxygen, civs, gear, map) exercised.

### AUD-201 · Audio v1 — `S` `AUD`
**Deps:** GP-204
**Brief:** Placeholder-but-shippable-shape SFX set (hose spray per mode, pressure spool-up, fire crackle, footsteps, UI ticks), adaptive-intensity music hook (intensity driven by heat/timer per tracker §7), smoke dampening filter wired to GP-201's hook. Library/CC0 sources fine; final suite is AUD-401.
**Accept:** a blindfolded listener can tell calm vs. danger vs. spraying · dampening audibly engages in smoke.

### QA-201 · Full-run integration test — `S` `QA`
**Deps:** LVL-201
**Brief:** Scripted bot completes the entire skyscraper mission headless in CI (climb, suppress, revive, escort, extract). The single highest-value regression net in the project.
**Accept:** green in CI · breaking any core verb fails it.

### GATE-G2 · 🎮 Solo slice playtest — `S` `PROD`
**Deps:** all M2 cards
**Accept (BUILD_SCHEDULE §3):** full solo mission start→finish ~30 min · all fail states readable · tester articulates the "run it back" pull unprompted. → Unlocks M3.

---

## M3 — Co-op *(the multiplier)*

### NET-301 · Netcode architecture spike + decision — `M` `NET` **[HUMAN DECISION]**
**Deps:** GATE-G2
**Brief:** Spike both candidate topologies against the deterministic sim (GP-106): (a) host-authoritative client-host with sim lockstep/state-sync, (b) dedicated/relay server. Measure: desync behavior, join latency, implementation cost, Steam Datagram Relay fit. Decision doc; human signs. Rec on table: client-host + deterministic sim, relay for NAT.
**Accept:** two-client demo syncing fire spread · decision doc signed · NET-302..305 re-scoped against it.

### DES-301 · Decision: final player count — `S` `DES` **[HUMAN DECISION]**
**Deps:** GATE-G2
**Brief:** Tracker §14 pin. Rec: confirm 1–4, tuned for 2–3 (tracker §3). Affects NET scope, LVL pacing, UI. Decision doc; human signs.
**Accept:** signed · tracker §3/§14 updated.

### NET-302 · Player sync, lobby, invite — `L → split on pull` `NET`
**Deps:** NET-301, DES-301
**Brief:** Sessions: host/create, Steam invite/join, lobby in firehouse staging, player movement + verb sync (controller, climb, hose carry-state).
**Accept:** 2 clients traverse the hose gym together · join mid-lobby works · verbs replicate < perceptible delay on LAN.

### NET-303 · World-state sync (fire/smoke/water) — `M` `NET`
**Deps:** NET-302
**Brief:** The determinism payoff: sync the sim per NET-301's model. Desync detection (state hash) + recovery. QA-101 suite extended to multi-client.
**Accept:** 3 full-mission runs × 2 clients with zero unrecovered desyncs · hash-check tooling in debug console.

### NET-304 · Co-op verbs — `M` `NET` `GP`
**Deps:** NET-302
**Brief:** The mechanics that make co-op matter (tracker §6): two-person hose haul (drag relief), teammate water-launch (GP-105 stub), revive downed teammate, hand-off carries. These create the award-winning "we almost had it" stories — feel-polish counts even now.
**Accept:** each verb demoed by 2 clients · haul measurably relieves drag · launch sends a teammate to a propulsion-only ledge.

### NET-305 · Disconnect / rejoin — `S` `NET`
**Deps:** NET-303
**Brief:** Drop handling that doesn't waste a 25-minute run: disconnected player's character held safe briefly, rejoin into the run, host migration documented as out-of-scope-for-now if costly (decision note).
**Accept:** kill a client mid-run → rejoin → run continues coherently.

### LVL-301 · Firehouse hub greybox — `M` `LVL`
**Deps:** NET-302
**Brief:** The cozy valve (tracker §4/§7): hub with call board (mission select), active-fire board, character locker (customization stub), social space. Multiplayer staging — players gather here, host picks mission, everyone drops in (teleport per tracker §14 lean).
**Accept:** lobby→hub→mission-select→co-op-drop flow works end to end.

### QA-301 · Co-op integration test — `S` `QA`
**Deps:** NET-303, NET-304
**Brief:** Two headless clients complete a scripted co-op mission in CI, including one haul and one teammate launch.
**Accept:** green in CI · desync hash verified at extraction.

### GATE-G3 · 🎮 2-player online playtest — `S` `PROD`
**Deps:** all M3 cards
**Accept (BUILD_SCHEDULE §3):** 2 players online full skyscraper mission · an organic co-op moment occurs · 0 desyncs across 3 runs. → Unlocks art production.

---

## M4 — Production *(epics — split into cards at promotion time)*

> Art begins only after G3: design is locked, so nothing gets painted twice. Every concept goes through the §10 prompt library; the approved Tank sheet is the style anchor; §10.6 consistency workflow + §9.8 sidecar-prompt archiving are mandatory. 🎮 art approvals are human.

| ID | Epic | Size | Notes |
|---|---|:--:|---|
| ART-401 | 🎮 Tank model + rig | L | §9.6 budget (1,200–2,500 tris, LOD1 ~600), §9.7 skeleton (~25 bones, hose + tank sockets), masked variant (§11) |
| ART-402 | Animation set | L | Full §9.7 state list, snappy + weighty; squash on landings |
| ART-403 | 🎮 Environment kit art pass | L | T3 prompt → modeled kit replacing LVL-001 greybox 1:1 on-grid; §9.3 materials (vertex color / gradient atlas, no PBR maps) |
| ART-404 | VFX suite | M | Fire (emissive gradient §9.3), smoke (ceiling volumes, ≤70% opacity), water (flat transparent + faceted foam) — the signature-mechanic glow-up |
| ART-405 | 🎮 Civilian lineup ×4 | M | T4 prompt: office worker, elderly, chef, kid; 600–1,200 tris; palette distinct from firefighter |
| ART-406 | 🎮 Firehouse hub art | M | T5 mood → full art pass; golden-hour cozy |
| LVL-401 | Skyscraper art pass | L | Kit-swap + lighting + §9.4 readability audit (incl. grayscale check) |
| LVL-402 | Building 2 | L | New layout archetype (e.g. renovation site per S2); design→greybox→test→art |
| LVL-403 | Building 3 | L | Third archetype; launch content = 2–3 buildings, **scope fence per tracker §3** |
| GP-401 | Character customization | M | Recolor coat/stripes only — never reserved Brick Red, never silhouette (tracker §11) |
| UI-401 | UI/HUD visual pass | M | Warm Paper tone, §9.2 palette, grayscale rule re-audited |
| AUD-401 | Full audio suite | L | Adaptive soundtrack (heat/time intensity), dispatch/radio chatter, smoke dampening, victory stings (tracker §7) |
| GATE-G4 | 🎮 Art-complete slice review | S | vs. style anchor + §9.4 rules · 60 fps with full art |

---

## M5 — Beta & Meta *(epics)*

| ID | Epic | Size | Notes |
|---|---|:--:|---|
| BE-501 | Leaderboards | M | Per-building speed/score boards (tracker §7); GP-204 results schema feeds it |
| BE-502 | Challenge rotation | M | **Human decision: daily vs weekly** (tracker §14; rec weekly); older challenges stay replayable |
| BE-503 | Matchmaking / relays | M | Steam networking; public lobby list optional, friends-first |
| ENG-501 | Optimization pass | M | 60 fps on GTX 1060 (tracker §3); draw-call budget per §9.3 one-material rule |
| ENG-502 | Settings & accessibility | M | Video/audio/rebinds (ENG-004 pays off), colorblind audit (palette already grayscale-safe), comfort options |
| QA-501 | External playtest program | M | ≥20 strangers, structured waves, feedback funnel; crash telemetry |
| GATE-G5 | Beta gate | S | >99% crash-free · median fun ≥ 4/5 · perf target met |

---

## M6 — Launch *(epics)*

| ID | Epic | Size | Notes |
|---|---|:--:|---|
| MKT-601 | 🎮 Steam page + capsule | M | Key art from prompt S1 (The Arrival); name decision **finally due** (tracker §1 candidates) |
| MKT-602 | 🎮 Trailer | M | Shot list = prompts S1–S6; hose propulsion (S5) is the thumbnail moment |
| MKT-603 | Next Fest demo cut | M | Hose gym + skyscraper floors 1–3; demo telemetry |
| MKT-604 | Press kit | S | Fact sheet, GIFs (rocket jump, clutch revive), logo, screenshots |
| REL-601 | Release candidate | M | Cert checklist, soak tests, day-one patch plan |
| GATE-G6 | 🎮 Ship decision | S | "Proud to show the A Short Hike devs" bar |

---

## Post-launch parking lot *(explicitly fenced out of launch scope)*
- Procedural building generation (tracker §7 — roadmap-only until the fun is proven at scale)
- Additional classes: Bean Scout, Bold Cartoon Hero, Nimble Sprout (tracker §11 — concept via T1 first)
- New exit types, seasonal events, console ports

---

## Board changelog
- **2026-06-11** — Board created. M0–M3 fully carded with agent briefs; M4–M6 carded as epics. ENG-001, DES-001, PROD-001 placed in Ready.
