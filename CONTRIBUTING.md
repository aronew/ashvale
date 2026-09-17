# Contributing

Keep changes focused and preserve the existing dark, lantern-lit pixel-art direction. Start with the agent instructions even when contributing manually.

## Development loop

1. Create a feature branch from the current default branch.
2. Run `npm test` and `npm run check` for a baseline.
3. Start `npm run dev`, then open the printed local URL.
4. Make the smallest coherent change. Rules and state go in `core.mjs`; content tables go in `dist/data/`; drawing goes in `render.mjs`; panels go in `ui.mjs`; input, camera and event routing go in `game.js`. Keep `core.mjs` and `dist/data/` free of browser APIs — the playthrough test runs them in Node.
5. Add regression coverage for changed behavior, especially timing, progression, resource consumption, or save migrations.
6. Run both checks again, playtest affected flows, and update the changelog and relevant docs.
7. Open a PR that explains the player-facing change and verification. Avoid unrelated formatting or dependency churn.

## Manual browser checklist

**Opening and saving**
- Enter a fresh adventure; load an existing save without losing progress.
- Reload after milestones; confirm completed objectives, consumed resources, equipped gear and the region you were standing in all persist.

**Combat feel** — this is the part the automated suite cannot judge.
- Z and the mouse chain every swing of the equipped weapon; tapping, holding, releasing and early buffered presses behave predictably.
- Each swing looks distinct, the blade stays attached to the character, and impact effects land on the same frame as the damage number.
- X lands as a single committed heavy strike and staggers what it hits.
- Dodge cancels a swing; a last-moment dodge visibly slows time and fills focus.
- Focus attacks read clearly for every weapon class you can reach.
- Enemy telegraphs are readable and dodgeable — the slam rings, the aim lines, the boss wind-ups.
- Try at least a sword, a dagger, a greatsword and a spear. They should not feel like the same weapon.

**Gathering and progression**
- Trees, ore, iron, coal, crystal and cinder break with the attack action; silk, mushrooms and bones are taken with E; dropped resources increment once.
- The anvil tempers a weapon and the cost is deducted once; the loom and stillroom behave the same.
- Shops buy and sell at the listed prices and cannot be used on credit.
- A quest can be accepted, progressed, handed in once, and its materials leave the pack.

**Interface and input**
- Pack, journal, map, board, pause and help open/close without leaving movement or attack stuck.
- Switching tabs or losing focus clears held inputs. Panels pause the world.
- Every waystone and door travels both ways and lands you on open ground.
- Check a narrow mobile viewport and touch input — including the attack, heavy, dodge, spell and interact buttons — plus keyboard focus, readable HUD labels, and dialog scrolling.
- Toggle audio on/off, inspect browser console errors, and verify all local assets load.

**Story**
- Chapter I can be completed from scratch without developer state edits.
- Chapter II beacons are reachable, respect the hearth/resource/enemy gates, and reward completion once.
- The west road opens after Chapter II and Hearthgate is reachable on foot.

The automated suite does not replace these checks. Report any checks you could not run.

## Save testing

Use a separate browser profile or origin for destructive/new-game tests. The pause menu's new-adventure action replaces the local save after confirmation. Do not reset a player's real save merely to test a change.
