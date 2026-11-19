# Sound Library + Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Per project rules: agents write tests but do NOT run them per task; one full `pnpm test:run` at the end (use `pnpm test:related <files>` only to debug). Lint per touched file: `pnpm exec eslint --fix <files>`.

**Goal:** Replace the per-campaign flat soundboard with a per-DM-account sound library and 9-slot presets, switchable in the in-game panel and editable on `/library/sounds`.

**Architecture:** Two new account-scoped tables (`sound_library_items`, `sound_presets` with a 9-element JSON `slots`). Server stores in `lib/server/soundboard/`, thin routes under `app/api/sound-library` and `app/api/sound-presets`. The campaign `play` route stays: it verifies the sound belongs to the DM, and the Pusher event now carries `url` so players never read the DM's library. The in-game panel reads library + presets through TanStack hooks; the last preset per campaign lives in `localStorage`.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Supabase Storage (`soundboard` bucket), Pusher, TanStack Query, Zod, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-sound-library-presets-design.md` (builds on `2026-11-19-soundboard-design.md`; current code: `lib/server/soundboard/`, `lib/hooks/soundboard/`, `components/soundboard/`, `app/api/campaigns/[id]/sounds/`).

## Global Constraints

- Preset = exactly **9** slots (`SoundId | null`); library ≤ **100** sounds, presets ≤ **30** per account; file ≤ **1 MiB** (`MAX_SOUND_BYTES`), ≤ **10 s** (`MAX_SOUND_SECONDS`); name ≤ 60, preset name ≤ 40.
- Formats: mp3 / m4a (existing `TRACK_FORMATS`) **plus webm** for the `soundboard` bucket only; do NOT change `TRACK_FORMATS` (music bucket must stay mp3/m4a).
- Link import: server downloads once and stores in our bucket; only `http(s)`, SSRF-safe (private/loopback/link-local/metadata IPs rejected, ≤3 redirects each re-checked, 8 s timeout, hard 1 MiB stream cap, type by magic bytes, never echo foreign error text).
- Layering: components/app never import `@/lib/api/*` or `fetch`; hooks per domain with `index.ts` barrel; query keys from `keys.ts` factories; `@/` alias only; i18n keys in `messages/{uk,en}/soundboard.json` (no Cyrillic in code); comments English, minimal.
- Every new table: `ENABLE ROW LEVEL SECURITY`; migrations expand-only (dropping old table is the last, separate task, only after new code is live).
- Dialogs via `ResponsiveDialog`; confirmations `useConfirm()`; HUD kit (`HudPanel`, `HudButton`, `HudPage`…) from `components/hud`.
- Errors are `{ error }` with keys from `lib/constants/api-errors.ts`; DM-only play via `requireDM`; library routes via `requireAuth` and every query filtered by `userId`.
- Reuse (do not rewrite): `createAudioUploadTicket`/`verifyUploadedAudio` (`lib/supabase/audio-upload.ts`), `uploadAudioViaTicket` (`lib/api/upload-audio-file.ts`), `validateSoundFile`, `playBuffer`/voice pool (`lib/hooks/soundboard/player.ts`), `SoundPad`, `useSoundboardKeys`, `useCrudMutation`, `useSearch`, `markLocalPlay`/nonce guard.

## Review Focus

