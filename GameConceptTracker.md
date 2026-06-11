# 🚒 Game Concept Tracker

> Living design doc. Built across our ideation session.

**Status:** Concept locked · Hero character sheet **APPROVED** · Art specs + prompt library v1
**Last updated:** 2026-06-11

---

## 1. Identity
| Field | Value |
|---|---|
| Working title | _TBD_ — candidates: **Riser**, **Standpipe**, **Full Alarm**, **Ladder 6**, **Flashover**, **Climb & Contain** |
| One-line pitch | A co-op firefighting puzzle-platformer where you climb burning buildings, manage water and heat, and rescue trapped civilians before time runs out. |
| Genre | Co-op puzzle-platformer (platforming-first, resource/puzzle second) |
| Vibe / tone | Tense but cozy. Real stakes wrapped in a charming, low-poly toy-like world. |
| Reference touchstones | PEAK (challenge structure), A Short Hike / Lil Gator Game (art feel) |

---

## 2. North Star — What We're Judging Against
**A minimalist co-op platformer with real excitement and genuine stakes.**

- Platforming is the primary challenge; thermal/resource management is the layer that makes it tense.
- Easy to develop (low-poly, scoped), but emotionally high-stakes through co-op consequence.
- The hose & water system is the signature mechanic players interact with most — it must feel great.

---

## 3. Constraints & Technical Targets
| Constraint | Value |
|---|---|
| Platform | PC-first (Steam); controller + KB/M from day one |
| Performance target | 60 FPS on mid-range hardware (GTX 1060-class); low-poly art is the budget headroom |
| Co-op | Online, 1–4 players (solo playable, tuned for 2–3) — *player count pinned, see §14* |
| Target audience | Co-op players, cozy-but-challenging indie fans |
| Build scope | Indie / small team — low-poly to keep dev light |
| Session length | ~30 min per building (faster for skilled players) |
| Launch content | 2–3 hand-crafted buildings, prove the loop, then expand |
| Asset pipeline | glTF 2.0 (engine-agnostic until engine is locked), 1 unit = 1 meter, Y-up |

---

## 4. Core Experience (The Feeling)
You're at the firehouse — cozy, low-poly, social. You pick a mission, then drop into a vertical gauntlet where every decision matters. You platform upward, juggle water between mobility and fire suppression, race a timer, and lean on your teammates. If someone overheats or goes down, you choose: backtrack and risk everyone, or push for the exit. When you pull civilians onto the rescue chopper, it feels **earned**.

**Core feeling:** focused pressure + cooperative tension. Active and physical, not standing-still puzzle math. The firehouse gives breathing room so the climbs feel special.

---

## 5. Core Gameplay Loop
**Firehouse → select mission → climb building → suppress critical fires → reach civilians → manage their heat/oxygen → escort to exit → everyone survives = win.**

1. **Firehouse hub** — customize character, check the call board / active fire board, invite players, pick a mission.
2. **Climb** — platform up the building via ladders, ledges, vertical traversal.
3. **Manage resources** — find spigots, run hose, control pressure; manage heat, oxygen, smoke.
4. **Rescue** — reach trapped civilians, revive the passed-out ones, escort them through cleared corridors.
5. **Extract** — get the whole crew + civilians out (e.g. rooftop helicopter).
6. **Back to hub** — win or fail, return, regroup, run again.

**Hook:** rotating challenges, leaderboards/records, and the pull of "we *almost* had it — run it back."

---

## 6. Mechanics

### Navigation
- **Platforming = primary challenge.** Ladders, ledges, climbing, vertical traversal up the building.
- Thermal/resource management is the **secondary complexity layer** that intersects with platforming.

### Water & Hose (signature mechanic)
- Hose is an **inventory item** the player carries.
- Connects to **spigots** found in the building (bathrooms, hallways) — water isn't infinite.
- **Pressure ramp-up** animation/feel on connect (satisfying turbo-spool moment).
- **Extendable** with hose segments → more reach.
- **Disconnect / reconnect** to different spigots as you progress.
- **Portable water sources** (barrels, fillable containers from bathtubs) for untethered tactical suppression.
- **Hose length = movement penalty** — longer drag = slower; **teammates can help haul it** (co-op resource splitting).
- **Variable nozzle** spread modes: mist / stream / blast.
- **Water as propulsion** — high-pressure downward spray rocket-jumps you (or launches teammates) to higher ledges; costs more water. Ties platforming directly to water management.

