# World map UX (subproject 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DM editor and player view of the world map get build/play modes, a map tree, a marker bubble + details panel, snapping zones with solid shared borders, and a public marker description.

**Architecture:** Shared presentational pieces (`MapTree`, `MarkerBubble`, `PlaceSearchBar`) live in `components/world/` and are used by both `/dm/world` and `/world`. Server adds one column (`world_markers.description`) and one PATCH capability (re-parent a map). Pure geometry (snap, shared edges) lives in `lib/utils/world/`.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Zod, Prisma 6, next-intl, Vitest (`happy-dom` for UI tests).

**Spec:** `docs/superpowers/specs/2026-11-20-world-map-ux-design.md`

## Global Constraints

- Layering per CLAUDE.md: components never import `@/lib/api/*`; hooks in `lib/hooks/world/` (barrel `index.ts`); `lib/utils` never imports `lib/server`; `@/` alias only.
- Dialogs = `ResponsiveDialog`; confirms = `useConfirm()`; no `window.confirm`.
- Every user-visible string is a key in `messages/{uk,en}/world.json` (no Cyrillic in code); new comments in English, minimal.
- Migrations expand-only; `world_markers` already has RLS (no new table).
- Visibility only through `buildWorldView` (`lib/utils/world/player-view.ts`); `description` is public, `dmNote` stays DM-only.
- Props ≤ ~7, group callbacks in `actions={{...}}`; component folders ≤ ~10 files.
- Agents write tests but do **not** run them; one full `pnpm test:run` at the end (Task 8). Per-task lint: `pnpm exec eslint --fix <touched files>`.
- Constants: `WORLD_MARKER_DESCRIPTION_MAX = 600`, `WORLD_SNAP_PX = 8`.

## Review Focus

