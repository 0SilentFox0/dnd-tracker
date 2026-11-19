# Media egress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take Supabase Storage egress off the image delivery path (Cloudflare cache), shrink map/slide files, cap scenario history, and give rate-limit a real Redis.

**Architecture:** A Cloudflare Worker proxies and caches `/storage/v1/object/public/*` from Supabase. The app rewrites Supabase Storage URLs to the Worker host at render time only (`toMediaUrl`); stored URLs stay canonical, uploads still go to Supabase. Compression is tightened via constants plus a dry-run-first backfill script. Upstash comes from the Vercel Marketplace.

**Tech Stack:** Cloudflare Workers + wrangler, Next.js 16, Vitest, Prisma, `@upstash/ratelimit` (already installed).

**Spec:** `docs/superpowers/specs/2026-11-19-media-egress-design.md`

## Global Constraints

- Stored URLs in the DB and anything used for storage deletes/`bucketObjectPath` stay the canonical Supabase URL; `toMediaUrl` is render-only.
- `NEXT_PUBLIC_MEDIA_BASE_URL` unset means behavior identical to today (rollback = unset the variable).
- No file or DB-row migration to Cloudflare; no R2.
- Cloudflare token and account id come from env vars (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) and are never written to the repo or `.env*` files.
- Prod data scripts (recompress `--apply`, version cleanup `--apply`) run only after an explicit «так» from the user; default is dry-run.
- New comments in English, one line, only for non-obvious why. UI/test strings follow `docs/architecture/i18n.md` (no Cyrillic in code).
- Lint touched files with `pnpm exec eslint --fix <files>`; tests with `pnpm test:related <files>`; agents do not run the full suite (one full run at the end by the controller).

## Review Focus

- Range request (`Range: bytes=...`) for audio files through the Worker must return 206 and not break seeking.
- A non-Supabase URL (wikia, `data:`, `blob:`, relative `/battle-maps/...`) passes through `toMediaUrl` untouched.
- A URL with query string (`?t=...`) or encoded path (`%20`, Cyrillic) keeps path/query intact after the host swap.
- A URL already on the media host is idempotent under `toMediaUrl`, and is still recognised as project storage (`isSupabaseStorageUrl`, `isHostedOnProjectStorage`, `isSharedAssetUrl`).
- Server-side code that parses stored URLs to delete objects (`bucketObjectPath`) never receives a rewritten URL.

---

### Task 1: Media Worker (deploy + verify)

**Files:**
- Create: `infra/media-worker/src/index.js`, `infra/media-worker/wrangler.toml`, `infra/media-worker/README.md`
- Test: `infra/media-worker/__tests__/handle.test.ts` (check `vitest.config.mts` `include`; if it does not pick up `infra/`, add the glob)

**Interfaces:**
- Produces: `handle(request: Request, env: { ORIGIN: string }, fetchOrigin?: typeof fetch): Promise<Response>`; default export `{ fetch }`. Deployed URL `https://<name>.<subdomain>.workers.dev`.

- [ ] **Step 1: Failing tests** for `handle` using a fake `fetchOrigin`: (a) `POST` → 405 with `allow`; (b) path outside `/storage/v1/object/public/` → 404 and origin never called; (c) valid GET → origin called with `ORIGIN + pathname + search`, response gets `access-control-allow-origin: *`, `set-cookie` removed; (d) `Range` request header is forwarded and a 206 passes through; (e) origin options contain `cf.cacheEverything === true` and `cacheTtlByStatus` `{ '200-299': 31536000, 404: 60, '500-599': 0 }`.
- [ ] **Step 2: Run, expect fail.** `pnpm test:run infra/media-worker`
- [ ] **Step 3: Implement** `src/index.js`:

```js
const PREFIX = '/storage/v1/object/public/';

export async function handle(request, env, fetchOrigin = fetch) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith(PREFIX)) return new Response('Not Found', { status: 404 });

    const headers = new Headers();
    const range = request.headers.get('range');

    if (range) headers.set('range', range);

    const res = await fetchOrigin(env.ORIGIN + url.pathname + url.search, {
        method: request.method,
        headers,
        cf: {
            cacheEverything: true,
            cacheTtlByStatus: { '200-299': 31536000, 404: 60, '500-599': 0 },
        },
    });

    const out = new Headers(res.headers);

    out.set('access-control-allow-origin', '*');
    out.delete('set-cookie');

    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export default { fetch: (request, env) => handle(request, env) };
```

