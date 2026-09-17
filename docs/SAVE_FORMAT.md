# Save compatibility

Current storage key: `ashvale-adventure-v1`. Current serialized schema marker: `version: 2`. The loader accepts **1 and 2**. The key deliberately did not change: a key change would orphan existing players rather than migrate them.

Local saves are origin- and browser-specific. There is no account backend, cloud sync, or implemented export/import UI. The GitHub repository does not contain real player saves.

## Serialized fields

| Field | Since | Meaning |
| --- | --- | --- |
| `version` | 1 | Schema marker; loader accepts 1 and 2 |
| `player` | 1 | Position, health, level, XP, stamina, kills, facing, focus, and transient fields; the loader restores only selected persistent ones |
| `bag` | 1 | Item counts. Version 1 knew `wood`, `stone`, `herb`, `essence`, `potion`, `core`; version 2 adds iron, coal, leather, silk, fang, crystal, cinder, moonsteel, relic, seed, warrenkey, elixir and `coin` |
| `flags` | 1 | Chapter milestones, the tempered-blade flag, beacon completion; version 2 adds `forgeOpen`, `forgeDiscount`, `loomOpen`, `warrenOpen`, `ending` |
| `removed` | 1 | IDs of harvested nodes and opened chests |
| `objects` | 1 | Per-ID hp, garden growth/ripe state; version 2 adds `respawnAt` and `lit` |
| `enemies` | 1 | Per-ID hp; version 2 adds `dead`, the absolute time an enemy returns (`-1` means never) |
| `time` | 1 | Accumulated simulated play time |
| `zone` | 2 | Which region the player is standing in |
| `clock` | 2 | Position in the day/night cycle, 0–1 |
| `gear` | 2 | Equipped weapon, outfit and spell |
| `weapons` | 2 | Owned weapons mapped to their temper level, 0–5 |
| `outfits`, `spells`, `recipes` | 2 | What has been unlocked or learned |
| `quests` | 2 | Per-quest `{ state, counts }` |
| `bounty` | 2 | The bounty in hand and its kill count |
| `killLog` | 2 | Lifetime kills per enemy type |
| `visited` | 2 | Regions the player has reached |

Not persisted as active state: projectiles, particles, shockwaves, floating text, current combat animations, enemy casting or burrow state, summoned enemies, UI dialogs, sound state. Garden and respawn time advance only during active simulation; there is no offline growth.

`objects` is written sparsely — only entries that differ from their construction defaults — so the save does not grow with the world.

## Version 1 → 2 migration

The constructor builds current defaults, then `restore` overlays what the save actually contains. There is no destructive rewrite step, so a version 1 save simply gains the new world:

- Missing bag keys keep their defaults, so a legacy player arrives with 25 ember marks rather than 0.
- Missing flags become `false`.
- No `zone` means `vale`, which is where every version 1 save left off.
- No `gear` means the worn hearthblade; if `flags.upgrade` was set, the tempered blade is equipped instead, so a legacy player's attack still reads 24.
- `quests` is absent, so `syncAutoQuests` reconstructs Chapters I and II from the original flags. A legacy player who finished Chapter II is immediately offered Chapter III.
- Enemies recorded dead in a version 1 save are given a respawn time rather than being resurrected instantly.

`tests/expansion.mjs` asserts all of this against the frozen version 1 model, including that every original object keeps its exact type and position.

## Compatibility rules

Original generated objects use sequential `oN` IDs produced by `build()`. Changing the random seed, the placement filters, the vale's tiles inside the original resource-generation bounds, or the order of the original `add` calls can silently map old saves to the wrong objects. **The vale's `makeMap` and the original build sequence in `core.mjs` are frozen** and marked as such in both files. Append new entities after that sequence with explicit, namespaced IDs — `p-*` portals, `c-*` chests, `nd-*` nodes, `pr-*` props, `npc-*` people, `m-*` monsters, `lamp-*` lights.

Never change the storage key merely to avoid a migration. If a schema change is necessary, write an explicit old→new migration, preserve the old save until validation succeeds, and test fixtures representing fresh, mid-quest, and completed games.

The loader clamps rather than trusts: levels cap at 99, health cannot exceed max health, item counts are floored into range, flags must be literal `true`, and an unknown weapon, outfit, spell, quest, bounty or zone falls back to a valid default instead of throwing. A save it cannot read at all is ignored and the player starts fresh — it is never partially applied. This is enough for locally corrupted data; it is **not** a validated import path for untrusted saves. Improve validation further before exposing save import.

Treat inventory or progression values as local game state, not trusted authorization data.

## Test fixture

`tests/fixtures/core-v1.mjs` is the original Chapter I model, copied from source commit `48b38942ed8278c223c5805c12648cf88bbe3e1b` in the prior Sites source repository. Keep it frozen. Migration tests must work from a fresh GitHub clone without access to that separate repository or its commit history.
