# Map Catalog and Local Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let campaign DMs add maps from `mbround18/vtt-maps` to their campaign library and continue importing their own `.dd2vtt`/`.uvtt` files.

**Architecture:** A server-side, cached catalog service exposes only validated paths from the public map repository. The map picker in battle setup and the library UI preview and import a selected entry through the existing UVTT parser and campaign map storage; setup then selects the new campaign copy. Provenance is retained in the existing JSON map header. Local-file import remains available and shares the same parser and validation behavior.

**Tech Stack:** Next.js App Router, React Query, TypeScript, Zod, Prisma JSON header, Supabase Storage signed uploads, existing UVTT parser and battle map library.

**Spec:** `docs/superpowers/specs/2026-11-15-map-catalog-design.md`

## Global Constraints

- Source repository: public asset-only `mbround18/vtt-maps`, licensed CC BY-SA 4.0.
- Catalog outage must not block local import or existing campaign maps.
- Use existing UVTT parser, campaign map storage, DM authorization and battle setup map selection.
- External images become campaign-owned Storage objects; do not retain third-party URLs as campaign backgrounds.
- Keep import as preview → explicit add/save; failed validation must not mutate editor draft or campaign map library.
- No bulk install, catalog editing, generator work, battle-rule fixes, music changes, deploy or production data changes in this phase.

## Review Focus

- GitHub tree responses can be truncated or rate-limited; do not expose partial catalogs as complete, and keep local import available.
- Catalog paths are untrusted request input; imports must resolve to a manifest entry under the fixed repository, never an arbitrary URL.
- Repository UVTT files range up to 89 MiB; direct-download them in the browser from the validated raw GitHub origin. Vercel Function request/response payloads cap at 4.5 MiB.
- Validate at most 96 MiB UVTT, 72 MiB embedded PNG/WebP, 12000 px per side and 120 MP before decoding; resize/compress larger images to 2400 px and 8 MiB before direct Storage upload.
- Unsupported diagonal/off-grid walls must fail before creation and explain the limitation; do not silently drop geometry.
- Old map headers have no provenance; optional provenance must round-trip without changing existing map behavior or dropping on ordinary editor save.

---

### Task 1: Catalog index and safe source resolution

Status: complete.

**Files:**
- Create: `lib/server/map-catalog/vtt-maps.ts`
- Create: `lib/server/map-catalog/__tests__/vtt-maps.test.ts`
- Create: `app/api/map-catalog/route.ts`
- Create: `app/api/map-catalog/__tests__/route.test.ts`
- Create: `types/map-catalog.ts`

**Interfaces:**
- Produces `MapCatalogEntry { id: string; category: string; name: string; filePath: string; sourceUrl: string; downloadUrl: string; license: 'CC-BY-SA-4.0'; attribution: string }`.
- `listVttMapCatalog(): Promise<MapCatalogEntry[]>` reads the recursive Git tree for the fixed repository, filters `.dd2vtt` assets, derives category/name from the repository path, validates paths, and caches successful results for one hour.
- `downloadUrl` is built from the fixed `raw.githubusercontent.com/mbround18/vtt-maps/main/maps/` prefix and path-encoded segments; browser code revalidates the origin and path before direct fetch.
- `GET /api/map-catalog` returns the cached metadata index only; UVTT asset bodies never pass through a Vercel Function.

- [x] **Step 1: Add catalog service tests** for nested categories, `.dd2vtt` filtering, unsafe paths, malformed/truncated trees, GitHub errors and one-hour cache expiry.
- [x] **Step 2: Run the targeted service tests** and confirm the new behavior fails before implementation.
- [x] **Step 3: Implement the cached tree reader** in `lib/server/map-catalog/vtt-maps.ts`; use fixed owner/repository/host constants, produce an encoded raw download URL and reject malformed tree responses rather than returning an incomplete list.
- [x] **Step 4: Add the catalog GET route** with one-hour revalidation and a generic 502 on source failures; do not proxy UVTT assets through the route.
- [x] **Step 5: Run service and catalog route tests** and verify response shapes match `MapCatalogEntry`.

### Task 2: Map provenance and direct campaign image upload

**Files:**
- Modify: `types/battle.ts` (`BattleMapConfig`)
- Modify: `lib/schemas/battles.ts` (`battleMapObject`)
- Modify: `lib/schemas/battle-maps.ts` (`headerSchema`)
- Create: `lib/server/battle-maps/background-upload.ts`
- Create: `app/api/campaigns/[id]/maps/background-upload/route.ts`
- Create: `lib/api/battle-maps.ts`
- Modify: `lib/hooks/battle-maps/useMapEditorDraft.ts`
- Modify: `lib/constants/map-limits.ts`
- Modify: `messages/{en,uk}/maps.json`

**Interfaces:**
- Add optional `source?: { url: string; attribution: string; license: 'CC-BY-SA-4.0' }` to `BattleMapConfig`; old records remain valid.
- Add a DM-only upload-ticket endpoint returning the existing `SlideUploadTicket` shape for the `battle-maps` bucket, restricted to PNG/WebP/JPEG and images up to 8 MiB.
- `uploadBattleMapBackground(campaignId, blob, contentType)` obtains a ticket, uploads the normalized Blob directly to Supabase Storage, and returns its public campaign-owned URL; limit is 8 MiB.
- Map save/create persists `source` inside the existing JSON header; no Prisma migration.

