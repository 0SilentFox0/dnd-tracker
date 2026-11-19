# Soundboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DM presses a pad and every player in the campaign hears a short sound (built-in CC0 set + DM uploads), in battle, on «Показ», in scenario play and on world-map play.

**Architecture:** Ephemeral `soundboard-play` Pusher event (`{ soundId, nonce, volume }`, no URLs) published server-side in `after()` to the show channel and the active battle channel. Clients resolve the URL from their cached sound list / static built-in registry and play through one WebAudio singleton. The handler is added to the **existing** `usePusherShowSync` / `usePusherBattleSync` (a second `usePusherChannel` on the same channel would `pusher.unsubscribe` the first one's channel on cleanup). Custom sounds live in a new `campaign_sounds` table; CRUD is hand-written (not a `ContentKind`).

**Tech Stack:** Next.js 16 route handlers, Prisma 6 (+ migration), Zod, TanStack Query, Pusher, Supabase Storage (bucket `soundboard`), WebAudio, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-soundboard-design.md`

## Global Constraints

- Layering: route → `lib/api/soundboard.ts` → `lib/hooks/soundboard/` (barrel `index.ts`, keys in `keys.ts`) → `components/soundboard/`; components never import `@/lib/api/*` or call `fetch` (ESLint).
- `@/…` imports only; English comments, minimal, one line; new code identifiers English; no Cyrillic in code (i18n ESLint).
- Migration is expand-only and `CREATE TABLE` has `ENABLE ROW LEVEL SECURITY`; migrations run only in prod builds from `main`.
- Errors are `{ error, issues? }` using keys in `lib/constants/api-errors.ts` (+ `messages/{uk,en}/errors.json`).
- Egress: event payload carries ids only; list `GET` has weak ETag (`weakEtag`/`ifNoneMatch` from `lib/utils/api/etag.ts`); sound files cached `TRACK_CACHE_SECONDS`.
- Limits (verbatim from spec): `MAX_SOUNDS_PER_CAMPAIGN = 60`, file ≤ 1 MB, duration ≤ 10 s, formats mp3/m4a (`TRACK_FORMATS`), play rate ≤ ~5/s per DM, voices ≤ 8 simultaneous, nonce LRU 50, client double-click guard 250 ms.
- Agents write tests but do **not** run the full suite; `pnpm test:related`/single files only. One full `pnpm test:run` at the end (Task 9). Lint per folder: `pnpm exec eslint --fix <files>`.
- UI rules: `ResponsiveDialog`, `useConfirm`/`useNotify`, `HudButton`/`HudTile`/`HudPanel`, ≤ ~7 props, shared widgets from `components/common`/`components/hud` first.
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- DM double-click / key repeat on a pad: one play, not two (guard + server rate limit returns 429, client shows nothing scary).
- Player not yet unlocked / `AudioContext` suspended: event is dropped silently, no uncaught rejection, no queued burst when they later click.
- Sound deleted or hidden after being cached on a player's client, or unknown `soundId` in an event: ignored; `play` of an unknown id → 404.
- Same client subscribed to both channels (or DM echo of own press): sound plays once (nonce dedupe); DM plays locally immediately.
- DM in player-view (`readOnly`) / muted music pref: panel not rendered, sounds silent; player with muted pref hears nothing.
- Upload of a non-audio, >1 MB or >10 s file, or a `path` belonging to another campaign: rejected (400/403), nothing stored.
- Campaign at 60 sounds: create → 400 `SOUND_LIMIT`; deleting a custom sound removes the Storage object (or leaves no dangling row).

## File Structure

| Path | Responsibility |
|---|---|
| `lib/constants/soundboard.ts` | limits, bucket name, event name, storage keys, `BUILTIN_SOUNDS` registry |
| `types/soundboard.ts` | `Sound`, `SoundSource`, `SoundPlayEvent`, `SoundList` |
| `lib/schemas/soundboard.ts` | Zod: upload request, create, update, order, hidden, play |
| `lib/utils/soundboard/` | pure: `resolve-sound.ts`, `dedupe.ts`, `volume.ts`, `voices.ts`, `validate-file.ts` |
| `prisma/schema/core.prisma` + migration | `CampaignSound`, `Campaign.hiddenBuiltinSounds` |
| `lib/supabase/soundboard-storage.ts` | bucket ensure, signed upload ticket, ownership regex, remove object |
| `lib/server/soundboard/` | `sound-store.ts` (CRUD), `publish-play.ts` (Pusher fan-out) |
| `app/api/campaigns/[id]/sounds/**` | thin routes + `sound-handlers.ts` |
| `lib/api/soundboard.ts` | client wrappers |
| `lib/hooks/soundboard/` | `keys`, `useSounds`, `useSoundMutations`, `useSoundboardPads`, `player.ts` (WebAudio singleton), `handle-play-event.ts` |
| `components/soundboard/` | `SoundboardPanel`, `SoundPad`, `SoundEditDialog`, `SoundUploader` |
| `public/sfx/*.mp3` + `public/sfx/LICENSE.md` | built-in CC0 sounds |
| `messages/{uk,en}/soundboard.json`, `whatsNew.json` | texts |
| `docs/architecture/soundboard.md` | subsystem doc + index row + STATUS |

---

### Task 1: Constants, types, schemas, pure utils

**Files:**
- Create: `lib/constants/soundboard.ts`, `types/soundboard.ts`, `lib/schemas/soundboard.ts`, `lib/utils/soundboard/{resolve-sound,dedupe,volume,voices,validate-file}.ts`, tests in `lib/utils/soundboard/__tests__/`, `lib/schemas/__tests__/soundboard.test.ts`
- Modify: `lib/schemas/index.ts` (add `export * from './soundboard'`)

**Interfaces:**
- Produces (constants): `SOUNDBOARD_BUCKET = 'soundboard'`, `SOUNDBOARD_PLAY_EVENT = 'soundboard-play'`, `MAX_SOUNDS_PER_CAMPAIGN = 60`, `MAX_SOUND_BYTES = 1_048_576`, `MAX_SOUND_SECONDS = 10`, `SOUND_NAME_MAX = 60`, `MAX_VOICES = 8`, `NONCE_LRU = 50`, `PAD_GUARD_MS = 250`, `PLAY_RATE_LIMIT = { limit: 20, windowSeconds: 10 }`, `BUILTIN_SOUNDS: readonly BuiltinSound[]` (`{ id: 'builtin:<slug>', nameKey: string, icon: string, url: string }`, urls `/sfx/<slug>.mp3`; slugs: `door-open`, `door-slam`, `sword-hit`, `sword-draw`, `bow-shot`, `thunder`, `explosion`, `fire`, `magic-cast`, `heal`, `wolf-howl`, `tavern`, `footsteps`, `scream`, `coins`, `bell`, `chest-open`, `glass-break`, `dragon-roar`, `crowd-cheer`).
- Produces (types): `Sound { id: string; source: 'builtin' | 'custom'; name: string; url: string; volume: number; color: string | null; icon: string | null; sortOrder: number; durationMs: number | null }`; `SoundList { sounds: CustomSoundRow[]; hiddenBuiltin: string[] }`; `SoundPlayEvent { soundId: string; nonce: string; volume: number }`.
- Produces (utils):
  - `resolveSound(id: string, lib: { custom: Sound[]; hiddenBuiltin: string[] }): Sound | null` — `builtin:*` from registry (null if hidden/unknown, `name` = `nameKey`), else from `custom`.
  - `createNonceGuard(size = NONCE_LRU): (nonce: string) => boolean` — returns `true` the first time, `false` for a repeat within the LRU window.
  - `effectiveVolume(sound: { volume: number }, prefs: { volume: number; muted: boolean }): number` — `0` when muted, else `clamp(sound.volume * prefs.volume, 0, 1)`.
  - `createVoicePool(max = MAX_VOICES)` → `{ add(stop: () => void): () => void }` (oldest `stop()` called when over max; returned fn removes it).
  - `validateSoundFile(file: { name: string; type: string; size: number }): Result<TrackFormat>` (reuse `validateTrackFile` logic with `MAX_SOUND_BYTES`; do not duplicate format table — import `TRACK_FORMATS`).
- Schemas: `soundUploadRequestSchema` (`name`, `size ≤ MAX_SOUND_BYTES`, `contentType`), `createSoundSchema` (`path`, `name` ≤ `SOUND_NAME_MAX`, `durationMs` int 1..10000 optional, `color`/`icon` optional ≤ 24 chars), `updateSoundSchema` (partial of name/volume 0..1/color/icon, at least one field), `reorderSoundsSchema` (`ids: string[]` ≤ 60), `hiddenBuiltinSchema` (`ids` each must start with `builtin:` and exist in registry), `playSoundSchema` (`soundId` ≤ 80, `nonce` ≤ 40).

- [ ] **Step 1:** Write failing tests: `resolveSound` (builtin ok / hidden → null / unknown → null / custom ok), `createNonceGuard` (repeat false, 51st evicts first), `effectiveVolume` (muted → 0, clamp), `createVoicePool` (9th add stops the 1st only), `validateSoundFile` (mp3 ok, 2 MB rejected, `.wav` rejected), schemas (hiddenBuiltin rejects `custom-id`; update rejects `{}`).
- [ ] **Step 2:** Run `pnpm test:run lib/utils/soundboard lib/schemas/__tests__/soundboard.test.ts` → FAIL (modules missing).
- [ ] **Step 3:** Implement files above (reuse `clamp` from `@/lib/utils/common/clamp`, `Result` from `@/types/common`).
- [ ] **Step 4:** Re-run → PASS. `pnpm exec eslint --fix` on touched files.
- [ ] **Step 5:** Commit `feat(soundboard): constants, schemas and pure utils`.

### Task 2: Prisma model and migration

**Files:** Modify `prisma/schema/core.prisma` (model next to `CampaignTrack`, relation on `Campaign`); Create `prisma/migrations/20261208000000_campaign_sounds/migration.sql`.

**Interfaces:** Produces model `CampaignSound { id cuid, campaignId, name, url, durationMs Int?, volume Float @default(1), color String?, icon String?, sortOrder Int @default(0), createdAt }` `@@index([campaignId, sortOrder])` `@@map("campaign_sounds")`; `Campaign.hiddenBuiltinSounds String[] @default([])`, `Campaign.sounds CampaignSound[]`.

- [ ] **Step 1:** Add model + columns; run `pnpm exec prisma migrate dev --name campaign_sounds` against the local DB; rename the generated folder to the timestamp above if the clock differs (must sort after `20261207000000_skill_tree_progress`).
- [ ] **Step 2:** Edit `migration.sql`: ensure `ALTER TABLE "campaign_sounds" ENABLE ROW LEVEL SECURITY;` follows the `CREATE TABLE` and FK; the `ALTER TABLE campaigns ADD COLUMN "hidden_builtin_sounds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]` is the only change to an existing table (expand-only).
- [ ] **Step 3:** `pnpm exec prisma generate`; run the repo's migration-guard test (`pnpm test:run` filter `migrations` — find via `ls prisma/__tests__`) → PASS.
- [ ] **Step 4:** Commit `feat(soundboard): campaign_sounds table`.

### Task 3: Server store, storage ticket, publisher

**Files:** Create `lib/supabase/soundboard-storage.ts`, `lib/server/soundboard/{sound-store,publish-play}.ts`, tests in `lib/server/soundboard/__tests__/`; Modify `lib/constants/api-errors.ts` (+ `messages/{uk,en}/errors.json`): `SOUND_LIMIT: 'errors.soundLimit'` (add `{ max: MAX_SOUNDS_PER_CAMPAIGN }` to the params map next to `TRACK_LIMIT`), `SOUND_NOT_FOUND`, `SOUND_FILE_INVALID`.

**Interfaces:**
- Consumes: Task 1 constants/schemas; `createAdminClient`, `ensureBucket`, `bucketObjectPath` (mirror `lib/supabase/battle-music-storage.ts`: `createSoundUploadTicket(campaignId, format): Promise<Result<TrackUploadTicket>>`, `soundPathOwnedBy(path, campaignId): boolean`, `verifyUploadedSound(path)` — checks size/type of the stored object, `removeSoundObject(path)`).
- Produces (`sound-store.ts`): `listSounds(campaignId): Promise<SoundList>`, `soundsVersion(campaignId): Promise<string>` (count + max(createdAt) + hidden length, for ETag), `createSound(campaignId, input): Promise<Sound>` (limit check → `ContentError(API_ERRORS.SOUND_LIMIT, 400)`, ownership check, verify object), `updateSound(campaignId, soundId, patch)`, `deleteSound(campaignId, soundId)` (row + object), `reorderSounds(campaignId, ids)`, `setHiddenBuiltin(campaignId, ids)`, `findPlayable(campaignId, soundId): Promise<{ volume: number } | null>` (builtin: not hidden; custom: exists in campaign; returns the volume).
- Produces (`publish-play.ts`): `publishSoundPlay(campaignId, event: SoundPlayEvent): Promise<void>` — looks up the newest ACTIVE `battleScene` (same query as `lib/server/battles/read-service.ts`), calls `safePusherTrigger` for `showChannelName(campaignId)` and, if a battle exists, `battleChannelName(battle.id)`, event `SOUNDBOARD_PLAY_EVENT`; to be called inside `after()`.

- [ ] **Step 1:** Failing tests (prisma mocked as in neighbouring `lib/server/**/__tests__`): limit 60 → throws `SOUND_LIMIT`; foreign `path` → throws 403-class `ContentError`; `findPlayable` hidden builtin → null; `publishSoundPlay` with battle triggers 2 channels, without battle 1; `delete` removes object.
- [ ] **Step 2:** Run the files → FAIL. **Step 3:** Implement. **Step 4:** PASS + eslint. **Step 5:** Commit `feat(soundboard): server store, storage and publisher`.

### Task 4: Routes

**Files:** Create `app/api/campaigns/[id]/sounds/{route.ts,sound-handlers.ts}`, `…/sounds/upload-url/route.ts`, `…/sounds/[soundId]/route.ts`, `…/sounds/order/route.ts`, `…/sounds/hidden/route.ts`, `…/sounds/play/route.ts`; tests next to them in `__tests__/`.

**Interfaces:**
- Consumes: Task 3 store/publisher; `requireCampaignAccess`, `requireDM`, `parseBody`, `errorResponse`, `handleApiError`, `weakEtag`/`ifNoneMatch`, `checkRateLimit`/`rateLimitResponse`, `after` from `next/server`.
- Produces: `GET sounds` (any member; `Cache-Control` per `cache-headers.ts`, ETag `weakEtag(campaignId, version)`, 304 via `ifNoneMatch`) → `SoundList`; `POST sounds/upload-url` (DM) → `TrackUploadTicket`; `POST sounds` (DM) → `Sound`; `PATCH|DELETE sounds/[soundId]` (DM); `PUT sounds/order` (DM) body `reorderSoundsSchema`; `PUT sounds/hidden` (DM) body `hiddenBuiltinSchema`; `POST sounds/play` (DM) body `playSoundSchema` → `{ ok: true }`: validates `findPlayable` (404 `SOUND_NOT_FOUND`), `checkRateLimit({ userId, scope: 'soundboard-play', ...PLAY_RATE_LIMIT })` (429 via `rateLimitResponse`), then `after(() => publishSoundPlay(campaignId, { soundId, nonce, volume }))`.
- Routes stay thin: Zod + session + delegate to `sound-handlers.ts`.

- [ ] **Step 1:** Failing route tests: player → 403 on every write and on `play`; `GET` twice with `If-None-Match` → 304; `play` unknown id → 404; `play` 21st within window → 429; `play` valid → 200 and publisher called once (mock `after` to run callback); create over limit → 400; cross-campaign `[soundId]` → 404.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ eslint). **Step 5:** Commit `feat(soundboard): sounds API`.

### Task 5: Client API and hooks (data)

**Files:** Create `lib/api/soundboard.ts`, `lib/hooks/soundboard/{keys,useSounds,useSoundMutations,index}.ts`, tests in `lib/hooks/soundboard/__tests__/`.

**Interfaces:**
- Produces (api): `getSounds(campaignId): Promise<SoundList>`, `uploadSoundFile(campaignId, file, meta: { name: string; durationMs: number }): Promise<Sound>` (same direct-to-Storage flow as `uploadTrackFile` in `lib/api/tracks.ts`, validate with `validateSoundFile`), `updateSound`, `deleteSound`, `reorderSounds(campaignId, ids)`, `setHiddenBuiltin(campaignId, ids)`, `playSound(campaignId, { soundId, nonce }): Promise<{ ok: true }>`.
- Produces (hooks): `soundKeys.list(campaignId) = ['sounds', campaignId] as const`; `useSounds(campaignId, { enabled? }): UseQueryResult<SoundList>` (`staleTime: 60_000`); `useSoundMutations(campaignId): { upload, update, remove, reorder, hide }` each invalidating `soundKeys.list`; `useSoundLibrary(campaignId): { custom: Sound[]; hiddenBuiltin: string[]; all: Sound[] }` (`all` = visible builtin from registry + custom, sorted).

- [ ] **Step 1:** Failing tests: `useSounds` keys/`enabled`; `useSoundLibrary` merges and hides builtin; `upload` rejects a 2 MB file before any request.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5:** Commit `feat(soundboard): client api and data hooks`.

### Task 6: Playback engine and event wiring

**Files:** Create `lib/hooks/soundboard/{player,handle-play-event,useSoundboardPads}.ts`, tests; Modify `lib/hooks/show/usePusherShowSync.ts` (add `[SOUNDBOARD_PLAY_EVENT]` handler), `lib/hooks/battle/usePusherBattleSync.ts` (same, next to `BATTLE_AUDIO_EVENT`), `lib/hooks/soundboard/index.ts`.

**Interfaces:**
- Consumes: Task 1 utils, Task 5 `soundKeys`/`getSounds`, `useAudioPrefs` pref stores (`AUDIO_VOLUME_KEY` and `AUDIO_MUTED_KEY`: the soundboard shares the existing dock volume/mute, so no new UI or storage key; read the stores outside React via `.get()`, export them from `useAudioPrefs.ts` if they are not exported yet).
- Produces (`player.ts`, module singleton, no React): `armUnlock(): void` (idempotent; one-shot `pointerdown`/`keydown` listeners on `document` that create/resume the `AudioContext`); `playBuffer(sound: Sound, volume: number): Promise<void>` (fetch+decode with an in-memory `Map<url, AudioBuffer>`, `GainNode`, registers in a `createVoicePool()`, never throws — swallow and `logger.warn`; no-op when context is not `running`); `previewSound(sound)` same without nonce. `__resetForTests()`.
- Produces (`handle-play-event.ts`): `handleSoundPlayEvent(queryClient, campaignId, data: unknown): void` — validates shape (`soundId`/`nonce` strings), module-level `createNonceGuard()`, resolves via `queryClient.getQueryData<SoundList>(soundKeys.list(campaignId))` else `queryClient.fetchQuery` (once), `resolveSound`, `effectiveVolume`, then `playBuffer`. Also `markLocalPlay(nonce)` (adds to the guard so the DM's own echo is ignored).
- Produces (`useSoundboardPads(campaignId)`): `{ sounds: Sound[]; play(sound: Sound): void; preview(sound: Sound): void }` — `play` = guard `PAD_GUARD_MS` per sound id, `nonce = crypto.randomUUID()`, `markLocalPlay`, `playBuffer` locally at `effectiveVolume`, then `playSound(...)` (errors → `useNotify`, 429 silent); `preview` = local only.
- Wiring: both sync hooks call `handleSoundPlayEvent(queryClient, campaignId, data)`; call `armUnlock()` once on mount in those hooks' parent effect (`useEffect(armUnlock, [])` inside the sync hooks is acceptable).

- [ ] **Step 1:** Failing tests (mock `AudioContext`, `fetch`): duplicate nonce plays once; unknown id ignored without throw; suspended context → no play, no throw; 9th simultaneous voice stops the first; `play` twice within 250 ms posts once; `markLocalPlay` suppresses echo; muted pref → volume 0 (not played). Update the two existing sync-hook tests to assert the new handler is bound.
- [ ] **Step 2–4:** FAIL → implement → PASS (also run `pnpm test:related lib/hooks/show/usePusherShowSync.ts lib/hooks/battle/usePusherBattleSync.ts`). **Step 5:** Commit `feat(soundboard): playback engine and pusher wiring`.

### Task 7: UI

**Files:** Create `components/soundboard/{SoundboardPanel,SoundPad,SoundEditDialog,SoundUploader}.tsx` (+ `__tests__`, `// @vitest-environment happy-dom`), `lib/hooks/soundboard/useSoundboardKeys.ts`; Modify mount points: `components/battle/scene/BattleScreen.tsx` and `components/battle/scene/MobileBattleLayout.tsx` (DM only, next to `AudioDock`), `app/campaigns/[id]/show/page-client.tsx` (inside `effectiveDM` block, next to `ShowControlPanel`), `components/scenario/play/ScenarioShowDock.tsx`.

**Interfaces:**
- Consumes: Task 5/6 hooks; `ResponsiveDialog`, `HudPanel`, `HudTile`, `HudButton`, `useConfirm`, `useNotify`, `ImageUpload`-style file input pattern from the track uploader (find via `components/music/`).
- Produces: `SoundboardPanel({ campaignId }: { campaignId: string })` — collapsible HUD panel: grid of `SoundPad`s (name, icon, colour, pad number 1–9), toolbar «Edit» toggle; in edit mode each pad opens `SoundEditDialog` (rename, volume `Slider`, colour, hide/delete via `useConfirm`, builtin = hide only), `SoundUploader` button (reads duration via `lib/utils/audio/read-duration.ts`), a long-press / secondary button «Only me» per pad = `preview`. `useSoundboardKeys(pads: Sound[] | null, play)` — digits `1`–`9` call `play(pads[n-1])`, ignored when focus is in `input/textarea/select/contenteditable`, when a dialog is open (`document.querySelector('[role=dialog]')`), or with modifier keys; pass `null` to disable. Player-view (`readOnly`) and non-DM: panel is not mounted.
- Props `SoundPad({ sound, index, actions: { onPlay, onPreview, onEdit }, editing })`.

- [ ] **Step 1:** Failing tests: pads render builtin + custom, hidden builtin absent; click calls `play` with the sound; key `3` plays the third pad, ignored inside an `<input>` and under `[role=dialog]`; edit mode shows edit/delete, builtin offers hide not delete; panel not rendered for non-DM mount helper (test the mount condition in the host test where one exists).
- [ ] **Step 2–4:** FAIL → implement (HUD kit components only, no raw `<button>`) → PASS; `pnpm exec eslint --fix components/soundboard lib/hooks/soundboard` and the touched mount files. **Step 5:** Commit `feat(soundboard): DM panel and pads`.

### Task 8: Built-in assets, i18n, onboarding, docs

**Files:** Create `public/sfx/*.mp3` (20 files from `BUILTIN_SOUNDS`, ≤ 100 KB each, mono, 64–96 kbps) and `public/sfx/LICENSE.md` (source and licence per file), `messages/{uk,en}/soundboard.json`, `docs/architecture/soundboard.md`; Modify `lib/onboarding/whats-new.ts` (`{ id: '2026-11-soundboard', date: '2026-11-19', audience: 'all' }` at the top of `CORE_WHATS_NEW`), `messages/{uk,en}/whatsNew.json` (`whatsNew.2026-11-soundboard`), `messages/{uk,en}/help.json` (article «Soundboard»; add its entry where help articles are registered — follow how `dm-rule-systems` is wired), the i18n namespace registry used by `getTranslator`/`next-intl` loading (find via `grep -rn "battleWfrp" lib/i18n*`), `docs/architecture/README.md` (index row), `docs/STATUS.md`.

**Interfaces:** `soundboard.json` keys: `panel.title`, `panel.edit`, `panel.upload`, `pad.onlyMe`, `dialog.*`, `builtin.<slug>` for each registry `nameKey` (`soundboard.builtin.<slug>`), uk and en with identical key sets (tests check keys).

- [ ] **Step 1:** Source 20 CC0 sounds (Kenney Impact/RPG audio packs, Freesound CC0, or OpenGameArt CC0); transcode with `ffmpeg -i in -ac 1 -b:a 80k out.mp3`; record each in `LICENSE.md`. If fewer than 20 are available, remove the missing slugs from `BUILTIN_SOUNDS` (registry and files must match; add a test that every registry url exists under `public/`).
- [ ] **Step 2:** Add messages + whats-new + help; run the i18n key-parity test and the Cyrillic-in-code lint (`pnpm exec eslint` on touched TS).
- [ ] **Step 3:** Write `docs/architecture/soundboard.md` (data, event flow, why handlers live in the existing sync hooks, limits, ephemeral events, built-in registry), add the index row, add a STATUS entry (branch, deploy note: migration `campaign_sounds` goes to prod with the deploy; bucket `soundboard` is created lazily by `ensureBucket`).
- [ ] **Step 4:** Commit `feat(soundboard): built-in sounds, texts and docs`.

### Task 9: Gates and live verification

- [ ] **Step 1:** `pnpm exec tsc --noEmit` → 0 errors; `pnpm cycles` → no new cycles; `pnpm lint:dirs --changed main`; `pnpm test:run` (full, once) → green.
- [ ] **Step 2:** `/simplify` on the branch diff (1–2 agents); fix; update touched docs.
- [ ] **Step 3:** Live check on the deployed preview/stage (user rule — no «done» without it; if no stage is reachable, state that explicitly): two browser windows (DM + player on battle, then on `/show`): press a pad → player hears it once; DM hears it once; upload a custom sound, hide a builtin, delete a custom one; player with muted pref hears nothing; 25 rapid presses → no error toast. Use a Sonnet subagent for the browser run (scaled screenshots, JS/text checks).
- [ ] **Step 4:** Report results, leave the branch unmerged until the user says «так» (no push without asking).
