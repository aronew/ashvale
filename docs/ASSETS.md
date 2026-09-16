# Asset notes

`dist/sprites.png` is the original generated transparent RGBA atlas, 1254×1254 pixels. It is arranged as four columns by four rows. Use the actual image dimensions divided by four; the source cells are fractional (313.5px) and the current renderer scales them into 96×96 canvases.

| Row | Column 1 | Column 2 | Column 3 | Column 4 |
| --- | --- | --- | --- | --- |
| 1 | Hero down | Hero up | Hero left | Hero right |
| 2 | Tree | Ore | Chest | Lantern |
| 3 | Cottage | Ruined cottage | Hearth | Cave arch |
| 4 | Slime | Bat | Wren | Moonleaf |

The visual direction is dark top-down fantasy, charcoal outlines, teal foliage, burgundy clothing and roofs, copper/amber lighting. Keep transparency, padding, and perspective consistent when adding assets. Prefer a new atlas or explicitly named individual sprite files over rearranging the existing atlas.

Terrain, weapon trails, combat effects, telegraphs, and UI are drawn in code. Sound is synthesized with Web Audio; there are no external music files. Moonfen beacons reuse lantern artwork, and wisps reuse the bat sprite with a color treatment.

The reference gameplay recording was used only to understand the intended feel. It is not shipped and must not be treated as an asset pack. No third-party game art or audio has been imported. The repository has no selected open-source license; do not invent attribution claims or grant new redistribution rights on the owner's behalf.
