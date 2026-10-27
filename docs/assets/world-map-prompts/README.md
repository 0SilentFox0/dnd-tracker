# World map prompts

One prompt per Ashan kingdom (geography and settlements follow the Might and Magic wiki and the `MapAshan.jpg` overview). The seed (`pnpm seed-world-map <campaignId>`) fills every kingdom's nested map with an enlarged crop of the overview map as a temporary image.

## Replacing a placeholder

1. Generate an image from the kingdom's prompt file with an image model. Keep the aspect ratio listed in the file, at least 4000 px on the longer edge, WebP or JPEG up to 20 MB.
2. Open the world map editor (`/campaigns/<id>/dm/world`), select the kingdom's nested map and use «Замінити картинку» in the map settings.
3. Because coordinates are normalised (0..1) and the aspect ratio is unchanged, markers stay where they were; adjust any that no longer sit on their settlement.

Files: `holy-griffin-empire.md`, `irollan.md`, `grimheim.md`, `silver-cities.md`, `heresh.md`, `ranaar.md`, `ygg-chall.md`, `twilight-archipelago.md`.