### Fire & Heat
- **Fire spreads dynamically** over time (not static).
- **Fire density affects area heat** — players overheat in hot zones.
- **Fire doors** are visibly readable; suppressing one side keeps the other contained.
- **Containment-zone strategy** — advanced players redirect/funnel fire using doors + suppression to protect rescue routes.
- **Objective is safe passage, not total extinguish** — suppress only what blocks your route.

### Smoke & Oxygen
- **Smoke accumulates at ceiling height** in enclosed corridors → forces **crouch/crawl** underneath.
- **Oxygen masks** = limited-charge consumable (~5 zones) that let you move through smoke normally instead of crawling.

### Civilians (the objective)
- Positioned in **higher / more dangerous zones** → harder to reach than self-escape.
- **Slower & more vulnerable**; **slow down significantly in high heat**.
- Found **passed out from smoke** (not dead) → **revive by sharing your oxygen mask** (costs you, saves them).
- Tension: spend resources rescuing, or push for the exit?

### Gear & Discovery
- Mid-run gear finds are **run-specific** (no permanent unlocks → no power creep, fresh every run).
- **Map is visible** during the climb → skilled players plan routes to known gear; the **timer** makes backtracking a risk/reward call.

### Stakes / Failure
- **If anyone dies — player, teammate, or civilian — the whole team fails.**
- **Permadeath baseline** with **hard-to-reach revival moments** (clutch saves that cost resources/time).
- Parallel co-op paths, but the team wins or loses **together**.

---

## 7. Features
- **Firehouse hub:** character customization, matchmaking/invite, call board & active fire board for mission select.
- **Challenge rotation:** new buildings drop on a schedule (daily/weekly); **older challenges remain replayable**.
- **Leaderboards / set records** for speed and skill expression.
- **Procedural buildings** on a schedule — *roadmap / later*, once the fun is proven.
- **Multiple exit types:** helicopter, mattress/bounce-pad, pre-placed ladder. *(Pinned: per-building vs. universal — undecided.)*
- **Audio suite:** adaptive soundtrack (intensity scales with heat/time), dispatch/radio chatter, **audio dampening in smoke zones**, victory stings.

---

## 8. Alpha / Level 1 Target
**A tall skyscraper.** Civilians trapped near the top. Primary exit = **rooftop helicopter extraction**. Clean, iconic, vertical first experience.

---

## 9. Art Direction & Visual Specs

### 9.1 Aesthetic
Blocky, faceted, toy-like low-poly. Minimalist. Characters read as **chunky collectible figures** — the approved hero sheet (§11) is the canon for the whole art style. Warm storybook indie look (A Short Hike, Lil Gator Game, Bugsnax). *Not* photoreal, *not* outlined cel-shade.

### 9.2 Canonical Color Palette
Sampled from the approved hero turnaround sheet. These are the **source-of-truth hues** for all art, prompts, and shaders (values approximate; lock exact hexes when the style bible is built in-engine).

| Swatch | Hex (approx) | Role |
|---|---|---|
| Brick Red | `#C14B33` | Helmet, hose coil — **hero/hose accent, reserved**: nothing else in a level may use this hue |
| Brass Gold | `#D9A53C` | Nozzle, emblem frame, buckles-of-honor details |
| Flame Orange | `#E06B35` | Emblem flame, fire VFX core, danger glow |
| Turnout Tan | `#C8A165` | Coat/pants base; the "neutral uniform" customization canvas |
| Hi-Vis Yellow | `#E8C95C` | Reflective stripes, caution markings in levels |
| Reflective Silver | `#BFBCAD` | Stripe centers, concrete mid-tones |
| Charcoal | `#3B3833` | Boots, gloves, harness, soot |
| Steel Silver | `#A9ADB0` | Air tank, buckles, metal fixtures |
| Skin Cream | `#F2E3CE` | Faces (all characters) |
| Warm Paper | `#EDE8DC` | Concept-art background, UI paper tone |
| Cool Slate | `#7E8A96` | Safe-zone environment tint (cool = safe) |

