# Map Editor UX and Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve map editor readability, add persistent animated map effects, and make floor versus wall textures clear.

**Architecture:** Keep gameplay doors on their existing edge model and render them at full edge width. Store environmental effects as IDs in the existing versioned map tile chunks, then render that layer as pointer-transparent SVG/CSS above the map. Reshape the editor sidebar around clear categories and descriptions without changing its existing editing and save hooks.

**Tech Stack:** Next.js, React, TypeScript, SVG/CSS, existing map tile RLE chunks and hooks, next-intl.

**Spec:** `docs/superpowers/specs/2026-11-16-map-editor-ux-effects-design.md`

## Global Constraints

- Preserve existing map chunk storage and version conflict behavior.
- Preserve gameplay door edge keys, hit targets, open/closed state, and lock controls.
- Environmental effects are visual only; they do not modify combat state.
- Keep the FX grid DOM anchor contract intact.
- Provide matching Ukrainian and English labels and reduced-motion behavior.

## Review Focus

- Effects on maps with no raster assets still render from tile IDs.
- Empty effect cells do not create DOM nodes; effect nodes do not intercept map input.
- Existing tile chunks with no effects remain readable and writable.
- Door glyphs stay centered on their edge at all map rotations and zooms.
- Reduced-motion settings disable continuous effect animation.

---

### Task 1: Make doors and edge details readable

**Files:**
- Modify: `components/battle/map/DoorsLayer.tsx`
- Modify: `components/battle/map/tiles/painter.ts`
- Modify: `components/maps/MapEditorScreen.tsx`
- Modify: `messages/uk/maps.json`, `messages/en/maps.json`

- [x] Render the gameplay door leaf across one full cell edge while keeping its center, rotation, lock glyph, and hit target unchanged.
- [x] Draw `edge-art` tile assets at one full cell width and height so the decorative door fills a cell.
- [x] Remove restrictive palette preview sizing for `edge-art`; use a square preview area that fills the full cell.
- [x] Update preview sizing expectations and labels in both locales.

### Task 2: Explain layers and improve sidebar navigation

**Files:**
- Modify: `components/maps/MapEditorScreen.tsx`
- Modify: `messages/uk/maps.json`, `messages/en/maps.json`

- [x] Group editor tabs into map setup and painting sections with accessible labels while keeping existing panel values and switching behavior.
- [x] Bound the editor to the viewport space below `--app-header-h` and the sticky footer; keep the sidebar independently scrollable with bottom padding so the final palette cards can be reached.
- [x] Add concise descriptions for ground, wall fill, edge details, and objects next to layer selection.
- [x] Use distinct layer button styling and keep the active layer and selected tile visible while the palette list scrolls.
- [x] Clarify in Ukrainian and English that ground covers cell surfaces and wall fill is drawn along wall lines.

### Task 3: Store and render animated effects

**Files:**
- Modify: `lib/utils/battle/tiles/types.ts`, `lib/constants/tilesets/catalog.ts`
- Modify: `components/battle/map/tiles/TileCanvas.tsx`, `components/battle/map/tiles/painter.ts`, and the map layer composition in `components/battle/map/`
- Modify: `components/maps/MapEditorScreen.tsx`
- Modify: `messages/uk/maps.json`, `messages/en/maps.json`, `messages/uk/tile-labels.json`, `messages/en/tile-labels.json`
- Modify: `components/battle/map/battle-map.css`

- [x] Add `effects` as a tile layer so existing chunk encoding, API patching, undo/redo, and versioned save continue to apply.
- [x] Add stable IDs and localized labels for smoke, flame, and magical glow. Effects have no blocking metadata and do not require raster assets.
- [x] Add an effect renderer that reads visible effect cells, emits pointer-transparent SVG marks, and uses CSS keyframes for smoke drift, flame flicker, and glow pulse.
- [x] Place the effect renderer above map art and tokens without replacing the established FX grid anchors; disable its animation under `prefers-reduced-motion`.
- [x] Add the “Special effects” panel and make it use the current tile editor's paint, erase, picker, undo, redo, and save controls.
- [x] Ensure the raster tile painter skips the procedural effects layer and does not attempt to fetch an image asset for it.

### Task 4: Integrate and review

**Files:**
- Review the files listed in Tasks 1–3.

- [x] Inspect the final diff for stale fixed layer lists, missing locale keys, incorrect FX layer order, and assumptions that every tile layer has an image asset.
- [x] Run TypeScript and JSON validation. Tests were not run.

### Task 5: Static map catalog previews

**Files:**
- Create: `scripts/maps/build-catalog-previews.ts`
- Create: `public/assets/map-catalog/index.json` and one optimized WebP per source map
- Modify: `package.json`, `types/map-catalog.ts`, `lib/api/map-catalog.ts`, `components/maps/MapCatalogDialog.tsx`, `messages/uk/maps.json`, `messages/en/maps.json`

- [x] Generate 640 px maximum WebP thumbnails for every upstream map, save the static catalog index and `importable` flag, and retain each map's existing attribution and license metadata.
- [x] Read the catalog and thumbnails from the same-origin static directory; show a thumbnail in the results list and selected preview without downloading/parsing the original UVTT.
- [x] Download and parse the original file only on explicit Add; disable Add for entries the current importer rejects and explain why the preview remains available.

### Task 6: Make battle map choices explicit

**Files:**
- Modify: `components/battle/setup/BattleSetupForm.tsx`
- Modify: `messages/uk/battleSetup.json`, `messages/en/battleSetup.json`

- [x] Present three selectable cards: no map (column/list battle view), create a map in setup, and load a prepared map.
- [x] Show only the controls for the selected choice. Loading a prepared map reveals the existing campaign map picker and catalog; choosing no map or create clears the library selection.
- [x] Keep initial existing battles selected according to their linked map or enabled map editor state.
