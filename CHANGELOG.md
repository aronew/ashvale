# Changelog

## Chapters III–VI — The west road, the Choir, the wood, the Warrens and the fire beneath

**The world.** Eight new regions joined to the original vale by waystones and doors:
Hearthgate (a walled town with a market, a forge, a tavern, a chapel, a canal and a
quay), Whisperwood Deep, the Ashen Crypt, the Sunken Warrens, the Emberdeep, and three
town interiors. The vale's terrain and entity order are untouched so existing saves
still map to their own objects.

**The story.** Four new chapters with twenty-two named NPCs, sixteen side quests and a
repeatable bounty board. Quests are data-driven, evaluated against live game state, and
nothing is missable — every weapon, outfit and spell is still obtainable after the ending.

**Combat.** Seven weapon classes with their own combos, reach, timing and stagger weight;
a committed heavy strike on X; poise and stagger; criticals; burn and bleed; dodge-cancel
and a perfect-dodge window that refunds focus and slows time; a focus meter feeding a
per-weapon-class focus attack; six spells swappable in the field; eighteen enemy
archetypes and five telegraphed three-phase bosses.

**The swing.** Rebuilt so one pose function drives both the blade and a tapered blade-tip
ribbon — the arc on screen is the arc the model swung. Blade length is now weapon-scaled
rather than derived from hit reach, which is what made the old swing read as a scythe.

**Getting stronger.** Ten weapons, temperable to +5 at Dain's anvil. Eight outfits from
Lys's loom that change armour, speed, spell power, critical chance and forging cost, and
visibly recolour the character. Three benches, three shops, an ember-mark economy.

**Presentation.** Per-zone terrain baking with seam dithering and cliff faces, top-down
pitched-roof buildings, twenty-five procedural props, a day/night cycle with real
lighting, per-region music, and weapon-class combat sound.

**Gating.** The deep stair stays sealed until the Warren Devourer drops its sigil, so the last dungeon cannot be wandered into at level five.

**Persistence.** Save schema version 2 under the same storage key, with a tested version 1
migration. Resource nodes regrow and ordinary enemies return; bosses stay dead.

**Verification.** `npm test` adds a full six-chapter playthrough driven through the model's
own actions, plus per-zone traversability, portal pairing, quest coherence, economy,
respawn and hostile-save tests. `npm run check` now parses every module and resolves every
import. Automated Chromium QA found no console errors across all nine regions, every
weapon class, every spell, supers, heavy attacks and every panel. Hand-played feel testing
and real-device touch testing have **not** been done.

## Repository handoff

- Imported the current two-chapter playable game into `aronew/ashvale`.
- Added contributor and AI-agent instructions, including a Claude Code entry point.
- Documented architecture, save compatibility, assets, deployment separation, known limitations, and future expansion ideas.
- Added a dependency-free local server and repeatable check commands.
- Made legacy-save tests self-contained so fresh clones do not need the separate Sites Git history.

## Chapter II — The lights beyond

- Changed attack/gather from J to Z throughout input and interface help.
- Added three timed sword swings, a stronger cleave finisher, combo buffering, trails, body movement, and impact feedback.
- Added the Moonfen, ranged cinder wisps, three beacon objectives, and the Hearthblade blessing.
- Preserved existing local-save compatibility and original entity IDs.

## Chapter I — The Hollow Wakes

- Added original pixel-art exploration, gathering, inventory, crafting, farming, combat, village restoration, a guardian encounter, and browser-local saving.
