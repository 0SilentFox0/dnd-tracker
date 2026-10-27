# Twilight Archipelago

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Twilight Archipelago, a kingdom of Ashan.

Geography: Chain of misty islands in the Irisus Sea: rocky cliffs, pine and crystal groves, sheltered coves, sandbars and reefs, a lone sailing ship between islands. Cool maritime climate with perpetual dusk light.

Neighbours (keep the borders consistent): Open Irisus Sea on all sides; the continent's western coast lies to the east.

Settlements to depict as small illustrated icons in these places: Twilight Isles (landmark: the largest island with a lighthouse, centre).

## Technical

- Aspect ratio: 304:245 (matches the placeholder crop of the Ashan map, 304x245 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x3224); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
