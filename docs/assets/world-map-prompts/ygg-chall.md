# Ygg-Chall

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Ygg-Chall, a kingdom of Ashan.

Geography: Dark tangled forest at the heart of the western highlands: huge twisted roots, hidden caves, glowing fungi, mist in the valleys, a tall tower rising above the canopy. Cool, damp, twilight even by day.

Neighbours (keep the borders consistent): Irollan to the north-west, Holy Griffin Empire to the east, Silver Cities to the south, Irisus Sea to the west.

Settlements to depict as small illustrated icons in these places: Ygg-Chall Grove (landmark: the central grove with the tower).

## Technical

- Aspect ratio: 304:213 (matches the placeholder crop of the Ashan map, 304x213 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x2803); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
