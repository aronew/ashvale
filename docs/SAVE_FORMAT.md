# Save compatibility

Current storage key: `ashvale-adventure-v1`. Current serialized schema marker: `version: 1`.

Local saves are origin- and browser-specific. There is no account backend, cloud sync, or implemented export/import UI. The GitHub repository does not contain real player saves.

## Serialized fields

| Field | Meaning |
| --- | --- |
| `version` | Schema marker; current loader accepts 1 |
| `player` | Position, health, level, XP, stamina, kills, facing, and transient fields; loader restores only selected persistent fields |
| `bag` | Timber (`wood`), stone, herb, essence, potion, core counts |
| `flags` | Chapter milestones, weapon upgrade, and beacon completion |
| `removed` | IDs of harvested resources/opened chests |
| `objects` | Per-ID HP and garden growth/ripe state |
| `enemies` | Per-ID HP; positions return to home positions on load |
| `time` | Accumulated simulated play time |

Not persisted as active state: projectiles, particles, current combat animations, enemy casting, UI dialogs, sound state. Garden time advances only during active simulation; no offline growth.

## Compatibility rules

The constructor creates current defaults then restores supported fields. Missing new flags become false. Missing new entities keep their initial state. This permits existing Chapter I/II-era saves to gain the new Moonfen content.

Original generated objects use sequential IDs. Changing the random seed, placement filters, map tiles inside original resource-generation bounds, or the order of original `add` calls can silently map old saves to the wrong objects. Appending explicit IDs is the safest expansion method. Regression tests compare original entity type and position against a frozen legacy model.

Never change the storage key merely to avoid a migration. If a schema change is necessary, write an explicit old→new migration, preserve the old save until validation succeeds, and test fixtures representing fresh, mid-quest, and completed games. Do not silently discard invalid saves.

The present loader has basic validation, not comprehensive validation of arbitrary imported/untrusted saves. Improve validation and recovery before exposing save import. Treat inventory or progression values as local game state, not trusted authorization data.

## Test fixture

`tests/fixtures/core-v1.mjs` is the original Chapter I model, copied from source commit `48b38942ed8278c223c5805c12648cf88bbe3e1b` in the prior Sites source repository. Keep it frozen. Migration tests must work from a fresh GitHub clone without access to that separate repository or its commit history.
