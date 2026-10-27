# Silver Cities

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Silver Cities, a kingdom of Ashan.

Geography: Sun-baked southern lands: golden desert and dry steppe, a few oases, a long irregular coast with peninsulas, red rock hills and a mountain spur in the north. Arid climate.

Neighbours (keep the borders consistent): Holy Griffin Empire to the north, Heresh across the eastern strait, Savage Sea to the south and west.

Settlements to depict as small illustrated icons in these places: Al Safir (domed white-and-blue wizard city, north-centre), Karthal (port city on the western coast), Listmoor (inland trade city, south-west).

## Technical

- Aspect ratio: 704:501 (matches the placeholder crop of the Ashan map, 704x501 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x2847); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
