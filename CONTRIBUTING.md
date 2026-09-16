# Contributing

Keep changes focused and preserve the existing dark, lantern-lit pixel-art direction. Start with the agent instructions even when contributing manually.

## Development loop

1. Create a feature branch from the current default branch.
2. Run `npm test` and `npm run check` for a baseline.
3. Start `npm run dev`, then open the printed local URL.
4. Make the smallest coherent change; keep model changes in `core.mjs` and UI/rendering changes in `game.js`.
5. Add regression coverage for changed behavior, especially timing, progression, resource consumption, or save migrations.
6. Run both checks again, playtest affected flows, and update the changelog and relevant docs.
7. Open a PR that explains the player-facing change and verification. Avoid unrelated formatting or dependency churn.

## Manual browser checklist

- Enter a fresh adventure; load an existing save without losing progress.
- Z and mouse chain all three swings; tapping, holding, releasing, and early buffered presses behave predictably.
- Each swing looks distinct, the blade follows the character, and impact effects match damage timing.
- Trees and ore break with the same attack action; dropped resources increment once.
- Dodge, ember burst, health, stamina, healing, and death recovery work.
- Inventory, journal, map, pause, and help open/close without leaving movement or attack stuck.
- Switching tabs or losing focus clears held inputs. Panels pause the world.
- Chapter I can be completed from scratch without developer state edits.
- Chapter II beacons are reachable, respect the hearth/resource/enemy gates, and reward completion once.
- Cinder wisp telegraphs and firebolts are readable and can be dodged.
- Reload after milestones; confirm completed objectives and consumed resources persist.
- Check a narrow mobile viewport and touch input, keyboard focus, readable HUD labels, and dialog scrolling.
- Toggle audio on/off, inspect browser console errors, and verify all local assets load.

The automated suite does not replace these checks. Report any checks you could not run.

## Save testing

Use a separate browser profile or origin for destructive/new-game tests. The pause menu's new-adventure action replaces the local save after confirmation. Do not reset a player's real save merely to test a change.
