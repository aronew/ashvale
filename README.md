# Ashvale

An original, single-player pixel-art action RPG for the browser. Explore a lantern-lit village, gather supplies, restore its hearth, then carry its light into the Moonfen.

**Current playable release:** Chapters I and II, including Z-based three-hit combat combos.

[Play the hosted game](https://ashvale-hollow.aronew-shop.chatgpt.site) (currently owner-private).

## Run locally

Requires Node.js 20 or later. No runtime packages, dependency installation, API keys, or build step are required.

```sh
git clone https://github.com/aronew/ashvale.git
cd ashvale
npm run dev
```

Open http://127.0.0.1:4173. The development server serves `dist/`, not the repository root. Stop with Ctrl+C. Change the port with `PORT=8080 npm run dev` if needed.

```sh
npm test            # Combat, progression, and legacy-save regression tests
npm run check       # Syntax and required-asset checks
```

Do not open `index.html` using `file://`: the game uses ES module imports.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| **Z** / left mouse | Attack and gather; tap or hold to chain swings |
| E | Talk, open caches, harvest, interact with buildings and beacons |
| Space | Dodge |
| Q | Ember burst |
| R | Drink healing tonic |
| I | Inventory and crafting |
| L | Quest journal |
| M | World map |
| Esc | Pause / close panel |

Touch screens have a movement pad and action buttons. Sound is optional and synthesized in-browser.

## What is implemented

- **Chapter I:** talk to Wren, collect 12 timber and 8 stone, repair the workshop, defeat the Rootbound, and rekindle the hearth.
- **Chapter II:** head east into the Moonfen, fight cinder wisps with telegraphed firebolts, and light three beacons using two ember dust each. Completion gives +8 attack, faster stamina recovery, and three tonics.
- Crescent cut → rising backhand → sundering cleave, with different weapon trails, body movement, impact timing, and a stronger finisher.
- Farming moonleaf, tonic crafting, a tempered blade, local saves, a map, and a journal.

## Project map

| File | Purpose |
| --- | --- |
| `dist/core.mjs` | Game state, map, collisions, enemies, combat, quests, save data |
| `dist/game.js` | Canvas rendering, controls, DOM panels, audio, local storage |
| `dist/index.html` | Game shell and interface markup |
| `dist/style.css` | Responsive HUD, dialogs, touch controls |
| `dist/sprites.png` | Original 4×4 transparent sprite atlas |
| `tests/expansion.mjs` | Executable game-logic regression tests |
| `tests/fixtures/core-v1.mjs` | Frozen original game model for migration tests |
| `scripts/serve.mjs` | Dependency-free local HTTP server |

**`dist/` is authored source, not disposable build output.** There is no separate `src/` directory.

## Start here when contributing

Read [AGENTS.md](AGENTS.md), then [architecture](docs/ARCHITECTURE.md), [save compatibility](docs/SAVE_FORMAT.md), and [current status / roadmap](docs/ROADMAP.md). Claude Code starts from [CLAUDE.md](CLAUDE.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for the development checklist.

## Saves and deployment

Progress is stored in browser localStorage under `ashvale-adventure-v1`. It is tied to the browser and origin; local development does **not** automatically inherit the hosted game's save. There is no cloud-save service.

GitHub stores source. Pushing here does **not** update the existing hosted game. See [deployment notes](docs/DEPLOYMENT.md) before publishing.

## Validation and limitations

Model-level regression tests cover combat timing, damage, combo buffering, held attack, save migration, reachable quest locations, beacon gates/rewards, ranged attacks, and dodge immunity. Syntax and assets are checked separately. Interactive browser and visual animation QA has not yet been completed; use the manual checklist before shipping changes.

This is a compact two-chapter prototype. There are no interiors, multiplayer, full character animation sheets, cloud saves, or repeatable dungeon generation yet. See the roadmap for prioritized suggestions, not promises of implemented features.

## Assets and licensing

The sprite atlas was generated for this project. No Emberville recording frames, sprites, maps, audio, or code are included. See [asset notes](docs/ASSETS.md). No open-source license has been selected; do not assume permission to redistribute this private project.