**Temperature language:** warm hues (`Flame Orange` → red) = heat/danger; cool hues (`Cool Slate` → blue-gray) = safe. Players read temperature through color instantly, before any UI.

### 9.3 Shading & Materials
- **Flat-shaded facets:** hard edges / flat vertex normals everywhere. The facet *is* the texture.
- **Color:** vertex color **or** a single shared 256px gradient-atlas per asset category. **No normal, roughness, or metallic maps.**
- **One material per character**, one per environment kit — keep draw calls trivial.
- Matte everything; the only permitted gloss is a slight sheen on visors and water.
- **Water:** flat transparent shader, white faceted foam caps, no refraction.
- **Fire:** shader-based animated emissive (gradient `Flame Orange` core → red edge), billboard or simple mesh — negligible geometry.
- **Smoke:** soft alpha volumes hugging ceiling planes; capped at ~70% opacity and **never allowed to cover a platform edge or ledge grab-point**.
- **Shadows:** soft blob/contact shadows, hand-placed feel; no harsh realtime shadow noise.

### 9.4 Readability Rules (non-negotiable)
1. Fire is always the most saturated thing on screen.
2. Brick Red is reserved for hose/helmet so the hose reads on any background.
3. Smoke signals danger but never hides critical platforming.
4. Safe vs. hot zones are distinguishable in grayscale (value contrast, not just hue).
5. Grid-based level design so platforming reads as fair and predictable.
6. Environmental storytelling teaches play: a bathroom = a spigot; a hallway = ledges.

### 9.5 Scale & Proportions
| Spec | Value |
|---|---|
| World scale | 1 unit = 1 m, Y-up |
| Hero height | ~1.2 m (toy proportions; helmet + head ≈ 40% of height) |
| Doorways | 2.4 m tall (generous — characters are wide) |
| Floor height | 4 m (room to platform *within* a story) |
| Grid snap | 0.5 m for level modules |

### 9.6 Polycount Budgets
> Revised upward from the first draft (200–500 tris) — the approved hero sheet's faceted helmet, hose coil, and stripe geometry cannot be built at that budget without losing the chunky read. Still firmly low-poly.

| Asset | Budget (tris) | LOD1 | Notes |
|---|---|---|---|
| Hero characters | 1,200–2,500 | ~600 | Includes helmet, harness, hip hose coil, tank |
| Civilians | 600–1,200 | ~400 | Simpler silhouettes, palette-swap friendly |
| Gear (masks, nozzles, tanks) | 100–400 | — | Brass nozzle is a hero prop: top of range |
| Environment modules (ladders, rails, doors, spigots) | 50–300 | — | Authored on the 0.5 m grid |
| Building shell | 2,000–5,000 per floor | — | Modular kit assembly, heavy reuse |
| Fire / smoke / water FX | shader-based | — | Negligible geometry |

### 9.7 Rig & Animation Spec (hero)
- **Skeleton:** ~25 bones (no fingers — mitten gloves; 2 spine, simple neck, IK-friendly limbs, 1 hose-attach socket at left hip, 1 tank socket on back).
- **Required state list (alpha):** idle · run · jump · ladder climb · ledge hang/mantle · crouch-crawl (smoke) · hose aim + spray (mist/stream/blast poses) · hose haul (two-person) · connect-spigot interaction · water rocket-jump launch · overheat stagger · downed · revive/share-mask · carry/escort civilian · victory sting.
- **Feel target:** snappy and weighty — anticipation frames on jumps, big squash on landings; the Tank should *feel* like 90 kg of dependable.

### 9.8 Pipeline & Naming
- Export glTF 2.0; meshes triangulated, transforms frozen, pivot at feet center.
- Naming: `char_tank_a` / `char_civ_office_b` / `env_ladder_2m` / `prop_nozzle_brass` / `fx_fire_floor`.
- Every concept render saved to `/art/concepts/` with its full prompt in a sidecar `.txt` — prompts are source files.

