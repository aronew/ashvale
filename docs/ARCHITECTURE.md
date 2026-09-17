# Architecture and extension points

## Runtime

A dependency-free static HTML application. `index.html` loads `game.js` as an ES module; it imports `core.mjs`, `render.mjs`, `ui.mjs` and `audio.mjs`, and `core.mjs` imports the four pure data modules under `dist/data/`. A modern browser supplies Canvas 2D, native dialog elements, localStorage, pointer events, requestAnimationFrame, and optional Web Audio. There is no ChatGPT/Sites runtime dependency or browser-agent tool registration.

```
index.html
└── game.js          input, camera, frame loop, event routing, saving
    ├── core.mjs     the whole simulation (no DOM, no canvas, no storage, no timers)
    │   └── data/    content.mjs · world.mjs · spawns.mjs · quests.mjs  (pure tables)
    ├── render.mjs   terrain baking, sword motion, entities, effects, lighting, maps
    ├── ui.mjs       HUD and panels
    └── audio.mjs    synthesized music and sound
```

Keep `core.mjs` and everything under `dist/data/` free of browser APIs. That boundary is what makes `tests/playthrough.mjs` able to play the entire game in Node.

## Model: `dist/core.mjs`

`Game` owns every zone's tile map, the player, the inventory (`bag`), quest flags, quest state, gear, objects, enemies, projectiles, particles, shockwaves, floating text and an event queue. `update(dt, input)` advances the simulation. The action entry points are `attack`, `heavyAttack`, `dash`, `cast`, `useSuper`, `heal`, `interact`, `craft`, `upgradeWeapon`, `equip`, `buy`, `sell`, `startQuest`, `completeQuest`, `takeBounty`, `claimBounty`, `setZone`, and the three legacy chapter actions `repair`, `rekindle` and `lightBeacon`.

### Zones

`ZONES` in `data/world.mjs` lists nine regions, each with its own dimensions, map builder, spawn point, light mode and music theme. `game.zone` selects the active one; `game.map` is a getter onto `game.maps[game.zone]`.

Objects and enemies live in **one flat array each**, tagged with a `zone`. `index()` buckets solid objects into a 96px grid per zone so `walkable` stays cheap on the larger maps, and groups entities per zone. `here()` and `props()` return the active zone's entities and re-index automatically if the arrays are swapped wholesale (which tests do).

Tile codes 0–6 keep their original meanings (void, grass, path, water, stone, bridge, garden); 7–23 add cave, rock, dirt, wood, rug, lava, market, moss, crystal, ember, sand, cinder, chasm, wall, ash, thicket and field. `SOLID` lists what blocks movement; `HAZARD` lists floors that burn.

Travel is by `portal` objects. `PORTALS` defines every pair two-way, with the arrival tile in the target zone. `setZone` clears transient state, nudges the player to open ground if the arrival tile is ever blocked, marks the zone visited, and fires a `zone` event. A portal may carry `needs` (an item id) and `locked` (the line the player reads instead); the deep stair uses this, and the item it needs drops from the boss rather than from a quest hand-in, so the road can never be sealed by work the player has not turned in.

### Combat

Each weapon class has its own swing table in `data/content.mjs`: `SWINGS` (sword, 3 hits), `DAGGER_SWINGS` (4), `GREAT_SWINGS` (2), `SPEAR_SWINGS`, `SABER_SWINGS`, `MAUL_SWINGS`, `GLAIVE_SWINGS`, plus one `HEAVY` entry per class. A swing entry is the single source of truth for both the model and the renderer:

| Field | Used by | Meaning |
| --- | --- | --- |
| `duration` | both | total swing length in seconds |
| `impact` | both | when damage lands, and where the renderer's trail begins |
| `range`, `cone` | model | hitbox reach and arc threshold |
| `multiplier` | model | damage scale |
| `poise`, `shock`, `chain`, `bleed` | model | stagger weight and finisher extras |
| `arc`, `style`, `lunge` | renderer | blade sweep, motion curve, body drive |

`attack()` starts or buffers a swing; `update()` calls `strike()` exactly once when `attackDuration - attack >= impact / weaponSpeed`. Damage is `round(attackPower × multiplier)`, criticals multiply by 1.85. `attackPower()` is `upgradedPower(weapon.power, upgradeLevel) + (level-1)×3 + beacon blessing + outfit attack`. A fresh save is the worn hearthblade at 17, which is why legacy damage numbers still hold.