`wrangler.toml`: `name = "critnest-media"`, `main = "src/index.js"`, `compatibility_date = "2026-11-01"`, `[vars] ORIGIN = "https://mpvcaxsukbwzgrbvzmjj.supabase.co"`. README: deploy command and how to move to `media.critnest.com` later.
- [ ] **Step 4: Tests pass.**
- [ ] **Step 5: Create the workers.dev subdomain** (account has none): `curl -X PUT -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain -d '{"subdomain":"critnest"}'`. If taken, try `critnest-media`.
- [ ] **Step 6: Deploy:** `cd infra/media-worker && pnpm dlx wrangler@4 deploy`, with the two env vars set inline for the command.
- [ ] **Step 7: Verify live:** `curl -sI <worker-url>/storage/v1/object/public/<an existing bucket/path>` twice; expect `cf-cache-status: MISS` then `HIT`, 200, and a `curl -sI -H 'Range: bytes=0-99'` on an audio object returns 206. Pick the real object path from `storage.objects` via the Supabase management API.
- [ ] **Step 8: Commit** `feat(media): cloudflare cache worker for supabase storage`.

### Task 2: `toMediaUrl` + wiring

**Files:**
- Modify: `lib/utils/common/image-url.ts`, `next.config.ts` (`supabaseImagePatterns`), `lib/security/csp.ts` (`connect-src` add `https://*.workers.dev`), `.env.example`, `docs/VERCEL.md`
- Modify (render sites that bypass `normalizeImageUrl`): `components/show/stage/ShowStage.tsx`, `components/maps/MapCatalogDialog.tsx`, `components/maps/editor/TileAssetImage.tsx`, `components/show/puzzle/PuzzleBoard.tsx`, `components/world/editor/maps/MapFileDropzone.tsx`, `components/auth/UserAvatar.tsx`, `components/show/editor/GenerateSlideDialog.tsx`, `components/ai/proposals/AiProposalCard.tsx`, and the battle map / world map background loaders found via `grep -rn "backgroundUrl\|imageUrl" components/battle components/world --include=*.tsx` that put a stored URL into `<img>`, `Image` or canvas
- Test: `lib/utils/common/__tests__/image-url.test.ts`

**Interfaces:**
- Produces: `toMediaUrl(src: string): string`; `normalizeImageUrl` calls it at the end. `parsePublicStorageUrl`/`isSupabaseStorageUrl`/`isHostedOnProjectStorage` accept either the Supabase host or the host of `NEXT_PUBLIC_MEDIA_BASE_URL`.

- [ ] **Step 1: Failing tests** in `image-url.test.ts` (stub `process.env.NEXT_PUBLIC_MEDIA_BASE_URL`): Supabase public URL → media host with same path and query; encoded and Cyrillic path preserved; unset var → unchanged; wikia, `data:`, `blob:`, `/battle-maps/x.webp` → unchanged; media URL → unchanged (idempotent) and `isSupabaseStorageUrl(mediaUrl) === true`, `isHostedOnProjectStorage(mediaUrl) === true`; a Supabase URL of a different project stays untouched.
- [ ] **Step 2: Run, expect fail.**
- [ ] **Step 3: Implement.** `toMediaUrl`: parse with `parsePublicStorageUrl`, rewrite only when `isHostedOnProjectStorage(src)` (project host), replace `protocol`/`host` with the media base, return `url.toString()`. Add a private `isProjectOrMediaHost(host)` used by `isSupabaseStorageUrl` and `isHostedOnProjectStorage`. `supabaseImagePatterns()` also returns a pattern for the media host (same `pathname`). Document the variable in `.env.example` and `docs/VERCEL.md`.
- [ ] **Step 4: Wire the render sites.** For each listed component wrap the URL passed to `src`/canvas with `toMediaUrl(...)` (or rely on `normalizeImageUrl` where already used). Do not touch code paths that delete or compare stored URLs.
- [ ] **Step 5: Tests pass;** `pnpm test:related lib/utils/common/image-url.ts next.config.ts`; eslint on touched files.
- [ ] **Step 6: Commit** `feat(media): render storage URLs through the media host`.

### Task 3: Compression

