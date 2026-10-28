# Heresh

## Prompt

Hand-painted fantasy map in the style of the Heroes of Might and Magic V world map: aged parchment, ink-outlined coastlines, illustrated mountains and forests, soft watercolour shading, top-down view, no text labels, no compass, no borders or UI.

Region: Heresh, a kingdom of Ashan.

Geography: A narrow dark peninsula: grey ash-covered mountains, barren valleys, black swamps on the coast, dead forests and a bone-white river delta. Gloomy, cold, always overcast.

Neighbours (keep the borders consistent): Holy Griffin Empire to the north-west, Silver Cities across the strait to the west, Jade Ocean to the east and south.

Settlements to depict as small illustrated icons in these places: Nar-Ankar (necropolis fortress, green-lit towers, centre-south), Heresh Pass (landmark: mountain pass in the north).

## Technical

- Aspect ratio: 152:149 (matches the placeholder crop of the Ashan map, 304x298 px at source scale)
- Resolution: at least 4000 px on the longer edge (for example 4000x3921); the app downscales anything above 6000 px
- Format: WebP or JPEG, up to 20 MB
- Keep settlements at the relative positions above: markers on the nested map are placed by those coordinates, and replacing the image keeps them in place only if the aspect ratio is unchanged
