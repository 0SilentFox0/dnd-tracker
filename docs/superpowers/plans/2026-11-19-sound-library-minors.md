# Sound library deferred minors

Source of truth: `.superpowers/sdd/sound-library-final-review.md` in the main checkout `/Users/silentfox/Work/dnd-tracker` (section Minor; read M-items by id; it is git-ignored so not in this worktree). I1–I4, M2, M5, M7 are already fixed on main.

## Global Constraints
- Layering/rules from CLAUDE.md apply (hooks own logic, `lib/utils` never imports `lib/server`, errors via `API_ERRORS` keys, new texts i18n keys in both `messages/*`, no Cyrillic in code).
- Comments minimal, English, only for non-obvious why.
- Migrations are expand-only; avoid new migrations unless unavoidable.
- Agents write tests but do NOT run the full suite; run only the covering test files with `pnpm test:run <file>`; no repo-wide eslint (lint touched files only).
- Commit per task. Commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Task 1: Serialize sound/preset writes per user (M1, M3, M6, M9 tests)
Files: `lib/server/soundboard/{library-store,preset-store}.ts` (+ a small shared lock helper, e.g. `user-lock.ts`, reusing the `pg_advisory_xact_lock(hashtext('sound-presets:'||userId))` pattern from `seedStarterPresets`), tests in sibling `__tests__/`.
- M1: `deleteLibrarySound` transaction and `updatePreset` (assertSlotsPlayable + update) take the same per-user lock inside one transaction, so a preset can't reference a deleted id.
- M3: `createLibrarySound` (count + create) and `createPreset` (count + aggregate + create) run count and insert under the same lock/transaction so limits (100 sounds / 30 presets) hold under concurrency.
- M6: inside the lock, reject a `createLibrarySound` whose verified url already exists for the user (use an existing API_ERRORS key or add a new one with i18n keys in both locales; a 409/400).
- Tests: fix the `$transaction` mock so `tx` is a distinct object from `db` and assert writes go through `tx` (moving them outside must fail the test); add a concurrent-seeding test (two parallel `getLibrary` for one user produce one seeding; model the lock with a simple mutex in the mock); tests for M1/M3/M6 behaviour.

## Task 2: Server-side durationMs, play-event origin allowlist, shared audio formats, error text (M4, M8, M10, M11)
- M4: server must not trust client `durationMs`. Inspect what `verifyUploadedSound` / `lib/supabase/audio-upload.ts` have; if a parser dependency already exists use it, otherwise derive an upper-bound check (e.g. size vs a minimum plausible bitrate and/or container header parse) so a clip longer than the 10 000 ms schema max cannot be registered with a lying `durationMs`. Prefer no new dependency; if one is unavoidable, pick a small well-known one and say why in the report. Overwrite stored `durationMs` with the server-determined value when available.
- M8: `lib/hooks/soundboard/handle-play-event.ts` plays only urls under the Supabase storage public prefix for the soundboard bucket (reuse existing url/prefix helpers, e.g. `soundObjectPath`/supabase public url builder; check `lib/utils` for one); builtin urls still allowed. Tests.
- M10: shared `AUDIO_FORMATS` (or equivalent) so `lib/api/upload-audio-file.ts` no longer depends on soundboard constants; music `TRACK_FORMATS` behaviour unchanged.
- M11: `lib/supabase/audio-upload.ts` must not return raw Supabase `error.message` to the client; log server-side, return a generic `API_ERRORS` key.