---

## 10. Prompt Library (Image Generation)

> **How to use:** every prompt below = `[STYLE]` + subject block (+ `[HERO]` when the Tank appears) + `[NEG]` as the negative prompt. Generate hero shots at 16:9, turnaround/prop sheets at 16:9 or 3:2, portraits at 1:1. **Always attach the approved hero sheet as an image reference** when the character appears, to stay on-model.

### 10.1 `[STYLE]` — Master Style Block (prepend to all prompts)
```
Stylized low-poly 3D game art, chunky faceted geometry with visible flat
polygonal facets, matte flat shading, soft even studio lighting, no gloss or
specular highlights, warm muted palette, toy-like collectible figure feel,
clean bold silhouettes, solid warm cream background (#EDE8DC), soft contact
shadows under subjects, cozy storybook indie aesthetic in the spirit of
A Short Hike and Lil Gator Game.
```

### 10.2 `[NEG]` — Negative Prompt (use on every generation)
```
photorealistic, PBR, glossy reflections, realistic skin, fabric weave texture,
smooth high-poly surfaces, cel-shading outlines, text, watermark, logo,
busy background, motion blur, depth of field haze, lens flare, horror,
gritty, realistic fire photography, extra fingers, realistic human anatomy
```

### 10.3 `[HERO]` — Stout Tank On-Model Block (canon, matches approved sheet)
```
A stout barrel-shaped low-poly firefighter: oversized faceted brick-red
(#C14B33) fire helmet with wide brim and a gold hexagonal flame emblem on the
front crest, pale cream face with two simple black dot eyes and no mouth, high
tan collar covering the chin, broad rounded body in a khaki-tan (#C8A165)
turnout coat with two horizontal hi-vis stripes (yellow-silver-yellow) around
the torso and cuffs, dark charcoal chest harness straps with square steel
buckles and a wide belt with silver buckle, oversized charcoal mitten gloves,
short stubby legs with huge chunky charcoal boots, a coiled brick-red fire
hose hanging at the left hip with a chunky faceted brass nozzle, and a small
silver air cylinder with a flame decal mounted on the back harness.
```

### 10.4 Hero Shots (key art / storyboard)
Each entry: intended use, then the subject block to combine with `[STYLE]` + `[HERO]` + `[NEG]`.

**S1 · The Arrival** — *store-page key art* · 16:9
```
Wide cinematic shot of three stout firefighters rappelling down the faceted
glass-and-concrete face of a burning high-rise at dusk, ropes taut, a brick-red
hose trailing in a long arc below them, warm orange fire glow spilling from
lower windows, cool blue-gray city skyline behind, a tiny helicopter circling
the rooftop, drifting low-poly embers, camera low and tilted up to exaggerate
the building's height.
```

**S2 · The Climb** — *vertical-gauntlet mood ref* · 9:16 or 16:9
```
Interior vertical shaft of a building under renovation, the stout firefighter
mid-leap between faceted concrete ledges, ladder bolted to the far wall,
churning orange fire filling the floor two stories below, a cool slate-blue
safe ledge glowing above, smoke pooling along the ceiling, strong warm-below /
cool-above lighting split that reads instantly as danger versus safety.
```

**S3 · Hose Under Pressure** — *signature-mechanic showcase* · 16:9
```
Close-up action shot: two charcoal mitten gloves gripping the chunky faceted
brass nozzle, a thick low-poly arc of bright translucent water with white
faceted foam caps blasting across frame into a wall of stylized flames, steam
puffs where water meets fire, hose line snaking taut into the foreground,
shallow staging with the fire as the brightest element in frame.
```

**S4 · Civilian Rescue** — *emotional beat / trailer still* · 16:9
```
A smoke-dimmed low-poly office corridor, ceiling hidden by a soft gray smoke
layer, the stout firefighter kneeling and holding an oxygen mask to the face
of a slumped round-bodied civilian in office clothes, a soft cool halo of
breathable air around the pair, warm fire glow flickering from a doorway far
down the hall, tender and quiet despite the danger.
```

