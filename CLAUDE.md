# Ashvale: Claude Code entry point

Read and follow **AGENTS.md** in this directory. It is the canonical contributor/agent instruction file; do not maintain a divergent copy here.

For context, read:
- `README.md` — run commands, controls, current features.
- `docs/ARCHITECTURE.md` — model, renderer, input, and extension points.
- `docs/SAVE_FORMAT.md` — existing-player compatibility requirements.
- `docs/ROADMAP.md` — verified current state, limitations, suggested next work.
- `CONTRIBUTING.md` — checks and manual playtest checklist.

Quick commands: `npm run dev`, `npm test`, `npm run check`.

Layout: `dist/core.mjs` is the simulation; `dist/data/` holds pure content tables (content, world, spawns, quests); `dist/render.mjs`, `dist/ui.mjs` and `dist/audio.mjs` are the browser layer; `dist/game.js` wires input and events. `tests/playthrough.mjs` plays the whole story in Node, so keep `core.mjs` and `dist/data/` free of browser APIs.

Important: `dist/` is the source. Attack is **Z**, heavy strike is **X**. The vale's map and original entity order are frozen — existing local saves must continue to load. GitHub pushes do not automatically publish the hosted game.
