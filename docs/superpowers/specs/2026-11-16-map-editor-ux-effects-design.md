# Map editor: visibility, effects, and texture guidance

## Goal

Make doors and detail tiles readable at normal map zoom, add persistent animated environmental effects, improve the editor sidebar, and explain how floor and wall textures differ.

## Decisions

- Keep gameplay doors on their existing cell edges and preserve their movement and interaction behavior. Make the door glyph cover the full edge segment. Enlarge decorative door/detail tiles to a full cell footprint in both map rendering and palette previews.
- Add an `effects` tile layer to the existing chunk format. Effects are placed per cell, saved with the map, and rendered as lightweight animated SVG/CSS overlays above terrain, tiles, walls, and tokens. They are visual only and do not affect movement, visibility, or combat rules.
- Seed the effect catalog with smoke, flame, and magical glow. The effects panel uses the existing paint, erase, picker, undo, redo, and save behavior.
- Improve sidebar navigation with clear group labels, persistent compact layer controls, and short contextual descriptions. Explicitly distinguish ground (surface covering cells) from wall fill (material drawn over wall segments).
- Size the full editor viewport below both the global header and sticky footer so the document does not scroll behind the footer; retain a small bottom inset in the independently scrolling sidebar.
- Keep Ukrainian and English UI copy in sync and respect reduced-motion preferences.

## Existing architecture

`MapEditorScreen` owns the map editor sidebar and uses `useTileEditor` for chunk painting. Tile chunks already use a versioned RLE JSONB field, so effects can use the same storage and save flow. `TileCanvas` draws raster tile layers, while `DoorsLayer` renders gameplay doors as SVG glyphs on edge keys. The effects renderer must not change the established `[data-fx-grid]` anchor contract.

## Out of scope

No door data migration, no changes to pathfinding or combat rules, no new storage service, no AI-generated effect assets, and no production deployment.

## Map catalog previews

The upstream repository contains 64 maps totaling roughly 960 MB. Do not bundle the original UVTT files. Generate compact, CC BY-SA attributed WebP thumbnails and an index into `public/assets/map-catalog`; display those immediately from the same origin. Fetch the original UVTT only after the DM explicitly chooses Add. The generated index records whether the existing editor parser accepts the map, so unsupported geometry can still be previewed and is explained before import. Refresh the static set with `pnpm maps:catalog-previews`.