The combo continues for 0.7s after a swing ends; early presses buffer for 0.2s; holding the attack input starts the next swing when the current one finishes. Dodging cancels a swing. The body lunges along `swing.lunge` during the wind-up, but never while an enemy is inside 46px, so a swing cannot carry you past your target.

Non-boss enemies have `poise`; enough poise damage staggers them for 1.25s, during which they take 30% more damage. Bosses do not stagger. `hitEnemy` owns armour, stagger, knockback, floating numbers, focus gain and death.

Enemy behaviour is selected by the `ai` field on each `ENEMIES` entry: `chase`, `flier`, `lunger`, `caster`, `kiter`, `shielded`, `blinker`, `slammer`, and five bespoke `boss-*` blocks. Bosses pick moves at random from a per-phase pool, telegraph them, and change phase at 66% and 33% health. Every AI uses local steering; there is no pathfinding.

### Progression

Chapter I and II still run on the original flags (`met`, `cottage`, `boss`, `hearth`, `beacon0..2`, `beacons`, `upgrade`). They are presented as quests `q-hearth` and `q-beacons` marked `auto`, and `syncAutoQuests()` opens and closes them from those flags. It runs from `event()` whenever a state-changing event fires, guarded against re-entry.

Everything after Chapter II uses the data-driven engine in `data/quests.mjs`. A quest is a list of steps of kind `flag`, `talk`, `kill`, `collect`, `reach`, `interact` or `craft`. `stepDone` evaluates a step against live game state rather than a stored cursor, so progress cannot desynchronise from the world. `questReady` means every step is satisfied; `completeQuest` consumes `collect` materials, pays out, and is idempotent.

Rewards can grant experience, ember marks, items, a weapon, an outfit, a spell, a recipe, or a flag. Everything is obtainable after the ending; nothing is missable.

## Browser layer

- `render.mjs` bakes each zone's terrain once into an offscreen canvas (keeping at most three), dithers the seams between ground types, draws cliff faces only where rock meets open ground, and draws the town's buildings as top-down pitched roofs. Entities are sorted by ground line. A screen-space lighting pass fills a darkness colour chosen by the zone's light mode and the day/night curve, then punches holes for the player, lamps, fires, beacons, crystal and spell effects. Outfits are produced by hue-shifting only the hero sprite's garment pixels (hue band 296–360), leaving skin, hair and charcoal outlines alone.
- **Every colour treatment is baked once into a cached canvas.** `drawSprite` never sets `ctx.filter` during a frame; each filter forces its own compositing pass and measured at two thirds of the frame budget in the larger regions. Enemy tints, node tints, hit flashes and darkened sprites all go through `tinted(src, filter)`, keyed off a `key` property set on each source canvas.
- The sword is drawn from one `bladePose(swing, phase, impactPhase)` function that also generates the tapered blade-tip ribbon, so the arc on screen is the arc the model swung. Blade length comes from `BLADE_LEN` per weapon class, deliberately shorter than the hitbox reach.
- `ui.mjs` owns every panel and the HUD. UI buttons call the same model actions as the keys.
- `game.js` maps keyboard, mouse and touch to model actions, runs the camera with a small lead in the facing direction, applies hitstop and slow-motion, and turns model events into sound, banners, panels, effects and saves.

## Safe feature additions

- **New region:** add a builder and a `ZONES` entry, a two-way `PORTALS` pair, a `SPAWNS` block and map labels. Run the traversability test — it walks every zone from its spawn and asserts nothing is walled in.
- **New enemy:** add an `ENEMIES` entry with an existing `ai`, drops and an atlas sprite plus a tint; add a silhouette mark in `enemyFlourish` if it shares a sprite with something else.
- **New weapon:** add a `WEAPONS` entry, a swing set (or reuse a class), a `HEAVY` entry if the class is new, a `BLADE_LEN`/`BLADE_WIDTH` entry, and a recipe or quest reward so it is obtainable. The test suite checks obtainability.
- **New item, outfit or spell:** add it to the tables and to a recipe or reward. The content-sanity test fails on anything unreachable or misspelt.
- **New quest:** add it to `QUESTS` with a giver who exists, requirements that resolve, and steps whose targets exist. `tests/playthrough.mjs` will start and finish it.
- **New combat animation:** change the swing table, never the renderer alone. Model impact timing and renderer phase read the same fields.