- Deleting a sound that sits in several presets → those slots become `null` in one transaction (test in Task 3).
- Preset `slots` with ≠ 9 items, a foreign user's sound id, or an unknown `builtin:` id → 400, nothing saved (Tasks 2, 3).
- Link to `http://169.254.169.254/…`, `http://localhost`, a hostname resolving to a private IP, or a redirect into one → rejected (Task 5).
- Link to an HTML page / >1 MiB / >10 s file / file whose bytes aren't audio despite `Content-Type: audio/mpeg` → rejected with a generic key (Task 5).
- A DM playing a sound from another DM's library via `soundId` → 404; player receives `url` in the event and plays without any library request (Task 6, 7).
- Browser without `MediaRecorder` or mic permission denied → record button hidden/disabled with message, file+link still work (Task 8).
- First library read seeds starter presets exactly once even under two concurrent requests (Task 3).

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema/*.prisma` (where `CampaignSound` lives) + new migration | models `SoundLibraryItem`, `SoundPreset` |
| `lib/constants/soundboard.ts` | new limits, `SOUND_FORMATS`, `SOUND_ICONS`, `PRESET_SLOTS = 9`, `STARTER_PRESETS` |
| `types/soundboard.ts` | `LibrarySound`, `SoundPreset`, `SoundLibrary`, updated `SoundPlayEvent` |
| `lib/schemas/soundboard.ts` | account-level Zod schemas |
| `lib/server/soundboard/library-store.ts` | sound CRUD + limits + slot cleanup + starter seeding |
| `lib/server/soundboard/preset-store.ts` | preset CRUD, reorder, slot validation |
| `lib/server/soundboard/import-link.ts` + `lib/utils/net/safe-fetch.ts` | SSRF-safe download + audio sniffing |
| `lib/supabase/soundboard-storage.ts`, `lib/supabase/audio-upload.ts` | account-scoped paths, webm |
| `app/api/sound-library/**`, `app/api/sound-presets/**` | thin routes + `*-handlers.ts` |
| `app/api/campaigns/[id]/sounds/play/**` | play route kept; old CRUD routes removed |
| `lib/api/sound-library.ts` | client wrappers |
| `lib/hooks/soundboard/` | `keys.ts`, `useSoundLibrary.ts`, `useLibraryMutations.ts`, `usePresetMutations.ts`, `useActivePreset.ts`, `useSoundRecorder.ts`, updated `useSoundboardPads.ts`, `handle-play-event.ts` |
| `components/soundboard/` | `SoundboardPanel` (preset select + 3×3), `SoundSlotDialog`, `library/{SoundTile,SoundEditDialog,AddSoundMenu,RecordDialog,LinkDialog,PresetEditor,PresetList}.tsx` |
| `app/library/sounds/{page,page-client}.tsx` | library page |

---

### Task 1: Models and migration

**Files:** Modify the prisma schema file containing `model CampaignSound` (`prisma/schema/`, find with `grep -rn "model CampaignSound" prisma/schema`); Create `prisma/migrations/20261210000000_sound_library/migration.sql`.

**Interfaces:** Produces Prisma models `SoundLibraryItem` and `SoundPreset`, relations on `User` if a `User` model exists (otherwise plain `userId String` like other account-scoped tables — check how `Acquaintance`/`PlayerNotification` reference users and copy).

- [ ] **Step 1:** Add models (keep `CampaignSound` untouched until Task 12):

```prisma
model SoundLibraryItem {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  name       String?
  icon       String   @default("volume-2")
  color      String?
  volume     Float    @default(1)
  url        String
  durationMs Int      @map("duration_ms")
  source     String   // upload | record | link
  sourceUrl  String?  @map("source_url")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([userId, createdAt])
  @@map("sound_library_items")
}

model SoundPreset {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  name      String
  slots     Json     // (string | null)[9]
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([userId, sortOrder])
  @@map("sound_presets")
}
```

- [ ] **Step 2:** `pnpm exec prisma migrate dev --name sound_library` locally, then edit the generated SQL to append `ALTER TABLE "sound_library_items" ENABLE ROW LEVEL SECURITY;` and the same for `"sound_presets"`; check the rename to the `20261210000000_` timestamp does not collide with existing folders (`ls prisma/migrations | tail`).
- [ ] **Step 3:** `pnpm exec prisma generate`; commit `feat(db): sound library + presets tables`.

---

### Task 2: Constants, types, schemas

**Files:** Modify `lib/constants/soundboard.ts`, `types/soundboard.ts`, `lib/schemas/soundboard.ts`; Test `lib/schemas/__tests__/soundboard.test.ts`.

**Interfaces — Produces:**

```ts
// constants
export const PRESET_SLOTS = 9;
export const MAX_LIBRARY_SOUNDS = 100;
export const MAX_PRESETS = 30;
export const PRESET_NAME_MAX = 40;
export const SOUND_FORMATS = { mp3: {...}, m4a: {...}, webm: { ext: 'webm', contentType: 'audio/webm' } } as const;
export const SOUND_ICONS: readonly string[]; // ~40 lucide names, includes every builtin icon
export const STARTER_PRESETS: readonly { nameKey: string; ids: readonly string[] }[]; // 'battle' = first 9 builtin ids, 'ambience' = rest
// types
export type LibrarySound = { id: string; source: 'builtin' | 'library'; name: string | null; nameKey?: string; icon: string; color: string | null; volume: number; url: string; durationMs: number | null };
export type SoundPreset = { id: string; name: string; slots: (string | null)[]; sortOrder: number };
export type SoundLibrary = { sounds: LibrarySoundRow[]; presets: SoundPreset[] }; // rows from DB only; builtin merged on client
export type SoundPlayEvent = { soundId: string; nonce: string; volume: number; url: string };
// schemas
createLibrarySoundSchema   // { path, name?: string|null, icon?, color?, volume?, durationMs, source: 'upload'|'record' }
updateLibrarySoundSchema   // partial of name(nullable)/icon/color(nullable)/volume, refine non-empty
importLinkSchema           // { url: string.url().max(2048), name? , icon? }
createPresetSchema         // { name }
updatePresetSchema         // partial { name, slots }, refine non-empty
presetSlotsSchema          // z.array(z.string().max(80).nullable()).length(9)
reorderPresetsSchema       // { ids: string[] max 30 }
playSoundSchema            // unchanged
```

- [ ] **Step 1: Failing tests** in `soundboard.test.ts`: `presetSlotsSchema` rejects 8 and 10 items, accepts nine `null`s; `updatePresetSchema` rejects `{}`; `importLinkSchema` rejects `ftp://x` and a 3000-char URL; `updateLibrarySoundSchema` accepts `{ name: null }`.
- [ ] **Step 2:** Implement constants/types/schemas to pass. `SOUND_ICONS` must contain every `icon` used by `BUILTIN_SOUNDS` (add a test asserting it).
- [ ] **Step 3:** Commit `feat(soundboard): library constants, types, schemas`.

---

### Task 3: Library and preset stores

**Files:** Create `lib/server/soundboard/library-store.ts`, `lib/server/soundboard/preset-store.ts`; Test `lib/server/soundboard/__tests__/library-store.test.ts`, `preset-store.test.ts` (mock `@/lib/db` the way `sound-store.test.ts` does).

**Interfaces — Produces:**

```ts
// library-store.ts
export function getLibrary(userId: string): Promise<SoundLibrary>;           // seeds starter presets if none
export function createLibrarySound(userId: string, input: CreateLibrarySoundInput): Promise<LibrarySoundRow>;
export function updateLibrarySound(userId: string, id: string, patch: UpdateLibrarySoundInput): Promise<LibrarySoundRow>;
export function deleteLibrarySound(userId: string, id: string): Promise<void>; // $transaction: null the id in all user's presets, delete row; then removeSoundObject
export function findPlayableFor(userId: string, soundId: string): Promise<{ volume: number; url: string } | null>; // builtin => { volume: 1, url } 
// preset-store.ts
export function createPreset(userId: string, name: string): Promise<SoundPreset>;
export function updatePreset(userId: string, id: string, patch: { name?: string; slots?: (string|null)[] }): Promise<SoundPreset>; // validates every non-null id: builtin known OR owned library row
export function deletePreset(userId: string, id: string): Promise<void>;
export function reorderPresets(userId: string, ids: string[]): Promise<void>;
```

Errors via `ContentError(API_ERRORS.…)`: reuse `SOUND_NOT_FOUND`, `SOUND_LIMIT`; add `PRESET_NOT_FOUND`, `PRESET_LIMIT`, `PRESET_SLOT_INVALID` to `lib/constants/api-errors.ts` (+ translations in the errors namespace like the existing sound keys).

- [ ] **Step 1: Failing tests:** (a) `getLibrary` for a user with no presets creates «battle» (9 ids) and «ambience» (remaining builtin ids padded with `null`), second call creates nothing (use `createMany` guarded by a count inside `$transaction`, and test that a unique race is tolerated — implement seeding as `prisma.$transaction` re-checking `count === 0`); (b) `deleteLibrarySound` writes `null` into every preset slot holding that id and calls `removeSoundObject` with the object path; (c) `updatePreset` with another user's sound id → `ContentError` 400 `PRESET_SLOT_INVALID`, nothing written; with an unknown `builtin:x` → same; with 9 valid → saved; (d) limits: 101st sound → `SOUND_LIMIT`, 31st preset → `PRESET_LIMIT`; (e) `findPlayableFor` returns `null` for another user's id.
- [ ] **Step 2:** Implement. Library URL for custom sounds is `row.url`; for builtin, resolve from `BUILTIN_SOUNDS` (absolute path `/sfx/x.mp3` is fine — player resolves relative to origin; for the event convert via `new URL(url, origin)` is not available server-side, so send builtin events **without** `url` and let clients resolve builtin by id — see Task 7).
- [ ] **Step 3:** Commit `feat(soundboard): library and preset stores`.

---

### Task 4: Account-scoped storage and webm

**Files:** Modify `lib/supabase/audio-upload.ts`, `lib/supabase/soundboard-storage.ts`, `lib/utils/soundboard/validate-file.ts`, `lib/api/upload-audio-file.ts`; Tests `lib/supabase/__tests__` (existing audio-upload test file, extend) and `lib/utils/soundboard/__tests__/soundboard-utils.test.ts`.

**Interfaces:**
- `AudioBucket` gains optional `formats?: Record<string, { ext: string; contentType: string }>` (default `TRACK_FORMATS`); `AUDIO_OBJECT` regex and bucket `allowedMimeTypes` and `verifyUploadedAudio` allowlist are built from `bucket.formats`. `audioPathOwnedBy(path, ownerId, formats?)`.
- `soundboard-storage.ts`: `createSoundUploadTicket(userId, format)` (path prefix = `userId`), `soundPathOwnedBy(path, userId)`; `format` type becomes `keyof typeof SOUND_FORMATS`.
- `validateSoundFile` accepts `audio/webm` / `.webm`.
- `uploadAudioViaTicket(requestTicket: (req: TrackUploadRequest) => Promise<TrackUploadTicket>, file, format, failureKey)`; update its single other caller (tracks) accordingly — grep `uploadAudioViaTicket`.

- [ ] **Step 1: Failing tests:** webm path `u1/<32hex>.webm` owned by `u1` for sound bucket, rejected for music bucket default formats; `validateSoundFile({name:'a.webm',type:'audio/webm',size:100})` ok; >1 MiB fails.
- [ ] **Step 2:** Implement, keep tracks behaviour identical (run `pnpm test:related lib/supabase/audio-upload.ts lib/api/upload-audio-file.ts` to catch regressions in tracks tests).
- [ ] **Step 3:** Commit `refactor(audio): bucket formats + owner-agnostic upload ticket; webm for sounds`.

---

### Task 5: SSRF-safe link import

**Files:** Create `lib/utils/net/safe-fetch.ts`, `lib/server/soundboard/import-link.ts`, `lib/utils/soundboard/sniff-audio.ts`; Tests next to each in `__tests__/`.

**Interfaces — Produces:**

```ts
// safe-fetch.ts
export function isForbiddenAddress(ip: string): boolean;      // v4+v6: private, loopback, link-local, 169.254.169.254, CGNAT, unspecified, ULA, ::ffff: mapped
export function safeFetchBytes(url: string, opts: { maxBytes: number; timeoutMs: number; maxRedirects: number; lookup?: typeof dns.lookup }): Promise<Result<{ bytes: Uint8Array; contentType: string }>>;
// sniff-audio.ts
export function sniffAudioFormat(bytes: Uint8Array): 'mp3' | 'm4a' | 'webm' | null; // ID3 / 0xFFEx frame sync, ftyp box, EBML 1A45DFA3
// import-link.ts
export function importSoundFromLink(userId: string, input: { url: string }): Promise<{ path: string; url: string }>;
```

Behaviour: validate scheme (`http`/`https`), resolve host with `dns.lookup(host, { all: true })` and reject if **any** address is forbidden; fetch with `redirect: 'manual'`, loop ≤ `maxRedirects`, re-validating each `Location` the same way; abort on timeout; stream-read and abort once `maxBytes` exceeded; return generic failures (`API_ERRORS.SOUND_LINK_INVALID`, `SOUND_LINK_TOO_LARGE`) — never pass through foreign messages. `importSoundFromLink(userId, { url })` returns `{ path, url }` (file stored, **not** yet a library row): check library limit, `safeFetchBytes` (1 MiB, 8 s, 3 redirects), `sniffAudioFormat` (null -> `SOUND_FILE_INVALID`), upload with the admin client to `${userId}/<uuid>.<ext>` in bucket `soundboard` (`ensureBucket` first). The server cannot decode audio, so the **client** measures the duration by decoding the returned `url` (`decodeDurationMs`, Task 8): if > 10 s it calls `POST /api/sound-library/discard { path }` (owner-checked, removes the object); otherwise it calls the normal `POST /api/sound-library` with `source: 'link'`, `sourceUrl` and the measured `durationMs`. Signature above therefore becomes `importSoundFromLink(userId, input): Promise<{ path: string; url: string }>`.

Add keys `SOUND_LINK_INVALID`, `SOUND_LINK_TOO_LARGE` to `api-errors.ts` + messages.

- [ ] **Step 1: Failing tests** `isForbiddenAddress`: `127.0.0.1`, `10.1.2.3`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`, `100.64.0.1`, `0.0.0.0`, `::1`, `fc00::1`, `fe80::1`, `::ffff:127.0.0.1` → true; `8.8.8.8`, `2606:4700::1111` → false. `safeFetchBytes` with injected `lookup`: hostname resolving to `10.0.0.5` rejected before any fetch (assert `fetch` mock not called); redirect 302 → `http://127.0.0.1/x` rejected; 4 redirects rejected; body streaming past `maxBytes` aborts; `ftp://` rejected. `sniffAudioFormat`: ID3 header → mp3; `00 00 00 18 66 74 79 70` → m4a; `1A 45 DF A3` → webm; `<html>` bytes → null. `importSoundFromLink`: HTML served as `audio/mpeg` → `SOUND_FILE_INVALID`, nothing uploaded.
- [ ] **Step 2:** Implement; use `fetch` with `redirect: 'manual'` and `AbortSignal.timeout`; mock `fetch` in tests via `vi.stubGlobal`.
- [ ] **Step 3:** Commit `feat(soundboard): SSRF-safe audio link import`.

---

### Task 6: Account routes and play route

**Files:** Create `app/api/sound-library/route.ts`, `[id]/route.ts`, `upload-url/route.ts`, `import/route.ts`, `discard/route.ts`, `sound-library-handlers.ts`; `app/api/sound-presets/route.ts`, `[id]/route.ts`, `order/route.ts`, `sound-preset-handlers.ts`; Modify `app/api/campaigns/[id]/sounds/sound-handlers.ts` (play only), `lib/server/soundboard/publish-play.ts` (event type); Tests `app/api/sound-library/__tests__/routes.test.ts`, `app/api/sound-presets/__tests__/routes.test.ts`, adapt `app/api/campaigns/[id]/sounds/__tests__/sounds-routes.test.ts` to play only.

**Interfaces:** `GET /api/sound-library → SoundLibrary` (ETag via `weakEtag`, `Cache-Control: private, max-age=0, must-revalidate`, like the old list); `POST /api/sound-library` (`createLibrarySoundSchema`, verifies `soundPathOwnedBy(path, userId)` + `verifyUploadedSound`) → 201; `PATCH`/`DELETE [id]`; `POST upload-url` (`soundUploadRequestSchema` → ticket); `POST import { url }` → `{ path, url }`; `POST discard { path }`; presets: `POST`, `PATCH/DELETE [id]`, `PUT order`. All use `requireAuth` and `parseBody`. Play handler: `requireDM(campaignId)` → `findPlayableFor(access.userId, soundId)`; event `{ soundId, nonce, volume, ...(url && { url }) }` (builtin → no `url`).

- [ ] **Step 1: Failing route tests** (mock stores like the existing routes test): unauthenticated → 401 on every route; `PATCH` another user's preset → 404; `PUT order`; play with a sound not owned → 404 and no `publishSoundPlay`; play with a custom sound publishes `url`; play with builtin publishes no `url`; rate limit 429 retained.
- [ ] **Step 2:** Implement handlers (same shape as old `sound-handlers.ts`; keep that file only for `playSoundHandler`, delete the rest of its content and the old routes `[soundId]`, `hidden`, `order`, `upload-url`, `route.ts`).
- [ ] **Step 3:** Commit `feat(soundboard): account library/preset routes; play carries url`.

---

### Task 7: Client API, hooks, playback

**Files:** Create `lib/api/sound-library.ts`; Modify `lib/api/soundboard.ts` (keep only `playSound`); Create `lib/hooks/soundboard/{useSoundLibrary,useLibraryMutations,usePresetMutations,useActivePreset}.ts`; Modify `keys.ts`, `index.ts`, `useSoundboardPads.ts`, `handle-play-event.ts`, `lib/utils/soundboard/resolve-sound.ts`; delete `useSounds.ts`, `useSoundMutations.ts`; Tests in `lib/hooks/soundboard/__tests__/`.

**Interfaces — Produces:**

```ts
// keys.ts
export const soundKeys = { library: () => ['sound-library'] as const };
// useSoundLibrary.ts
export function useSoundLibrary(options?: { enabled?: boolean }): { sounds: LibrarySound[]; byId: Map<string, LibrarySound>; presets: SoundPreset[]; isLoading: boolean };
// builtin sounds merged in client-side from BUILTIN_SOUNDS (always present, read-only)
// useActivePreset.ts
export function useActivePreset(campaignId: string, presets: SoundPreset[]): { preset: SoundPreset | null; setPresetId(id: string): void };
// localStorage key `soundboard.preset.<campaignId>`; falls back to presets[0]; all storage access in try/catch
// useSoundboardPads.ts
export function useSoundboardPads(campaignId: string): { preset; presets; setPresetId; pads: (LibrarySound | null)[] /* length 9 */; play(sound): void; preview(sound): void };
// handle-play-event.ts
export function handleSoundPlayEvent(campaignId: string, data: unknown): void;
// queryClient param removed: builtin resolved by id from BUILTIN_SOUNDS (url made absolute with location.origin), custom uses event.url; unknown/no url → ignore
// api
getSoundLibrary, createLibrarySound, updateLibrarySound, deleteLibrarySound, uploadLibrarySoundFile(file, meta), importSoundLink(url), discardSoundObject(path),
createPreset, updatePreset, deletePreset, reorderPresets
```

Update every caller of `handleSoundPlayEvent` (`grep -rn "handleSoundPlayEvent" lib components app`) — the pusher sync hooks pass `(queryClient, campaignId, data)` today.

- [ ] **Step 1: Failing tests:** `useActivePreset` restores saved id, falls back to first when saved id was deleted, tolerates throwing `localStorage`; `handleSoundPlayEvent` plays `event.url` for a custom sound without any fetch (assert `fetch` of library not called), plays a builtin by id, dedupes by nonce, ignores unknown id without url; `useSoundboardPads` returns 9 entries with `null` for empty/missing slots and `play` sends `{ soundId, nonce }` and local `playBuffer`.
- [ ] **Step 2:** Implement. Mutations use `useCrudMutation` with `invalidateKeys: [soundKeys.library()]`.
- [ ] **Step 3:** Commit `feat(soundboard): library hooks and url-carrying playback`.

---

### Task 8: Recorder hook and add-sound flows

**Files:** Create `lib/hooks/soundboard/useSoundRecorder.ts`, `components/soundboard/library/{AddSoundMenu,RecordDialog,LinkDialog}.tsx`, `lib/utils/soundboard/decode-duration.ts`; Tests `lib/hooks/soundboard/__tests__/useSoundRecorder.test.tsx`, `components/soundboard/library/__tests__/*.test.tsx` (`// @vitest-environment happy-dom`).

**Interfaces — Produces:**

```ts
export function useSoundRecorder(): {
  supported: boolean;                       // typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  state: 'idle' | 'recording' | 'ready' | 'denied' | 'error';
  elapsedMs: number;
  start(): Promise<void>;                   // picks 'audio/mp4' if isTypeSupported, else 'audio/webm;codecs=opus'; auto-stops at MAX_SOUND_SECONDS*1000
  stop(): void;
  result: File | null;                      // named rec.<ext>, type matches format
  reset(): void;                            // stops tracks, clears
}
export function decodeDurationMs(file: Blob | string): Promise<number>; // via AudioContext.decodeAudioData
```

`AddSoundMenu` (button with three entries: file / record / link; record entry hidden when `!supported`). `RecordDialog`: record → stop → preview ▶ → name/icon → save via `uploadLibrarySoundFile` with `source: 'record'`. `LinkDialog`: url input → `importSoundLink` → `decodeDurationMs(url)` → if > 10 s call `discardSoundObject` and show `soundboard.link.tooLong` → else `createLibrarySound({ source: 'link', sourceUrl })`. File add: reuse `validateSoundFile` + measured duration, then `uploadLibrarySoundFile`.

- [ ] **Step 1: Failing tests:** hook with a fake `MediaRecorder` (stub class + `getUserMedia`): start→recording, auto-stop after 10 s with fake timers, `denied` when `getUserMedia` rejects with `NotAllowedError`, tracks stopped on `reset`; `supported=false` when `MediaRecorder` undefined; `AddSoundMenu` hides record entry then; `LinkDialog` calls `discardSoundObject` for an 11 s decode and does not create a row.
- [ ] **Step 2:** Implement (mirror existing `SoundUploader` for file add; delete it once `AddSoundMenu` covers file add).
- [ ] **Step 3:** Commit `feat(soundboard): record and link add flows`.

---

### Task 9: In-game panel with presets

**Files:** Modify `components/soundboard/SoundboardPanel.tsx`, `SoundPad.tsx` (accept `null` slot → empty placeholder, show icon + optional label); Create `components/soundboard/SoundSlotDialog.tsx`; Delete `SoundEditDialog.tsx`, `HiddenBuiltinSounds.tsx`, `SoundUploader.tsx` after replacement (their library-page successors are Task 10); update tests in `components/soundboard/__tests__/`.

**Interfaces:** `SoundboardPanel({ campaignId })` (unchanged signature, so the 3 mount points need no edits). Panel: header «Звуки» toggle; open → `SelectField` of presets (options from `presets`), 3×3 grid of `pads`, pencil toggles "replace slot" mode; in that mode a pad click opens `SoundSlotDialog({ open, slotIndex, preset, onClose })`. The dialog lists library + builtin sounds (search via `useSearch`), a «clear slot» button and a link «Open library» to `/library/sounds`; choosing calls `updatePreset(preset.id, { slots })` with the slot replaced. Keys 1–9 still map to the active preset pads (`useSoundboardKeys(pads.filter(Boolean), play)` must keep index→pad mapping: pass the 9-length array and skip `null`s — adapt the hook signature and its test).

- [ ] **Step 1: Failing tests:** switching the select changes visible pads and persists via `useActivePreset`; empty slot renders placeholder and does not call `play`; replace mode → dialog → pick sound → `updatePreset` called with 9-length slots where only that index changed; pressing `3` plays the pad in slot index 2; panel hides nothing for `readOnly`-style props (mount points keep their own conditions).
- [ ] **Step 2:** Implement; keep `w-72 max-w-full` panel width.
- [ ] **Step 3:** Commit `feat(soundboard): preset-driven panel and slot dialog`.

---

### Task 10: Library page

**Files:** Create `app/library/sounds/page.tsx`, `page-client.tsx`; `components/soundboard/library/{SoundTile,SoundEditDialog,PresetList,PresetEditor}.tsx` (`SoundEditDialog` here is the new library version: name, icon picker from `SOUND_ICONS`, color, volume slider, delete via `useConfirm`); Modify `components/layout/Header.tsx` (add «Бібліотека звуків» to the profile/user menu next to the profile link); Tests `components/soundboard/library/__tests__/`, `app/library/sounds/__tests__/page-client.test.tsx`.

**Interfaces:** `page.tsx` is a server component requiring a session (redirect to login like `app/profile/page.tsx`) and rendering `<SoundLibraryPageClient />`. Client: `HudPage` + `HudPageHeader`; two sections — «Звуки» (tiles grid, `AddSoundMenu`, builtin tiles read-only with a badge) and «Пресети» (`PresetList` with create/rename/delete/reorder up-down buttons via `reorderPresets`, `PresetEditor` = 3×3 slot grid; click slot → `SoundSlotDialog` reuse; per-slot clear). Deleting a library sound asks confirmation naming the presets that use it.

- [ ] **Step 1: Failing tests:** page renders library tiles and presets from mocked hooks; creating a preset calls `createPreset`; delete sound shows confirm listing affected presets; builtin tile has no edit/delete; mobile layout not tested.
- [ ] **Step 2:** Implement following `app/profile` conventions; no `fetch`/`@/lib/api` in components.
- [ ] **Step 3:** Commit `feat(soundboard): sound library page`.

---

### Task 11: i18n, onboarding, docs

**Files:** Modify `messages/uk/soundboard.json`, `messages/en/soundboard.json` (new keys: `library.*`, `preset.*`, `record.*`, `link.*`, `slot.*`, errors), `messages/{uk,en}/whatsNew.json`, `lib/onboarding/whats-new.ts` (entry `soundLibrary`), `messages/{uk,en}/errors.json` for new API error keys, `docs/architecture/soundboard.md`, `docs/STATUS.md`.

- [ ] **Step 1:** Add keys in both locales (the key-parity test fails otherwise — run `pnpm test:run lib/__tests__/i18n` equivalent: `pnpm test:related messages/uk/soundboard.json`).
- [ ] **Step 2:** Rewrite `docs/architecture/soundboard.md` for the account library/presets model (data, routes, event with `url`, import safety, localStorage preset); update STATUS.
- [ ] **Step 3:** Commit `docs(soundboard): library/presets architecture, whats-new, i18n`.

---

### Task 12: Cleanup, drop migration, gates

**Files:** Delete leftovers of the per-campaign model (`lib/server/soundboard/sound-store.ts` + test, old hooks/components/tests no longer imported — find with `pnpm exec tsc --noEmit` and `grep -rn "campaignSound\|hiddenBuiltinSounds"`); Create `prisma/migrations/20261210000001_drop_campaign_sounds/migration.sql` (`DROP TABLE "campaign_sounds"; ALTER TABLE "campaigns" DROP COLUMN "hidden_builtin_sounds";`) and remove the models/field from the schema.

- [ ] **Step 1:** Remove dead code; run `pnpm exec tsc --noEmit`, `pnpm cycles`, `pnpm lint:dirs --changed main`, then the **full** `pnpm test:run` once (also runs the ratchets).
- [ ] **Step 2:** Run `/simplify` on the branch diff (1–2 agents), apply.
- [ ] **Step 3: Live run** (browser, subagent on Sonnet, real Supabase/Pusher, prodcopy DB per `feedback-browser-live-check`): DM opens `/library/sounds`; starter presets exist; add file, record (mic permission may need user), link (`https://…/x.mp3`) sounds; edit icon/label; assign to a preset; open a battle and the show page, switch presets, play pads; second browser as player hears each custom sound (event `url`); try `http://localhost/x.mp3` link → rejected.
- [ ] **Step 3b:** Commit; the drop migration deploys with the merge only after the new code is live — **ask the user «так» before pushing**, and tell them the drop is the second deploy step if they want zero-risk rollback.
- [ ] **Step 4:** Update `docs/STATUS.md`, move spec+plan to `docs/archive/superpowers/` in the merge commit, save a project memory.