**S5 · The Ascent** — *water-propulsion money shot* · 9:16
```
The stout firefighter rocketing straight upward on a powerful column of
faceted white-blue water blasting downward from the brass nozzle, coat
flapping, backlit by a tall glowing window, water droplets frozen as chunky
low-poly beads, a teammate reaching down from a ledge above, dynamic upward
composition with strong silhouette.
```

**S6 · Helicopter Extract** — *victory beat* · 16:9
```
Night rooftop of a skyscraper, a chunky low-poly rescue helicopter with soft
spinning rotor blur, the firefighter crew boosting the last round civilian
aboard, warm cabin light spilling onto the helipad, the city a calm grid of
cool window lights far below, faint smoke still rising from floors beneath,
relieved triumphant mood.
```

### 10.5 Asset-Sheet Templates (production)

**T1 · Character turnaround** *(format that produced the approved Tank sheet — reuse for every new character)*
```
[STYLE] + character block. Game character turnaround reference sheet on a
solid warm cream background: the same character shown in four full-body views
in a row — front, three-quarter, side, back — identical pose and proportions
in every view, plus two framed detail callout panels along the bottom showing
the character's signature accessories at larger scale, soft contact shadows,
no text or labels.
```

**T2 · Prop sheet**
```
[STYLE]. Game prop reference sheet on warm cream background: [PROP — e.g. a
chunky faceted brass hose nozzle / a brick-red wall spigot / a silver oxygen
mask] shown from three angles plus one exploded or interaction view, soft
contact shadows, consistent scale, no text.
```

**T3 · Environment kit sheet**
```
[STYLE]. Modular environment kit laid out on a grid on warm cream background:
low-poly building interior pieces — faceted concrete ledge blocks, a bolted
metal ladder, a readable heavy fire door with warning stripes, a bathroom
spigot unit, ceiling tiles, hallway rail segments — each piece separated with
even spacing, consistent 0.5 m grid scale, warm-tan and cool-slate two-tone
treatment, no text.
```

**T4 · Civilian variants**
```
[STYLE]. Character lineup on warm cream background: four round-bodied low-poly
civilians in a row — office worker with tie, elderly resident with cardigan,
chef in apron, kid with backpack — simple dot eyes, soft pastel clothing
colors clearly distinct from firefighter palette, slightly smaller and
softer-edged than the firefighter, each in a calm standing pose, no text.
```

**T5 · Firehouse hub mood**
```
[STYLE]. Cozy interior wide shot of a low-poly firehouse common room at golden
hour: a big call board with pinned mission cards, a pole, lockers with helmets,
a worn couch, warm lamplight, the stout firefighter relaxing with a mug,
peaceful and inviting, the calm-before-the-climb feeling.
```

### 10.6 Consistency Workflow
1. Approved Tank sheet = the **style anchor**. Attach it as image reference for any prompt containing a character; reuse its seed where the tool allows.
2. Lock palette: if output hues drift from §9.2, regenerate — don't color-correct canon.
3. One new variable per generation (new pose **or** new environment, not both) when extending canon.
4. Save every accepted render + exact prompt + seed to `/art/concepts/` (per §9.8).

---

## 11. Characters

### Locked Hero — "The Stout Tank" ✅ *(turnaround sheet APPROVED — canon)*
The approved sheet (front / ¾ / side / back + helmet and nozzle callouts) defines the character. Canonical written spec = the `[HERO]` block in §10.3. Key reads:
- **Silhouette:** very wide, stocky, barrel-shaped; heavy, dependable. Helmet + head ≈ 40% of total height.
- **Proportions:** small head under the **oversized brick-red faceted helmet**; enormous chunky boots; broad shoulders; big mitten gloves; tiny legs.
- **Face:** cream skin, friendly black dot-eyes, no mouth; high collar covers the chin zone → clean swap to the **oxygen-mask state** (mask replaces collar area, eyes stay visible).
- **Signature accessories:** coiled brick-red hose at left hip + chunky brass nozzle; silver air tank with flame decal on back harness.
- **Base uniform = neutral tan** on purpose → customization recolors the coat/stripes, never the reserved brick-red or the silhouette.

