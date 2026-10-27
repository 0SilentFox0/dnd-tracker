# Ranaar

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Ranaar, a kingdom of Ashan.

Geography: Vast eastern grassland: endless steppe, low hills, seasonal rivers, scattered stone circles and orc war-camps, dark forest on the far east. Windy continental climate.

Neighbours (keep the borders consistent): Grimheim mountains to the north-west, Holy Griffin Empire to the west, Jade Ocean coast to the south.

Settlements to depict as small illustrated icons in these places: Steppe Camp (large orc tent encampment, centre), Eastern Plains (landmark: ancient standing stones, upper right).

## Technical

- Aspect ratio: 19:10 (matches the placeholder crop of the Ashan map, 608x320 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x2105); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
