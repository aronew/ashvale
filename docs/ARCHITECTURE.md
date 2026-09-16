# Architecture and extension points

## Runtime

A dependency-free static HTML application. `index.html` loads `game.js` as an ES module; it imports `core.mjs`. A modern browser supplies Canvas 2D, native dialog elements, localStorage, pointer events, requestAnimationFrame, and optional Web Audio. Optional WebMCP tools are feature-detected and are not required to play.

## Model: `dist/core.mjs`

`Game` owns the tile map, player, inventory (`bag`), quest flags, objects, enemies, projectiles, particles, text effects, and an event queue. `update(dt, input)` advances simulation; `attack`, `dash`, `spell`, `heal`, `interact`, `craft`, `repair`, `rekindle`, and `lightBeacon` are the action entry points.

The world is 80×58 tiles at 32 world pixels per tile. Tile codes: 0 void, 1 grass, 2 path, 3 water, 4 stone, 5 bridge, 6 garden. `walkable` checks tile corners and object radii; `move` resolves axes separately. Region definitions are currently code in `makeMap`, not external map files.

`build` creates original objects in a stable sequence. New Moonfen objects use explicit IDs after the original sequence. Original enemies have `eN` IDs and `boss`; Moonfen enemies use `wispN`. Do not reorder legacy generation casually.

### Combat

`SWINGS` is the source of truth for names, duration, impact time, reach, multiplier, and arc threshold. The player stores combo stage, combo timer, attack duration, fixed attack angle, an impact-consumed flag, and a short input buffer.

| Stage | Duration | Impact | Damage multiplier | Reach |
| --- | --- | --- | --- | --- |
| Crescent cut | 0.36s | 0.10s | 1× | 78px |
| Rising backhand | 0.34s | 0.09s | 1.15× | 84px |
| Sundering cleave | 0.52s | 0.20s | 1.75× | 98px |

`attack` starts or buffers; `update` triggers `strike` once at the impact threshold. `strike` handles enemies and gatherable objects. Finisher gathering damage is two rather than one. The combo can continue for 0.7s after a swing ends; early presses are buffered for 0.2s. Held input starts subsequent swings when the current one finishes. Current near-enemy targeting can override the requested facing angle; mouse aim is not a strict targeting override.

Base attack is 17, +7 for tempered blade, +3 per level beyond level 1, and +8 for the Chapter II blessing. The guardian has extra melee reach tolerance. `hitEnemy` owns damage, knockback, drops, experience, and boss rewards.

Cinder wisps use a 0.65s directional telegraph before shooting. Projectiles collide with terrain and the player; dodge/invincibility guards prevent damage. Original enemies use pursuit/melee behavior. AI uses local steering, not pathfinding.

### Progression

Chapter I flags: `met`, `cottage`, `boss`, `hearth`. `upgrade` represents the crafted blade. Chapter II flags: `beacon0`, `beacon1`, `beacon2`, and `beacons` (completed/rewarded). Beacon actions verify proximity, Chapter I completion, nearby wisps, and resources before granting one-time rewards.

## Browser layer: `dist/game.js`

- Loads the 4×4 atlas and prepares individual canvas sprite surfaces.
- Bakes static floor geometry once, then draws visible objects/entities sorted by Y coordinate.
- Follows the player with the camera; projects interaction prompts into screen coordinates.
- Renders procedural sword motion, trails, body lean, short impact freeze, particles, health bars, and telegraphs.
- Maps keyboard/mouse/touch controls to model actions. Native dialogs and tab visibility pause simulation.
- Consumes model events for sound, banners, toasts, quest panels, saving, and completion panels.
- Periodically refreshes HUD/map information and saves every 15 active seconds, at milestones, and on page lifecycle events.
- Registers optional `read_adventure` and `open_adventure_journal` tools when supported. Their real browser integration remains unverified.

The renderer currently has some duplicated quest and region logic. When adding a third chapter, consider extracting shared content definitions rather than growing more conditional chains. This is suggested refactoring, not a requirement to rewrite the current game first.

## Safe feature additions

- **New region:** extend `makeMap`, preserve legacy generation outputs, append stable-ID objects/enemies, add region labels and map/quest guidance, and test traversability.
- **New enemy:** add explicit IDs and model AI/projectiles, renderer and telegraph behavior, rewards, save compatibility, and deterministic tests.
- **New item/recipe:** update inventory defaults, item names, model resource guards, inventory presentation, and save defaults.
- **New quest:** centralize completion guards in model methods, make rewards idempotent, update journal/HUD/dialogue/map guidance, and test old and new saves.
- **New combat animation:** keep model impact timing and renderer phases aligned; add actual animation assets if moving beyond the current transformed static sprites.
