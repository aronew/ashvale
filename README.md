# Ashvale

An original, single-player pixel-art action RPG for the browser. Wake a dead village, walk the west road to the last town still standing, and follow what is wrong with the world down to the fire underneath it.

**Current playable release:** six chapters across nine regions — the Hollow, the Moonfen, Hearthgate, Whisperwood Deep, the Ashen Crypt, the Sunken Warrens and the Emberdeep.

**Standalone and owner-controlled.** Run locally or publish `dist/` on any static host. The [independent deployment guide](docs/DEPLOYMENT.md) covers GitHub Pages and other hosts. The former ChatGPT Sites address is a separate legacy copy, not a runtime dependency.

## Run locally

Requires Node.js 20 or later. No runtime packages, dependency installation, API keys, or build step are required.

```sh
git clone https://github.com/aronew/ashvale.git
cd ashvale
npm run dev
```

Open http://127.0.0.1:4173. The development server serves `dist/`, not the repository root. Stop with Ctrl+C. Change the port with `PORT=8080 npm run dev` if needed.

```sh
npm test            # Combat, progression, world, economy, save and full-playthrough tests
npm run check       # Parses every module, resolves every import, checks required assets
```

Do not open `index.html` using `file://`: the game uses ES module imports.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| **Z** / left mouse | Attack and gather; tap or hold to chain your weapon's combo |
| **X** / right mouse | Heavy strike — costs stamina, staggers almost anything |
| Space | Dodge (invulnerable; a last-moment dodge refunds focus and slows time) |
| E | Talk, open, harvest, travel, use a workbench |
| Q | Cast the prepared spell |
| C | Prepare the next spell |
| F | Focus attack, once the focus meter is full |
| R | Drink a healing tonic |
| I | Pack, gear and crafting |
| L | Quest journal |
| M | Map of the region you are in |
| Esc | Pause / close panel |

Touch screens have a movement pad and action buttons for attack, heavy, dodge, spell and interact. Sound is optional and synthesized in-browser.

## What is implemented

**The story, in six chapters**

1. **The Hollow Wakes** — meet Wren, gather timber and stone, restore the workshop, kill the Rootbound, rekindle the hearth.
2. **The Lights Beyond** — cross into the Moonfen, clear the cinder wisps, light three beacons.
3. **The West Road / The Ashen Choir** — walk west to Hearthgate, relight Dain's forge, and find out what has been taking people from under the chapel.
4. **Roots and Ruin** — Whisperwood Deep is dying from the centre outward. Its guardian has turned.
5. **What Digs Upward** — the Sunken Warrens were a mine until something started digging back.
6. **The Fire Beneath** — forge the Reforged Hearthblade and end the Cinder Tyrant.

Plus **sixteen side quests** and a **repeatable bounty board** in the Wayfarers' Hall.

**Combat**

- Seven weapon classes, each with its own combo: a sword cuts three times, a dagger four, a greatsword twice and much harder. Reach, impact timing, arc, lunge and stagger weight are per swing.
- A committed heavy strike (**X**) on its own timing, plus poise and stagger, criticals, burn and bleed, knockback, hitstop, directional screen shake and impact sparks.
- Dodge with invulnerability frames that cancels a swing; a dodge that beats an attack by a hair grants focus and briefly slows the world.
- Every hit fills **focus**; a full meter unleashes a focus attack that differs by weapon class.
- Six spells (ember, frost, chain spark, warding light, shadowstep, sunfall), swappable in the field.
- Eighteen enemy archetypes with distinct behaviour — chargers, fliers, lungers, casters, kiters, shielded zealots, blinking shades, slammers — and **five bosses** with telegraphed, three-phase movesets.

**Getting stronger**

- Ten weapons, from the worn hearthblade to the Reforged Hearthblade, each temperable to **+5** at Dain's anvil.
- Eight outfits from Lys's loom that change armour, speed, spell power, critical chance, fire resistance and forging cost — and visibly recolour your character.
- Crafting at three benches (anvil, loom, stillroom) plus your own pack, an ember-mark economy, three shops that buy and sell, and farmable moonleaf.

**The world**