- Re-parenting a map under its own descendant or under a marker already holding a nested map → 409, tree unchanged (Task 1 tests).
- Player tree must list only maps present in `view.maps` (hidden maps never appear, even as greyed entries) (Task 6 test).
- Two adjacent zones after snapping must share identical vertex coordinates (no gaps, no double border) (Task 2 tests).
- Marker bubble near the map edge or at high zoom stays inside the viewport and follows pan/zoom (Task 4 test).
- Deleting/closing: Esc closes bubble, then cancels a pinned tool, then clears selection — never two at once (Task 5 test).

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema/core.prisma`, `prisma/migrations/20261220000000_world_marker_description/migration.sql` | `description` column |
| `lib/constants/world.ts`, `lib/constants/api-errors.ts` | limits, error keys |
| `lib/schemas/world.ts` | marker `description`; map `parentMarkerId` |
| `lib/server/world/map-handlers.ts`, `map-store.ts`, `marker-handlers.ts` | re-parent validation; mapper for `description` |
| `types/world.ts`, `lib/api/world.ts`, `lib/hooks/world/useWorldEditor.ts` | types, `moveMap` mutation |
| `lib/utils/world/tree.ts` | + `treeOrder`, `treeDepth` (extracted from `MarkerPickerDialog`) |
| `components/world/MarkerPickerDialog.tsx` | moved from `components/scenario/editor/dialogs/` (world is the data owner); gains `excludeMapIds` / `markerFilter`; reused by scenario and by «Перенести» |
| `lib/utils/world/zone-snap.ts` (new) | `snapPoint`, `sharedEdges` |
| `components/world/WorldZones.tsx`, `WorldMapView.tsx` | solid borders, labels, `card` slot, vertex handles |
| `components/world/MapTree.tsx`, `MarkerBubble.tsx`, `PlaceSearchBar.tsx` (new) | shared UI |
| `components/world/editor/*` | mode switch, labelled toolbar, DM bubble/details, remove strips |
| `components/world/play/WorldPlayClient.tsx` | player layout |

---

### Task 1: Server — description column and map re-parenting

**Files:**
- Modify: `prisma/schema/core.prisma` (WorldMarker: `description String?`), `lib/constants/world.ts`, `lib/constants/api-errors.ts`, `lib/schemas/world.ts`, `lib/server/world/map-handlers.ts` (`updateWorldMapHandler`), `lib/server/world/map-store.ts` (`toWorldMarker`), `types/world.ts`, `lib/api/world.ts`, `lib/hooks/world/useWorldEditor.ts`
- Create: `prisma/migrations/20261220000000_world_marker_description/migration.sql`
- Test: `lib/server/world/__tests__/map-handlers.move.test.ts`, extend `lib/schemas/__tests__/world.test.ts` (path may differ — put beside the existing world schema test)

**Interfaces:**
- Produces: `WorldMarker.description: string | null`; `UpdateWorldMarkerData` + `CreateWorldMarkerData` accept `description`; `UpdateWorldMapData` accepts `parentMarkerId: string`; hook `editor.map.move: { mutateOk({ id, parentMarkerId }) }`; API errors `WORLD_MOVE_CYCLE: 'errors.worldMoveCycle'`, `WORLD_ROOT_IMMOVABLE: 'errors.worldRootImmovable'`.

- [ ] **Step 1: Failing tests** for `updateWorldMapHandler` (mock prisma like neighbouring tests): (a) moves nested map B from marker m1 to free marker m2 → 200, `parentMapId` follows; (b) target marker lives in B's own subtree → 409 `WORLD_MOVE_CYCLE`; (c) target marker already has a nested map → 409 `WORLD_NESTED_EXISTS`; (d) root map + `parentMarkerId` → 409 `WORLD_ROOT_IMMOVABLE`; (e) marker of another campaign → 404/403 via `ownedMarker`; (f) P2002 race → 409 `WORLD_NESTED_EXISTS`. Schema tests: marker `description` max 600 / nullable on update; map update accepts `parentMarkerId`.
- [ ] **Step 2:** Migration SQL: `ALTER TABLE "world_markers" ADD COLUMN "description" TEXT;` (column naming is camelCase-quoted, like `"dmNote"`). Add the field to `core.prisma`; run `pnpm exec prisma generate`.
- [ ] **Step 3:** Schemas: `createWorldMarkerSchema.description: z.string().max(WORLD_MARKER_DESCRIPTION_MAX).optional()`, `updateWorldMarkerSchema.description: ….nullable()`, `updateWorldMapSchema.parentMarkerId: z.string().min(1)`. Mapper: `description: row.description`. Types as above.
- [ ] **Step 4:** In `updateWorldMapHandler`, when `body.parentMarkerId !== undefined`: reject root (`owned.parentMarkerId === null`); `ownedMarker(campaignId, id)`; reject if `marker.childMap && marker.childMap.id !== mapId`; load the campaign's maps `{ id, parentMarker: { select: { mapId } } }`, build `{ id, parentMapId }`, and reject if `subtreeMapIds(maps, mapId).includes(marker.mapId)`; catch `PrismaClientKnownRequestError` P2002 like `createWorldMapHandler`. Existing `publishWorldChanged` call stays.
- [ ] **Step 5:** Client: `updateWorldMap` already takes `UpdateWorldMapData`; add `editor.map.move` in `useWorldEditor` as a thin wrapper over `updateMap` (invalidate `worldKeys.maps` + both maps' detail keys). Marker create/update already forward arbitrary data.
- [ ] **Step 6:** `pnpm exec eslint --fix` on touched files; commit `feat(world): marker description and map re-parenting`.

### Task 2: Pure utils — tree order, zone snapping

**Files:**
- Modify: `lib/utils/world/tree.ts`
- Move: `components/scenario/editor/dialogs/MarkerPickerDialog.tsx` → `components/world/MarkerPickerDialog.tsx` (and its test to `components/world/__tests__/`); update the importers (`git grep MarkerPickerDialog`)
- Create: `lib/utils/world/zone-snap.ts`
- Test: `lib/utils/world/__tests__/tree.test.ts`, `lib/utils/world/__tests__/zone-snap.test.ts`

**Interfaces:**
- Produces: `treeOrder(maps: WorldMapSummary[]): WorldMapSummary[]` (move the private function out of `MarkerPickerDialog`, unchanged behaviour); `treeDepth(maps, id): number` (via `mapPath`).
- Produces: `snapPoint(p: MapPoint, zones: Polygon[], radius: number): MapPoint` — nearest vertex of any zone within `radius` (normalized units), else nearest point on any edge within `radius`, else `p`; `sharedEdges(zones: Polygon[]): Set<string>` — keys `"x1,y1|x2,y2"` (endpoints sorted) for edges present in two or more polygons, used to draw such edges once.

- [ ] **Step 1:** Tests: `treeOrder` DFS order with siblings by name, orphan-safe; `snapPoint` — vertex within radius wins over edge; edge projection clamped to segment; outside radius unchanged; ties pick the nearest; `sharedEdges` — two squares sharing one edge → exactly one key, regardless of vertex order; no shared edges → empty.
- [ ] **Step 2:** Implement; point-to-segment distance helper local to the file. Radius is normalized: callers pass `WORLD_SNAP_PX / (box.width * zoom)`.
- [ ] **Step 3:** `git mv` the picker into `components/world/`, replace its private `treeOrder`/`depthOf` with the shared ones, and add two optional props: `excludeMapIds?: string[]` (those maps are hidden from the tree step) and `markerFilter?: (m: WorldMarker) => boolean` (applied to the marker list). Defaults keep today's behaviour; its existing test must pass unchanged from the new path, plus one test per new prop.
- [ ] **Step 4:** Lint, commit `feat(world): shared tree order and zone snapping utils`.

### Task 3: Zone rendering and vertex editing

**Files:**
- Modify: `components/world/WorldZones.tsx`, `components/world/world-atlas.css`, `components/world/WorldMapView.tsx`, `lib/hooks/world/useWorldEditorPage.ts`
- Create: `components/world/ZoneVertexHandles.tsx`
- Test: `components/world/__tests__/WorldZones.test.tsx` (happy-dom), extend `components/world/__tests__/WorldMapView.test.tsx` (snap cases, same harness/mocks as the existing tests there)

**Interfaces:**
- Consumes: `snapPoint`, `sharedEdges` (Task 2).
- Produces: `WorldMapViewProps.handlers.onVertexChange?(markerId: string, polygon: Polygon): void`; `WorldMapViewProps.snap?: { zones: Polygon[]; enabled: boolean }` — the **view** owns zoom/box, so it snaps: in `pointAt` consumers for the zone tool (click, draft cursor preview) and vertex drags it applies `snapPoint(raw, snap.zones, WORLD_SNAP_PX / (box.width * zoom))` when `snap.enabled` and `!e.altKey`. `useMapDrawing` is not touched.

- [ ] **Step 1:** Tests. `WorldZones`: fill opacity 0.28 (selected 0.38) and **solid** outline (no `stroke-dasharray`) with stroke colour darker than fill; an edge shared by two zones renders once (count `<line data-shared-edge>` / path); label rendered at centroid with halo. `WorldMapView`: a zone-tool click within the snap radius of an existing vertex calls `handlers.onMapClick` with that vertex's exact coordinates; Alt-click or `snap.enabled=false` passes the raw point; radius shrinks as zoom grows.
- [ ] **Step 2:** `WorldZones`: render per-zone filled polygon without stroke, then one `<path>` per unique edge (shared edges deduplicated by `sharedEdges`) with 2 px solid dark stroke + thin light underlay (`vectorEffect="non-scaling-stroke"`). Label: reuse the existing label logic in `WorldPins`/`WORLD_ZONE_LABEL_*` constants — do not duplicate; only restyle (halo, size from polygon area).
- [ ] **Step 3:** `ZoneVertexHandles`: for the selected zone render draggable vertex dots (scaled by `1/zoom`), midpoint "+" handles that insert a vertex, and double-click on a vertex removes it (keep ≥ 3). Dragging snaps (`snapPoint` against other zones, Alt disables) and calls `handlers.onVertexChange(markerId, polygon)` on release. Wire in `WorldMapView` only when `tool === 'select'` and a zone is selected and `handlers.onVertexChange` is provided.
- [ ] **Step 4:** `useWorldEditorPage`: expose `snap: { zones: Polygon[] (current map's zones except the one being redrawn); enabled: boolean; setEnabled }` (default on) and handle `onVertexChange` → `editor.marker.update.mutateOk({ id, data: { polygon } })`.
- [ ] **Step 5:** Lint, commit `feat(world): solid shared zone borders, snapping and vertex editing`.

### Task 4: Shared UI — MapTree, MarkerBubble, PlaceSearchBar, card slot

**Files:**
- Create: `components/world/MapTree.tsx`, `components/world/MarkerBubble.tsx`, `components/world/PlaceSearchBar.tsx`, `lib/hooks/world/useMarkerBubblePosition.ts`
- Modify: `components/world/WorldMapView.tsx` (new `card` prop), `lib/hooks/world/index.ts`
- Test: `components/world/__tests__/MapTree.test.tsx`, `MarkerBubble.test.tsx`, `PlaceSearchBar.test.tsx`, `lib/hooks/world/__tests__/useMarkerBubblePosition.test.ts`

**Interfaces:**
- Produces: `MapTree({ maps: WorldMapSummary[]; activeId: string | null; onOpen(id: string): void; footer?: ReactNode })` — `role="tree"`/`treeitem`, indent by `treeDepth`, active has `aria-current="true"`, ArrowUp/Down moves focus, Enter opens.
- Produces: `MarkerBubble({ marker: Pick<WorldMarker,'name'|'description'|'icon'|'kind'|'childMapId'>; actions: { onMore(): void; onOpenMap?(): void; onClose(): void }; children?: ReactNode })` — compact bubble: name, ≤ 4-line description clamp, "Докладніше" (`onMore`), "Відкрити карту" when `onOpenMap` given, close ×. `children` replaces the static title/description for the DM editable variant.
- Produces: `WorldMapViewProps.card?: { point: MapPoint; content: ReactNode }` rendered **outside** the transformed layers in screen space, positioned by `useMarkerBubblePosition({ point, box, zoom, offset, size }) → { left: number; top: number; placement: 'above' | 'below' }`, clamped to the viewport box and flipped below when there is no room above.
- Produces: `PlaceSearchBar({ markers: WorldMarker[]; onPick(id: string): void })` — owns its own filter state: `SearchInput` + `useSearch(markers, m => [m.name, m.description])` results list + legend chips for kind (point/zone) and for each distinct `icon` present in `markers`, via `HudToggleChip` (`components/hud`); chips are AND-combined with the text query.

- [ ] **Step 1:** Tests: `MapTree` order/indent/active/keyboard/`onOpen`; `MarkerBubble` buttons by `actions` presence and clamp; `useMarkerBubblePosition` — near top edge flips to `below`, near left/right edge clamps, follows `zoom`/`offset` changes; `PlaceSearchBar` filters by name and description; kind chip and icon chip each hide non-matching results; chips for icons not present are absent.
- [ ] **Step 2:** Implement; labels from `world.tree.*`, `world.bubble.*`, `world.search.*` keys (added in Task 8 files; add the keys now in both locales so tests render).
- [ ] **Step 3:** Lint, commit `feat(world): shared MapTree, MarkerBubble and place search`.

### Task 5: DM editor rebuild

**Files:**
- Modify: `app/campaigns/[id]/dm/world/page-client.tsx`, `components/world/editor/WorldToolbar.tsx`, `components/world/editor/panels/WorldMarkerPanel.tsx` (add description textarea + point color), `components/world/editor/WorldEditorContext.tsx`, `lib/hooks/world/useWorldEditorPage.ts`, `lib/hooks/world/useMapDrawing.ts` (pinned tool, Esc order)
- Create: `components/world/editor/DmMarkerBubble.tsx`, `components/world/editor/ModeSwitch.tsx`, `components/world/editor/MoveMapMenu.tsx`
- Delete: `components/world/editor/panels/WorldInspectorBar.tsx` (+ its test `panels/__tests__/WorldInspectorBar.test.tsx`), `components/world/editor/maps/MarkerStrip.tsx`, `components/world/editor/maps/MapStrip.tsx`, and `components/world/editor/panels/InspectorParts.tsx` if nothing else imports it afterwards (`git grep InspectorParts`). `WorldMapSettings` already holds every map control (fog, radius, entry, replace image, delete) — nothing to move.
- Update: `app/campaigns/[id]/dm/world/__tests__/page-client.test.tsx` (drop the `WorldInspectorBar` mock, mock the new tree/bubble/mode components)
- Test: `components/world/editor/__tests__/ModeSwitch.test.tsx`, `DmMarkerBubble.test.tsx`, `MoveMapMenu.test.tsx`, update `WorldToolbar.test.tsx`, `lib/hooks/world/__tests__/useMapDrawing.pinned.test.ts`

**Interfaces:**
- Consumes: Task 1 `editor.map.move`; Task 4 shared components.
- Produces: `WorldMode = 'build' | 'play'`; `useWorldEditorPage` returns `mode: { value: WorldMode; set(m: WorldMode): void }` and `pinned: { value: boolean; set(v: boolean): void }` under `tools`. Switching to `play` sets tool `'move'`, switching to `build` sets `'select'`. Build tools: `select | point | zone | entry` (labelled; `move` only in play mode).
- Produces: `DmMarkerBubble({ marker: WorldMarker; actions: { onMore(): void; onClose(): void } })` — uses `MarkerBubble` with editable name, "Відома локація" switch, map block states (none → «Створити карту для цього місця» opening `NewWorldMapDialog` with `parentMarker`; has → «Відкрити» + `MoveMapMenu`), «Перемалювати» for zones, «Видалити» via `useConfirm`.
- Produces: `MoveMapMenu({ campaignId: string; map: WorldMapSummary; maps: WorldMapSummary[]; onMove(markerId: string): void })` — a button that opens the shared `MarkerPickerDialog` with `excludeMapIds = subtreeMapIds(maps, map.id)` and `markerFilter = (m) => !m.childMapId`; on pick calls `onMove(ref.markerId)`; renders nothing for the root map. Marker lists load lazily through the picker's own `useWorldMap`; the server stays the authority on conflicts.

- [ ] **Step 1:** Tests: `ModeSwitch` toggles and exposes `aria-pressed`; toolbar shows text labels at desktop and `aria-label` on narrow; after placing a point the tool returns to `select` unless pinned; Shift-click / double-click on a tool button pins it; Esc order (bubble → pinned tool/draft → selection); `DmMarkerBubble` three map-block states and delete confirm; `MoveMapMenu` passes own subtree as excluded maps and the free-marker filter, renders nothing for root, calls `onMove` with the picked marker id.
- [ ] **Step 2:** Implement hooks/state in `useWorldEditorPage`. Esc ladder (one press = one step): `useMapDrawing` keeps cancelling a zone draft and returning a non-select tool to `select`; a new window keydown in `useWorldEditorPage` (skips typing targets, dialogs and `e.defaultPrevented`) closes the bubble/details only when `tool === 'select'` and no draft, replacing the Esc handler of the deleted `WorldInspectorBar`. A `HudToggleChip` «Прилипання» next to the zone tool toggles `snap.enabled` (selected marker opens the bubble; "Докладніше" opens the details panel = existing `WorldMarkerPanel`; double-click on a pin with `childMapId` calls `openMap(childMapId)` via `handlers.onMarkerDoubleClick`, add it to `WorldMapView`/`WorldPins`).
- [ ] **Step 3:** Rebuild `page-client.tsx` (details = `WorldMarkerPanel` / `WorldMapSettings` in a right column on desktop, `ResponsiveDialog` sheet on phones, opened by «Докладніше» or the toolbar gear): left `MapTree` panel (collapsible; `ResponsiveDialog` sheet on phones) with footer "+ Нова карта" only when `maps.length === 0`; toolbar from `HudToolbar` + `ModeSwitch`; floating "Готово"/"Скасувати" while the zone draft has ≥ 1 point (≥ 3 enables "Готово"); `WorldMapView card={{ point, content: <DmMarkerBubble/> }}`; `TravelPanel` only in play mode (unchanged).
- [ ] **Step 4:** Remove the strip files and their imports; fix `WorldToolbar.test.tsx`.
- [ ] **Step 5:** Lint touched dirs (`pnpm lint:dirs components/world app/campaigns lib/hooks/world`), commit `feat(world): DM editor modes, map tree and marker bubble`.

### Task 6: Player view

**Files:**
- Modify: `components/world/play/WorldPlayClient.tsx`, `components/world/notes/WorldNotesPanel.tsx` (show `marker.description` above notes), `lib/hooks/world/useWorldPlay.ts` (add `focusPoint(point: MapPoint)`; `focusHero` becomes a one-line call to it)
- Create: `components/world/play/PlayerMarkerBubble.tsx`
- Test: `components/world/play/__tests__/WorldPlayClient.test.tsx`, `PlayerMarkerBubble.test.tsx`

**Interfaces:**
- Consumes: `MapTree`, `MarkerBubble`, `PlaceSearchBar`, `WorldMapView card`.
- Produces: `PlayerMarkerBubble({ marker: WorldMarker; actions: { onMore(): void; onOpenMap?(): void; onClose(): void } })` thin wrapper over `MarkerBubble`.

- [ ] **Step 1:** Tests: tree contains exactly `view.maps` entries (a map not in the view is absent); selecting a marker shows the bubble with its description; "Відкрити карту" present only when `childMapId` is in `view.maps`; double-click on such a pin opens it; search by description finds the place and focuses it (`useWorldPlay.focusPoint(point: MapPoint)`).
- [ ] **Step 2:** Implement layout: left `MapTree` (sheet on mobile), map with `PlaceSearchBar` above, `card` bubble, details panel right on desktop / sheet on mobile (`WorldNotesPanel`). Heroes list and `TravelLog` move into a collapsible bottom drawer on phones, stay in the right column on desktop. Remove the flat "Місця" list (replaced by the tree).
- [ ] **Step 3:** Lint, commit `feat(world): player map tree, bubble and place search`.

### Task 7: Marker point colour

**Files:**
- Modify: `components/world/WorldPins.tsx`, `components/world/marker-icons.tsx`, `components/world/editor/panels/WorldMarkerPanel.tsx`, `components/world/editor/DmMarkerBubble.tsx`
- Test: `components/world/__tests__/WorldPins.test.tsx` (extend)

- [ ] **Step 1:** Test: a point with `color` renders its pin body in that colour; without `color` keeps the current default; zones unchanged.
- [ ] **Step 2:** Use the existing `color` column for points (`createWorldMarkerSchema`/update already accept `hexColor`); reuse `ColorSwatch` in panel and bubble; pin body gets `style={{ background: color }}`.
- [ ] **Step 3:** Lint, commit `feat(world): point colour`.

### Task 8: Texts, onboarding, docs, full verification

**Files:**
- Modify: `messages/{uk,en}/world.json` (`tree.*`, `bubble.*`, `search.*`, `mode.*`, `toolbar.*` labels incl. `pin`, `done`, `cancel`, `moveMap.*`, `editor.description`, `errors.worldMoveCycle`, `errors.worldRootImmovable`), `messages/{uk,en}/whatsNew.json`, `lib/onboarding/whats-new.ts` (`{ id: '2026-11-20-world-map-ux', date: '2026-11-20', audience: 'all' }`), hint texts for `dm.world`/`player.world`, `docs/architecture/world-map.md`, `docs/STATUS.md`
- Test: key-parity tests already run in `test:run`.

- [ ] **Step 1:** Add all keys in both locales (`uk` real Ukrainian, `en` English); update the architecture doc (modes, tree, bubble, snapping, re-parent rules, `description`) and STATUS (subprojects 2 sessions/trail and 3 layers pending, link both specs when written).
- [ ] **Step 2:** `pnpm exec tsc --noEmit` (expect `WorldMarker` literals in tests/fixtures to need `description: null` — find with `git grep -n "alwaysVisible:" -- '*.test.ts' '*.test.tsx'`), `pnpm test:run` (full, once), `pnpm cycles`; fix failures.
- [ ] **Step 3:** Live run on a local `next start` against the local DB (browser subagent, scaled screenshots): DM — create root map, place point (labelled tool returns to select), pin tool and place three, draw two adjacent zones (snap → no gap, one shared border), edit a vertex, create nested map from the bubble, open it by double-click, move it under another marker, switch via tree; player — tree shows only known maps, bubble + details, search, open child; repeat on a phone viewport. Report results; no "done" without it.
- [ ] **Step 4:** Commit `docs(world): world map UX architecture and status`; run `/simplify` on the branch diff (1–2 agents) per CLAUDE.md.

## Self-Review

- Spec coverage: sections 1 (Tasks 5), 2 (Tasks 4–5), 3 (Task 6), 4 (Tasks 2–4, 7: zones, bubble, description, point colour; history → subproject 2), 5 (Tasks 1, 8). Out-of-scope items untouched.
- Names consistent: `treeOrder`, `snapPoint`, `sharedEdges`, `MarkerBubble`, `card` prop, `editor.map.move`, `WorldMode`.
