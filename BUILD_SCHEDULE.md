# 🗓️ Build Schedule — Production Plan

> Companion to [`GameConceptTracker.md`](GameConceptTracker.md) (the *what*) and [`KANBAN.md`](KANBAN.md) (the *now*).
> This file is the *when and why* — milestones, gates, risk ordering, and the process for running an agent team.

**Status:** Pre-production · Sprint 0 ready to start
**Last updated:** 2026-06-11

---

## 1. Production Philosophy

This schedule is **risk-ordered, not feature-ordered**. The concept tracker's own verdict (§12) names the
#1 risk: *if hose/water logistics interrupt platforming flow, the energy dies.* So we prove the hose is fun
**before** building content, prove the solo loop **before** netcode, and prove co-op **before** any art
production. Every milestone ends in a **gate** — a human playtest or review with explicit pass / pivot /
kill criteria. Nothing downstream of a failed gate gets built.

**The three laws of this production:**
1. **Greybox until the gate passes.** No art-pass work on anything whose design can still change.
2. **The toy before the game.** A player should want to spray the hose in an empty room before we add a single objective.
3. **Determinism is a feature.** The fire/water sim is built deterministic + headless-testable from day one, because M3 netcode and CI regression tests both depend on it.

---

## 2. Milestone Map

| # | Milestone | Question it answers | Gate | Est. agent-sessions |
|---|---|---|---|:--:|
| **M0** | Foundations | Can we build & test this repeatably? | G0: engine locked, CI green, walkable greybox | ~10 |
| **M1** | The Toy 🔥 | **Is the hose fun?** (kill/pivot gate) | G1: 🎮 human playtest of hose gym | ~18 |
| **M2** | Vertical Slice | Is one full mission compelling solo? | G2: 🎮 solo skyscraper run, start→finish | ~22 |
| **M3** | Co-op | Does co-op multiply the fun? | G3: 🎮 2-player online full mission | ~20 |
| **M4** | Production | Does it look & sound like the approved canon? | G4: 🎮 art-complete slice vs. style anchor | ~35 |
| **M5** | Beta & Meta | Does it survive strangers & scale? | G5: external playtest wave, 60 fps on target HW | ~20 |
| **M6** | Launch | Are we proud to ship it? | G6: RC approved, store live | ~15 |

**Indicative wall-clock** (at ~10 agent-sessions/week, human gates add latency):
G1 ≈ week 3 · G2 ≈ week 6 · G3 ≈ week 9 · G4 ≈ week 14 · G5 ≈ week 18 · launch window ≈ week 20–24.
Treat these as planning anchors, not promises — **gates move dates; dates never move gates.**

---

## 3. Milestone Detail & Gate Criteria

### M0 — Foundations *(Sprint 0)*
Engine decision (ENG-001 — the one blocking human decision), project scaffold, CI with headless test
runs, input abstraction (controller + KB/M day one per tracker §3), greybox kit on the 0.5 m grid,
debug tuning console, and splitting the tracker's systems into parameter-table design specs.

**Gate G0 (review):** engine recorded in tracker §3 · CI builds + tests on every push · a person can walk/jump
around a greybox room at 60 fps · tuning console can live-edit a value.

### M1 — The Toy 🔥 *(highest-risk first)*
Character controller (snappy + weighty per §9.7), climb suite (ladder/ledge/crawl), the full hose system
(carry, spigot connect with pressure ramp, segments, drag penalty), nozzle modes, water-propulsion rocket
jump, fire spread sim with suppression, heat/overheat. Ends in the **hose gym** — a vertical greybox
gauntlet exercising the connect→spray→climb→repeat loop.

**Gate G1 (🎮 kill/pivot):** in a 10-minute unguided session, does the tester (a) replay voluntarily,
(b) use water propulsion without being told, (c) describe the hose as fun in their own words?
**Fail → we tune or pivot the hose; we do not proceed to M2 on a dead toy.**

### M2 — Vertical Slice *(the loop, solo)*
Smoke + oxygen economy, civilians (AI, passed-out/revive, escort, heat slowdown), run state machine
(timer, anyone-dies-team-fails, extraction), map + run-specific gear, HUD v1, alpha skyscraper greybox
(§8: civilians near top, rooftop helo), placeholder audio with adaptive-intensity hook.

**Gate G2 (🎮):** one full mission completable solo in ~30 min · fail states all reachable and readable ·
tester can articulate the "we almost had it — run it back" pull.