**Files:**
- Modify: `lib/constants/show.ts` (`SLIDE_MAX_EDGE_PX` 2560 → 1920), `lib/constants/world.ts` (`WORLD_MAP_MAX_EDGE_PX` 6000 → 4096), callers passing `quality` for slides/battle maps/world maps (grep `resizeImageToBlob\|resizeImage` for the call sites) → 0.8
- Create: `scripts/media/recompress.ts`
- Test: `lib/utils/common/__tests__/image-resize.test.ts` (adjust expectations), `scripts/__tests__/media-recompress.test.ts` for the pure planning function

**Interfaces:**
- Produces: `planRecompress(objects, opts): Plan` pure function (skip files already within `maxEdge` and `maxBytes`, report estimated saving); CLI `pnpm exec tsx scripts/media/recompress.ts [--apply]`.

- [ ] **Step 1: Failing tests** for the constants-dependent resize tests and for `planRecompress` (already small → skipped; large → included; saving summed).
- [ ] **Step 2: Implement constants and `planRecompress`.** The script lists objects in `scene-slides`, `battle-maps`, `world-maps` via `lib/supabase/admin.ts`, downloads, resizes with `sharp` (check it is already a dependency; if not, use the one bundled by Next), uploads to a NEW path (`<name>-v2.webp`, never overwrite: year-long cache), updates every DB column referencing the old URL inside one transaction per file, and only then deletes the old object. Dry-run prints per-bucket totals and estimated saving; `--apply` required to write. Guard: refuse to run unless `DATABASE_URL` host is not `localhost` only when `--apply` is combined with `--prod` flag, and print the target project before asking to continue.
- [ ] **Step 3: Run tests; dry-run against prod read-only** and paste the savings report in the PR description.
- [ ] **Step 4: Commit** `feat(media): tighter image limits and recompress script`.
- [ ] **Step 5 (needs user «так»):** `--apply` on prod.

### Task 4: Scenario history limit

**Files:**
- Modify: `lib/constants/scenario.ts` (`SCENARIO_MAX_VERSIONS` 50 → 20)
- Create: `scripts/db/prune-scenario-versions.ts` (dry-run default, `--apply`)
- Test: `lib/server/scenario/__tests__/versions.test.ts` (existing; update the limit expectations)

- [ ] **Step 1: Update tests to the new limit; run, expect fail where hardcoded.**
- [ ] **Step 2: Change constant; script runs `pruneVersions` for every page that has more than 20 rows.**
- [ ] **Step 3: Tests pass; dry-run prod count.**
- [ ] **Step 4: Commit** `feat(scenario): keep 20 versions per page`.
- [ ] **Step 5 (needs user «так»):** `--apply` on prod.

### Task 5: Upstash

**Files:**
- Create: `lib/__tests__/rate-limit-redis-fallback.test.ts` (or extend the existing rate-limit test)
- Modify: `docs/architecture/platform.md` (one line: Upstash provisioned via Vercel Marketplace, env names)

- [ ] **Step 1: Create the resource:** `vercel integration add upstash` (free plan, region `fra1`), connect to project `dnd-tracker` for production and preview, then `vercel env ls | grep KV_REST` to confirm `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
- [ ] **Step 2: Tests:** with mocked Redis the limiter blocks the N+1-th call; with no Redis, `memoryFallback: true` paths still allow and enforce in-memory; `failClosed: true` paths return `unavailable`. Read `lib/server/battles/record-service.ts:458` and `pipeline-deps.ts:43` and document in the test what a battle mutation does when Redis is down. If that is a hard failure for players, stop and ask the user before changing it.
- [ ] **Step 3: Redeploy and live check:** hit a rate-limited endpoint past its limit on the branch preview with real Redis and see 429; check the Upstash dashboard shows commands.
- [ ] **Step 4: Commit** `test(rate-limit): redis and fallback behaviour`.

### Task 6: Verify and close

- [ ] Controller runs once: `pnpm test:run`, `pnpm cycles`, eslint on touched folders.
- [ ] Set `NEXT_PUBLIC_MEDIA_BASE_URL` on the Vercel preview of the branch (not production yet), open the preview: battle map, show stage, world map, avatars load from the worker host (network tab), cache `HIT` on reload. Per the global rule: stage is the deployed branch preview; if it is not reachable say so instead of claiming done.
- [ ] Update `docs/STATUS.md` and `docs/architecture/platform.md`; `/simplify` on the diff; move spec and plan to `docs/archive/superpowers/` in the merge commit.
- [ ] After merge, set the variable in production and check the Supabase egress chart after 24 h.
