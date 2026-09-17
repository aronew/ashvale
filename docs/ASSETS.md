# Asset notes

`dist/sprites.png` is the original generated transparent RGBA atlas, 1254×1254 pixels. It is arranged as four columns by four rows. Use the actual image dimensions divided by four; the source cells are fractional (313.5px) and the renderer scales them into 96×96 canvases.

| Row | Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- | --- |
| 1 | Hero down | Hero up | Hero left | Hero right |
| 2 | Tree | Ore | Chest | Lantern |
| 3 | Cottage | Ruined cottage | Hearth | Cave arch |
| 4 | Slime | Bat | Wren | Moonleaf |

The visual direction is dark top-down fantasy: charcoal outlines, teal foliage, burgundy clothing and roofs, copper/amber lighting. Keep transparency, padding, and perspective consistent when adding assets. Prefer a new atlas or explicitly named individual sprite files over rearranging the existing atlas.

## What is drawn in code rather than stored

Everything in the expanded game that is not in the four rows above is procedural, so no new art files were added:

- **Terrain.** Twenty-four tile types, each painted at bake time with its own dither and texture, plus seam blending between adjacent ground types and cliff faces where rock meets open ground.
- **Buildings.** Hearthgate's fifteen structures are drawn as top-down pitched roofs with shingle courses, ridge caps, eaves, lit windows, doorways, chimney smoke and hanging signs. The curtain wall, its walkway and its crenellations are painted into the terrain bake.
- **Props.** Twenty-five kinds — stalls, barrels, crates, carts, wells, fountains, statues, pillars, shrines, campfires, braziers, forge fires, anvils, looms, cauldrons, notice boards, banners, tents, tables, bookshelves, signs, stumps and a cat.
- **Weapons and combat.** Every blade, its motion and its trail are vector-drawn per frame from the active swing's pose. Impact crescents, lightning arcs, shockwaves, dash afterimages and spell rings are likewise procedural.
- **Enemies.** Archetypes reuse the atlas's slime, bat, ore and NPC cells under CSS filter tints, with a small procedural silhouette mark drawn over each — spider legs, wolf ears and tail, a zealot's shield, an archer's bow, a golem's plating and glowing eyes, imp horns, a shade's smoke trail, a sporeling's cap. Bosses get larger flourishes: the Warden's root tendrils and glowing heart, the Devourer's chitin and mandibles, the Choirmaster's mask and candle ring, the Tyrant's crown of fire and molten cracks.
- **Outfits.** The eight outfits are the same four hero cells with the garment's hue band (296–360°) rotated and saturation scaled, cached per outfit. Skin, hair and charcoal outlines are left alone by hue range so the character stays on-model.
- **Lighting.** A screen-space darkness pass with holes punched for the player, lamps, hearths, braziers, forge fires, beacons, crystal seams and lit spells.

Sound is synthesized with Web Audio; there are no external music files. Each region has its own motif, and combat sounds are generated per weapon class.

The reference gameplay recording was used only to understand the intended feel. It is not shipped and must not be treated as an asset pack. No third-party game art or audio has been imported. The repository has no selected open-source license; do not invent attribution claims or grant new redistribution rights on the owner's behalf.