### M3 — Co-op *(the multiplier)*
Netcode architecture spike → decision, player sync + lobby/invite, world-state sync (fire/smoke/water —
this is why determinism was law #3), co-op verbs (hose haul, teammate launch, revive, carry),
disconnect/rejoin, firehouse hub greybox as the multiplayer staging area.

**Gate G3 (🎮):** two players online complete the full skyscraper mission · a co-op-only moment
(haul or launch) happens organically · desync count = 0 across three runs.

### M4 — Production *(content & art)*
Art only begins now, against locked design. Tank model/rig/anims per §9.6–9.7, environment kit art pass,
VFX shaders (fire/smoke/water per §9.3), civilian lineup, skyscraper art pass + buildings 2–3, firehouse
hub, customization, full audio suite. The §10 prompt library drives every concept; approved hero sheet is
the style anchor.

**Gate G4 (🎮):** art-complete slice reviewed against the readability rules (§9.4) and palette (§9.2) ·
grayscale-readability check passes · 60 fps holds with full art.

### M5 — Beta & Meta
Leaderboards, challenge rotation, matchmaking/relays, settings + accessibility, optimization to
GTX 1060 / 60 fps, external playtest waves with structured feedback.

**Gate G5:** ≥ 20 external testers complete a mission · crash-free rate > 99% · median fun rating ≥ 4/5 ·
perf target met.

### M6 — Launch
Steam page + capsule (prompt S1 exists), trailer (S1–S6 are the shot list), Next Fest demo cut, press kit,
release candidate, day-one patch plan.

**Gate G6:** RC soak passes · store assets approved · we'd show this to the devs of A Short Hike without flinching.

---

## 4. Blocking Decisions (human, scheduled)

These are pinned in tracker §14. Each is a ticket on the board, scheduled at the **last responsible moment** — the point where it starts blocking work:

| Decision | Ticket | Must be decided by | Recommendation on the table |
|---|---|---|---|
| Engine | ENG-001 | **Now** (blocks everything) | Godot 4.x — text-format scenes diff cleanly in git (agent-friendly), headless CI, built-in high-level multiplayer, free; PC-first per §3 makes weaker console story acceptable. Unity is the fallback if netcode ecosystem outweighs. |
| Netcode topology | NET-301 | Start of M3 | Host-authoritative client-host + deterministic sim |
| Player count final | DES-301 | Start of M3 | Keep 1–4, tune for 2–3 (tracker §3) |
| Exit types: per-building vs universal | DES-201 | LVL-201 authoring | Per-building (level identity) |
| Rotation cadence daily/weekly | BE-502 | M5 | Weekly (content cost realism) |

---

## 5. Workstreams & Agent Seats

Cards are tagged by workstream. Think of these as **seats** you can assign any agent session to:

| Tag | Seat | Owns |
|---|---|---|
| `ENG` | Tech / build | Engine, CI, perf, tooling |
| `GP` | Gameplay | Controller, hose, fire, heat, smoke, civilians |
| `NET` | Netcode | Sync, lobby, sessions |
| `LVL` | Level design | Greybox kits, hose gym, skyscraper, hub |
| `ART` | Art pipeline | Concepts (via §10 prompts), models, rigs, anims, VFX |
| `AUD` | Audio | SFX, adaptive music, mix |
| `UI` | UX/UI | HUD, menus, customization UI |
| `QA` | Quality | Headless sim tests, integration runs, playtest ops |
| `BE` | Backend | Leaderboards, rotation, matchmaking |
| `DES` | Design | Spec extraction, tuning tables, decision docs |
| `MKT` | Marketing | Store, trailer, demo, press |
| `PROD` | Production | Board hygiene, changelogs, gate reviews |

---

## 6. How Agents Work This Board (process rules)

1. **One card = one agent session.** Cards are sized S (1 session), M (2–3), L (must be split before pulling). If a card balloons mid-session, stop, split it, update the board.
2. **Pull only from ✅ Ready.** A card is Ready when all its `deps` are Done and its acceptance criteria are testable. Don't cherry-pick from Backlog.
3. **WIP limit: 3.** Max three cards In Progress across all agents. Finish before starting.
4. **Branch & commit discipline:** branch `ticket/<ID>-slug`, every commit message starts with the ticket ID.
5. **Definition of Done:** acceptance criteria demonstrably met · tests pass in CI (headless where possible) · `KANBAN.md` card moved + dated · tracker changelog updated if design changed · no TODOs without a follow-up card.
6. **🎮 cards are human gates.** Agents prepare them (build, test plan, questions) but a human plays/judges. Agents never self-certify "fun," "feel," or "on-model."
7. **Tuning values live in the design parameter tables** (DES-001), never hardcoded — so find-the-fun iteration is data edits, not code rewrites.
8. **Every session ends with the board true.** If the board says it, it happened; if it happened, the board says it.

---

## 7. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|:--:|:--:|---|
| 1 | Hose interrupts platforming flow (tracker §12) | Med | **Fatal** | M1 gate is kill/pivot; tuning console; hose gym built for this exact question |
| 2 | Fire/water sim can't sync in co-op | Med | High | Determinism from day one (QA-101); NET-301 spike before commitment |
| 3 | Scope creep into procedural/classes/4 buildings | High | High | Roadmap-fenced: procedural & extra classes are post-launch; launch = 2–3 buildings (§3) |
| 4 | Art drifts off the approved canon | Med | Med | §10.6 consistency workflow enforced; G4 grayscale + palette audit |
| 5 | Agent throughput ≠ human-paced playtesting | High | Med | Gates batched; external playtest wave scheduled early in M5 |
| 6 | "Cozy but tense" tone collapses to one side | Low | Med | Firehouse hub = cozy valve; G2/G3 testers asked tone questions explicitly |

---

## 8. What "Award-Winning" Means Here (so we don't forget)

Indie awards are won on **a single excellent feeling, coherence, and polish density** — not feature count.
Ours is the hose: suppression + mobility + co-op tension in one verb. The schedule protects it three ways:
M1 exists solely to perfect it, M4 gives it the signature VFX/audio treatment, and M6's juice pass budgets
disproportionate polish into connect→spray→climb→repeat. If we have to cut, we cut buildings, classes,
and meta — never hose feel.