- [x] **Step 1: Add schema coverage** for absent provenance, valid CC BY-SA provenance and rejected invalid URL/license/oversized attribution.
- [x] **Step 2: Run the targeted schema tests** and confirm the new provenance contract fails before implementation.
- [x] **Step 3: Implement optional provenance in map types and Zod schemas** and preserve it through ordinary map update and editor save.
- [x] **Step 4: Add campaign-authorized signed upload ticket creation** using existing `imageBucketStorage` conventions; bind tickets to the campaign, allowlist PNG/WebP/JPEG and enforce an 8 MiB byte cap.
- [x] **Step 5: Implement the client upload helper** using the ticket and existing Supabase signed-upload client convention; return only the campaign-owned URL.
- [x] **Step 6: Update editor background persistence** so a data URL is converted to Blob and uploaded directly before a small JSON map save, while existing normal background uploads continue to work; keep Save disabled while the upload is pending.
- [x] **Step 7: Run targeted API/schema/editor tests** and verify older map payloads still parse and save.

### Task 3: Catalog picker, preview and one-map import

**Files:**
- Create: `lib/api/map-catalog.ts`
- Create: `lib/hooks/battle-maps/useMapCatalog.ts`
- Create: `components/maps/MapCatalogDialog.tsx`
- Modify: `components/maps/MapLibraryList.tsx`
- Modify: `lib/hooks/battle-maps/useMapLibrary.ts`
- Modify: `components/battle/setup/BattleMapLibraryPicker.tsx`
- Modify: `lib/hooks/battles/setup/useBattleLibraryMap.ts`
- Create: `lib/hooks/battle-maps/useImportCatalogMap.ts`
- Modify: `lib/utils/battle/uvtt/parse.ts`
- Modify: `lib/api/map-catalog.ts`
- Modify: `messages/{en,uk}/maps.json`
- Create: `components/maps/__tests__/MapLibraryList.test.tsx`
- Create: `components/maps/__tests__/MapCatalogDialog.test.tsx`

**Interfaces:**
- `GET /api/map-catalog` maps to `getMapCatalog(): Promise<MapCatalogEntry[]>`.
- `getMapCatalogAsset(entry): Promise<string>` validates `entry.downloadUrl` against the fixed raw GitHub origin/path and streams at most 96 MiB directly in the browser.
- `useImportCatalogMap(campaignId).importEntry(entry): Promise<BattleMapBrief>` downloads and parses an entry, uploads its image, and creates a normal campaign map.
- `useBattleLibraryMap.importCatalogEntry(entry): Promise<void>` calls `importEntry`, refreshes the library and selects the new map ID.
- Catalog import creates a normal `BattleMapInput` with parsed grid/edges/doors, campaign-owned background URL and source provenance, then uses the existing create-map mutation.

- [x] **Step 1: Add UI tests** for catalog loading/error/retry, category filtering, preview selection, cancel without mutation, add one map, and preserving the local-file import action.
- [x] **Step 2: Run targeted UI tests** and confirm the catalog flow fails before implementation.
- [x] **Step 3: Raise parser limits to 96 MiB JSON, 72 MiB embedded image, 12000 px per side and 120 MP total**; reject dimensions before any bitmap decode.
- [x] **Step 4: Add React Query catalog client/hook** with one-hour stale time, retry affordance and no dependency from local import on catalog loading.
- [x] **Step 5: Implement `getMapCatalogAsset(entry)`** with a browser-stream byte cap and strict scheme/host/path validation before direct raw GitHub fetch.
- [x] **Step 6: Implement `useImportCatalogMap(campaignId).importEntry(entry)`** to fetch the allowlisted UVTT file and validate it with `parseUvtt` before any write.
- [x] **Step 7: Convert the validated image data URL to a Blob, normalize images above 2400 px or 8 MiB, and upload directly** with `uploadBattleMapBackground`; report source and Storage failures without creating a map.
- [x] **Step 8: Create the campaign map with parsed grid/edges/doors and provenance** only after upload succeeds; if create fails, remove the newly uploaded campaign object. Return the created `BattleMapBrief` to the caller.
- [x] **Step 9: Build the catalog dialog** with category/name search, selected-map preview and source/license attribution; expose an explicit add action and errors that do not close the dialog or create a map.
- [x] **Step 10: Add a catalog entry point to the battle map picker**; after successful import, select the new campaign map and preserve current relink/locked behavior.
- [x] **Step 11: Keep catalog access in the map library and local import in the editor**; local import continues to apply only a fully validated result and is normalized during Save.
- [x] **Step 12: Run targeted catalog, editor, map-library and setup-picker tests** and verify an imported map appears in the campaign library and is selected by setup.

### Task 4: Documentation and final review

**Files:**
- Modify: `docs/STATUS.md`
- Modify: `docs/superpowers/specs/2026-11-15-map-catalog-design.md`

- [x] **Step 1: Update status and design** with implemented behavior, repository attribution, size limits and any known source-repository gaps.
- [x] **Step 2: Run targeted test suite, TypeScript and changed-file ESLint**; resolve failures in changed files.
- [x] **Step 3: Review the complete diff** for unauthorized external URLs, lost attribution, oversized JSON uploads, and accidental changes to battle setup or campaign data.