- Nine regions with their own terrain, music, light and inhabitants, joined by waystones and doors.
- Twenty-two named NPCs with their own lines and their own problems.
- A day/night cycle with real lighting: lamps, hearths, braziers, forge fires, beacons and crystal seams all cast light, and the caves are lit only by what you bring.
- Resource nodes regrow and ordinary enemies return, so the world still has something in it after the credits. Bosses stay dead.

## Project map

| File | Purpose |
| --- | --- |
| `dist/core.mjs` | Game model: zones, combat, quests, economy, save data |
| `dist/data/content.mjs` | Items, weapons, swing tables, outfits, spells, recipes, enemies |
| `dist/data/world.mjs` | Every zone's map, the town's buildings, and the portals between them |
| `dist/data/spawns.mjs` | What stands where: props, resource nodes, people, monsters, chests |
| `dist/data/quests.mjs` | NPCs, dialogue, quests, shops, bounties |
| `dist/render.mjs` | Terrain baking, sword motion, entities, effects, lighting, maps |
| `dist/ui.mjs` | HUD and every panel |
| `dist/audio.mjs` | Synthesized music and combat sound |
| `dist/game.js` | Input, camera, frame loop, event routing, local storage |
| `dist/index.html` | Game shell and interface markup |
| `dist/style.css` | Responsive HUD, dialogs, touch controls |
| `dist/sprites.png` | Original 4×4 transparent sprite atlas |
| `tests/expansion.mjs` | Combat, world, quest, economy and save regression tests |
| `tests/playthrough.mjs` | A start-to-finish run of the whole story through the model |
| `tests/fixtures/core-v1.mjs` | Frozen original game model for migration tests |
| `scripts/serve.mjs` | Dependency-free local HTTP server |

**`dist/` is authored source, not disposable build output.** There is no separate `src/` directory.

## Start here when contributing

Read [AGENTS.md](AGENTS.md), then [architecture](docs/ARCHITECTURE.md), [save compatibility](docs/SAVE_FORMAT.md), and [current status / roadmap](docs/ROADMAP.md). Claude Code starts from [CLAUDE.md](CLAUDE.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for the development checklist.

## Saves and deployment

Progress is stored in browser localStorage under `ashvale-adventure-v1`, now at schema `version: 2`. Chapter I/II saves written by the original release still load: the vale's terrain and entity IDs are frozen, and everything new defaults in. It is tied to the browser and origin; local development does **not** automatically inherit the hosted game's save. There is no cloud-save service.

GitHub is the source of truth. The included Actions workflow tests the game and creates a standalone download artifact. Enable GitHub Pages and opt into publishing to deploy independently; automatic publishing on `main` can be enabled with `ASHVALE_PAGES_ENABLED=true`. Until that setup is complete, no independent hosted URL is claimed. See [deployment notes](docs/DEPLOYMENT.md).

## Validation and limitations

`npm test` covers combat timing and damage, every weapon's swing table, upgrades, stagger and armour, wards and supers, per-zone traversability, portal pairing, quest coherence, the economy, respawn, legacy migration, hostile-save clamping, and a complete six-chapter playthrough driven through the model's own actions.

Browser QA has been done with an automated Chromium pass: the game boots, plays and reloads its save with no console errors across all nine regions, every weapon class, every spell, supers, heavy attacks and every panel. Hand-played feel testing on real hardware — particularly on touch — has **not** been done; use the manual checklist in [CONTRIBUTING.md](CONTRIBUTING.md) before shipping.

Known limitations: characters are still static directional sprites transformed in code rather than animation sheets; enemies steer locally with no pathfinding and can catch on terrain; there is no multiplayer, cloud save, save export/import, or procedural dungeon generation. See the roadmap for what is worth doing next.

## Assets and licensing

The sprite atlas was generated for this project. No Emberville recording frames, sprites, maps, audio, or code are included. All terrain, buildings, props, weapons, effects, lighting and UI are drawn in code; outfits are produced by hue-shifting the hero sprite's garment pixels. See [asset notes](docs/ASSETS.md). No open-source license has been selected; do not assume permission to redistribute this private project.