### Class System (direction)
The lineup doubles as **class archetypes** — all must obey the same palette (§9.2) and dot-eye face language:
- **Tank** (locked hero) — heavy, powerful, hose-forward.
- **Bean Scout** — minimal rounded capsule body, cute & simple.
- **Bold Cartoon Hero** — big-head primary-color mascot energy.
- **Nimble Sprout** — taller, lankier, athletic; leans into the platforming pillar.

*Start with one archetype (Tank), expand to classes later. Concept the other three with template T1 (§10.5).*

---

## 12. Judging Verdict

| Criterion | Score | Notes |
|---|:--:|---|
| Fun / engagement | 9 | Active loop, real tension, clutch moments. |
| Originality | 8 | Hose-as-mobility-and-suppression is a genuinely fresh hook. |
| Feasibility / buildable | 8 | Low-poly + scoped launch (2–3 buildings) keeps it realistic. |
| Appeal / market fit | 8 | Rides the co-op-challenge wave (PEAK-like); broad charm. |
| Replayability / depth | 8 | Rotation, leaderboards, run-specific gear, future procedural. |
| Cohesion | 9 | Rescue objective justifies the theme; systems reinforce each other. |
| **Total** | **50/60** | |

**Verdict:** Strong, coherent concept. The **hose & water system is the secret sauce** that ties suppression, mobility, and co-op together. **#1 risk:** keep water/hose logistics from *interrupting* platforming flow — tune for snappy connect→spray→climb→repeat pacing, or the energy dies.

---

## 13. Development Roadmap (areas needing design)
> **Now in production planning:** milestones, gates, and risk ordering live in [`BUILD_SCHEDULE.md`](BUILD_SCHEDULE.md); the live task board with agent-ready briefs is [`KANBAN.md`](KANBAN.md). The list below is the original design-area summary.

- **Gameplay mechanics** — tune water pressure/propulsion, heat & spread rates, oxygen economy, revival cost.
- **Character design** — model + rig the approved Tank (budgets §9.6, rig §9.7) incl. masked variant; concept the other classes via T1.
- **Environment design** — modular low-poly building kit (spigots, fire doors, ledges, ladders) via T3, on the 0.5 m grid.
- **Level design** — author the alpha skyscraper; define civilian placement & difficulty scaling; later: procedural ruleset.
- **Platform / tech** — engine choice, netcode for co-op, leaderboard/rotation backend, audio system.

---

## 14. Open Questions / Pinned
- Exit types: **per-building or universal?** (pinned)
- Rotation cadence: daily vs weekly?
- Co-op player count (2? up to 4?) — §3 assumes 1–4 until decided.
- Drive-to-fire vs. teleport — leaning teleport.
- Exact hex lock for §9.2 palette once in-engine.

## Changelog
- **Session start** — Tracker scaffold created.
- **Ideation session** — Full concept locked: core loop, water/hose system, heat/smoke/oxygen, civilian rescue objective, co-op stakes, firehouse hub, rotation + leaderboards, alpha skyscraper, visual design language + polycounts, hero shots, locked "Stout Tank" hero + class directions, judging verdict, dev roadmap.
- **2026-06-11 (later)** — Production kickoff: added `BUILD_SCHEDULE.md` (risk-ordered milestones M0–M6 with kill/pivot gates, agent process rules, risk register) and `KANBAN.md` (live board; M0–M3 fully carded with agent-ready briefs, M4–M6 as epics). First Ready cards: ENG-001 (engine decision), DES-001 (systems specs + tuning tables), PROD-001 (process bootstrap).
- **2026-06-11** — Hero turnaround sheet approved and adopted as style anchor. Art section rebuilt into production specs: canonical hex palette sampled from the sheet, shading/material/VFX rules, scale & proportion table, revised poly budgets (hero raised to 1,200–2,500 tris to match approved detail), rig + animation state list, pipeline/naming conventions. Hero-shot one-liners expanded into a full prompt library: master style block, negative prompt, on-model hero block, six production-ready hero-shot prompts, five asset-sheet templates, consistency workflow. Added technical targets to §3.
