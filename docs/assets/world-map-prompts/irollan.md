# Irollan

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Irollan, a kingdom of Ashan.

Geography: Dense ancient elven forest on the north-western peninsula: giant trees, glades, a coastline with cliffs and small bays facing the Irisus Sea. Mild, humid climate.

Neighbours (keep the borders consistent): Grimheim mountains to the east, Ygg-Chall to the south-east, open sea to the north and west.

Settlements to depict as small illustrated icons in these places: Syrris Thalla (elven capital among enormous trees, north-centre), Stormcliff (cliff-top port village, south-west coast).

## Technical

- Aspect ratio: 352:267 (matches the placeholder crop of the Ashan map, 352x267 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x3034); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
