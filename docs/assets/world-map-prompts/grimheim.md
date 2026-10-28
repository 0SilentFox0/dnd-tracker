# Grimheim

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Grimheim, a kingdom of Ashan.

Geography: Rugged snow-capped mountain range in the north: sharp peaks, deep valleys, glaciers, narrow passes, a frozen coast on the Sea of Shadows. Cold climate.

Neighbours (keep the borders consistent): Irollan forests to the west, Holy Griffin Empire lowlands to the south, Ranaar steppe to the east, Sea of Shadows to the north.

Settlements to depict as small illustrated icons in these places: Tor Myrdal (dwarven citadel carved into the mountain, centre-right), Northern Peaks (landmark: highest summits, upper left).

## Technical

- Aspect ratio: 368:277 (matches the placeholder crop of the Ashan map, 368x277 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x3011); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
