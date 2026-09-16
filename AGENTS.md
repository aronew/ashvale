# Agent instructions for Ashvale

These instructions apply to this repository. Follow the current user's request first and read any narrower instructions before editing their directory.

## Start of task

1. Read `README.md`, `docs/ARCHITECTURE.md`, `docs/SAVE_FORMAT.md`, and `docs/ROADMAP.md`.
2. Inspect `git status` and preserve unrelated changes.
3. Identify the affected model, UI, rendering, persistence, and test paths before editing. The roadmap describes ideas; implement only the requested scope.
4. Run `npm test` and `npm run check` before and after meaningful gameplay changes. If a baseline fails, report it rather than hiding or deleting the check.

## Project invariants

- `dist/` contains hand-authored production source. Never delete it as a generated build folder.
- Keep `core.mjs` independent of DOM, canvas, localStorage, timers, and network APIs. This makes deterministic model tests possible.
- `game.js` translates input into model actions and consumes `game.events` for UI/audio. UI buttons and keyboard input must call the same model actions.
- **Z is attack/gather.** Update control hints, help, accessibility labels, README, and touch equivalents together if controls change.
- Combat damage occurs once at the configured swing impact, not on every animation frame. Keep visuals and hit timing aligned. Preserve combo reset, buffering, and held-input behavior.
- Preserve existing save keys, entity IDs, flags, and schema compatibility. Append entities or give new entities explicit unique IDs; never insert into the original generated object sequence. Add a migration and a legacy-save regression test before changing the schema.
- Keep `tests/fixtures/core-v1.mjs` frozen. It is historical migration-test input, not a second current implementation.
- Validate quest reachability, finite resource availability, progression gates, and one-time rewards. Avoid softlocks.
- Native dialogs pause the world. Clear held input on blur/panel transitions. Keep coarse-pointer controls usable.
- Do not replace the art direction, framework, or save system as incidental cleanup. No external packages are needed today; justify additions.
- Do not copy protected reference-game assets. Check `docs/ASSETS.md` before modifying the atlas.

## Verification and handoff

Run the model tests and syntax/assets checks. For input, camera, animation, or layout changes, also run the manual browser checklist in `CONTRIBUTING.md` when browser access is available. Say explicitly when visual or browser QA was unavailable; model tests do not prove appearance or usability.

Update relevant docs and `CHANGELOG.md` for user-visible changes. Include what changed, why, tests run, and remaining limitations in the PR or final handoff.

## Publication

GitHub is the source repository; the existing live site uses a separate Sites publishing pipeline. Do not claim a push automatically deploys it. Read `docs/DEPLOYMENT.md`, and never change the live audience, overwrite hosting identity, reset saves, force-push, or add secrets as incidental implementation work. Follow the user's publication instructions and the selected hosting provider's workflow.
