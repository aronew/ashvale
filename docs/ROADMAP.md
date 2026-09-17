# Current status and expansion roadmap

## Implemented baseline

Six chapters across nine regions: Ashvale Hollow and the Moonfen (the original Chapters I and II, unchanged in feel), Hearthgate, Whisperwood Deep, the Ashen Crypt, the Sunken Warrens, the Emberdeep, and three town interiors. Twenty-two NPCs, twenty quests, six repeatable bounties, three shops, three workbenches, ten weapons across seven combo classes, eight outfits, six spells, weapon-class focus attacks, eighteen enemy archetypes and five bosses. Day/night with real lighting, resource and enemy respawn, an ember-mark economy, and a version 2 save that still loads version 1.

The original user direction is an Emberville-inspired dark top-down pixel-art adventure with original assets, characters, maps, and progression. The user explicitly chose Z for attack/gather and asked for varied, visually satisfying sword swings; X was added for the heavy strike. Preserve those choices unless asked otherwise.

## Verified

- `npm test` runs two suites: regression (combat timing, weapon tables, upgrades, stagger, armour, wards, supers, per-zone traversability, portal pairing, quest coherence, economy, respawn, legacy migration, hostile-save clamping, content sanity) and a full six-chapter playthrough driven entirely through model actions, followed by every side quest and every bench recipe.
- `npm run check` parses every module, resolves every relative import, and checks required assets and control hints.
- Automated Chromium QA: boot, play and save-reload with no console errors across all nine regions, every weapon class, every spell, supers, heavy attacks and every panel.

## Not yet verified

- **Hand-played feel.** Nobody has sat down and played this with a keyboard for an hour. Pacing, difficulty curve, and whether the combat actually feels as good as it looks are unmeasured.
- **Touch.** Verified under Chromium device emulation at phone and tablet sizes: the d-pad moves, all eight action buttons register, and nothing overlaps in either corner. It has still never been used on real hardware, where thumb reach and button size are the things that actually matter.
- **Long-session performance.** Measured at a locked 60fps in every region on a desktop Chromium, including a stress scene of thirty enemies and a boss. The largest zone bakes a 2688×1984 terrain canvas and three are cached, so memory on low-end mobile is still unmeasured. Never reintroduce a per-draw `ctx.filter`: it cost two thirds of the frame rate.
- **Accessibility.** Screen shake, time dilation and the low-health pulse honour `prefers-reduced-motion`. Text scaling, colour contrast on the smallest HUD labels and screen-reader behaviour of the new panels still need a focused review.

## Suggested next work

1. **Playtest and rebalance.** Enemy health and damage across the later regions were authored, not tuned. Expect the Warrens and Emberdeep to need adjustment once someone plays them honestly.
2. **Character animation.** Directional sprites are still transformed in code rather than drawn as frames. Run and attack sheets would raise the whole game more than any other art work.
3. **More enemy silhouettes.** Several archetypes share an atlas sprite with a tint and a small procedural mark. New atlas cells would separate them properly.
4. **Pathfinding.** Enemies steer locally and catch on terrain in the town and the crypt's pillared rooms.
5. **Save management.** Validated export/import and a recovery path, before anything cloud-shaped.
6. **A seventh region or an endgame loop.** The bounty board is the only repeatable content; a resettable dungeon would give the post-ending save somewhere to go.
7. **Music.** The synthesized motifs are four bars of arpeggio per region. Real composition would carry a lot.

## Known limitations / technical debt

- Static directional character sprites, transformed rather than animated.
- No pathfinding; local steering only.
- Several enemies reuse an atlas sprite with a colour treatment.
- No multiplayer, cloud saves, save import/export, or procedural dungeon generation.
- The vale's terrain and original entity order are frozen for save compatibility, so that region cannot be re-laid out without a migration.
- Quest text is authored in one place now, but region descriptions still appear in both `ZONES` and the map panel.
- Independent GitHub Pages workflow is included; owner activation and a verified successful deployment are still required. Other static hosts can serve `dist/` directly.

## Planning an expansion

Define the player goal, map access route, new mechanics, resource costs/rewards, stable IDs, save migration needs, asset requirements, and acceptance tests before expanding scope. Finish a coherent playable loop rather than adding disconnected decorative systems. The traversability, quest-coherence and playthrough tests will catch a region that cannot be walked, a quest that cannot be finished, and a reward that does not exist — add content and run them early.

