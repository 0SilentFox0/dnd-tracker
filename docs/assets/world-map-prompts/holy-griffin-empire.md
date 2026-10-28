# Holy Griffin Empire

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Holy Griffin Empire, a kingdom of Ashan.

Geography: Central-northern heartland of Ashan: rolling green and golden farmland, scattered forests and low hills, a mountain chain along the eastern edge, rivers flowing south towards the coast, a major crossroads in the middle. Temperate climate.

Neighbours (keep the borders consistent): Ygg-Chall woods and Irollan to the west, Grimheim mountains to the north, Ranaar steppe beyond the eastern mountains, Silver Cities desert coast to the south-west, Heresh badlands to the south-east.

Settlements to depict as small illustrated icons in these places: Talonguard (capital, white towers on a hill, centre-west), Stonehelm (fortified stone city at the foot of the eastern mountains), Eridan's Crossing (river town at a crossroads, south-centre).

## Technical

- Aspect ratio: 704:373 (matches the placeholder crop of the Ashan map, 704x373 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x2119); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
