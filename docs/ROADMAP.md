# Current status and expansion roadmap

## Implemented baseline

The imported game matches the hosted Chapter II release: two connected quest arcs, village restoration, gathering/farming/crafting, three-hit Z combos, Rootbound guardian, Moonfen cinder wisps and beacons, local saves, keyboard/mouse/touch input, and optional sound.

The original user direction is an Emberville-inspired dark top-down pixel-art adventure with original assets, characters, maps, and progression. The user explicitly chose Z for attack/gather and requested varied, visually satisfying sword swings. Preserve those choices unless asked otherwise.

## Suggested next work (not yet implemented)

1. **Browser playtest and combat polish.** Validate the existing motion at desktop/mobile sizes. Improve directional character animation with dedicated run/attack frames, and test whether aim assist should yield to mouse input.
2. **Content definitions.** Extract quest, item, region, and enemy definitions from long conditionals. Preserve IDs and save semantics during refactoring.
3. **Enterable village interiors.** Add a workshop and inn interior with clear entrance/exit transitions and save-safe spawn points. Avoid trapping old saves at door locations.
4. **A third quest arc.** Add a distinct biome, meaningful NPC objective, and new enemy behavior. Use explicit stable IDs and a resource/progression balance plan.
5. **Replayable encounters.** Add deliberate respawn or dungeon-reset rules so the world has activity after completion. Keep unique rewards one-time and make resets clear to players.
6. **Save management.** Add validated export/import and recovery before considering account/cloud saves.
7. **Broader progression.** Equipment choices, more recipes, inventory feedback, and differentiated weapon styles after the current combat loop is playtested.

## Known limitations / technical debt

- No completed interactive browser or visual animation QA; automated checks are model-level.
- Static directional character sprites are transformed for attacks, not true multi-frame skeletal/sprite animations. The new ranged enemy reuses the bat artwork with a different treatment and effects.
- No pathfinding: enemies may get caught on terrain/props.
- No interiors, multiplayer, cloud saves, procedural dungeon resets, or recurring enemy/resource respawn.
- World terrain is deterministic and code-defined. Existing generation is coupled to save IDs.
- Quest text and state selection are duplicated across HUD, journal, and dialogue.
- Some HUD labels are very small; accessibility, text scaling, reduced-motion handling, and narrow layouts need a focused review.
- Mouse direction can be overridden by near-enemy aim assist despite the current help text describing free aim.
- Save validation and failure recovery are basic. A damaged save should not be used as a reason to silently reset player progress.
- No automatic GitHub→live deployment pipeline.

## Planning an expansion

Define the player goal, map access route, new mechanics, resource costs/rewards, stable IDs, save migration needs, asset requirements, and acceptance tests before expanding scope. Finish a coherent playable loop rather than adding disconnected decorative systems.
