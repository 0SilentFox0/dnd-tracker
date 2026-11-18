# Quality epic, wave 4 (Important from the re-audit)

Base: main `c2d0cd79b` (re-audit report on top of `d871500da`). Report: `docs/superpowers/research/2026-11-18-quality-reaudit.md` §2; slices: `research/2026-11-18-reaudit-slices/`.

Owner decisions (2026-11-18): no CI for now; schema migrations and backfills are IN scope (full eviction of module columns/models from core: expand → dual-write/read-fallback → backfill → contract later, drop only after prod confirmation). Sequential in the main checkout by default; lanes without shared files (A, C, F, G) may use worktrees if told. Agents never run tests; one full `pnpm test:run` + tsc + `pnpm cycles` + `lint:dirs` at the end of each lane (under `/tmp/dnd-heavy.lock`). No repo-wide eslint. Nothing is pushed or applied to prod without the owner's explicit yes.

Order: A → C → B (Opus design first, stop for confirmation) → D → E → F → G. Mini re-audit at the end of the wave.

## Tracker

| Lane | Scope | Status |
|---|---|---|
| A1 | allowlist redaction (`redact-participants.ts`) + server `fogView` | done |
| A2 | rate limit fail-closed in prod, cron `timingSafeEqual`, deck `campaignId`, PREPARED map access, join response fields, trusted-proxy IP | done |
| A3 | enforce CSP (nonce, landing stays static) + report endpoint + Permissions-Policy/HSTS + ratchets (route auth, migration RLS) | done |
| A gate | tsc + cycles + lint:dirs + full tests + Opus review | done (17622 tests green; Opus review fixes in 1885470d3, f2daa9ce8) |
| C | MCP: idempotency w/o session id, `propose_scenario_edit` requestId, L11-11, e2e IDOR/retry, AiToolError codes, ai.md | done (full tests green after ratchet entry move) |
| B | modularity + migrations (Opus design first) | slice 1 done (local main 8b5755f22; baselines dccc3f287), Opus review 0 Critical/0 Important; slices 2-3 (P5, P9, P10, P12-P14, P16) not started |
| D | tests (route-contract, app/api coverage, d20 rules, systems UI, downtime-handler) | todo |
| E | file/function size hygiene, snapshot Zod | todo |
| F | maps perf + BattleMap/MapStage split + chunk constants | done (feat/wave4-lane-f, merged local main; not pushed) |
| G | clones, keys.ts, raw-controls rule, overlays/tabs | todo |
| Mini re-audit | changed criteria only, update before/after report | todo |

## Lane A design notes

- A1: public view of an enemy participant = explicit allowlist of keys (top level and `battleData`); unknown key must not pass (test). `fogView`: server drops participants/positions the player's side cannot see (reuse the client's visibility logic from `useBattleMapFog.ts` as pure util in `lib/utils/battle/`; client keeps using the same util). Deltas and Pusher public payloads use the same redaction.
- A2: `memoryFallback` default; in production without Redis, sensitive scopes (battle mutations, audio) fail closed (503) rather than allow. Dev/test unchanged.
- A3: root layout must not read cookies/headers (landing static). Nonce CSP only where the route is already dynamic (proxy matcher excludes the static landing, which keeps a hash/report-only policy or strict static policy); decision documented in `docs/architecture/platform.md`.

## Journal

- 2026-11-18: session 1 ended after A, C and B-design. Next session: B slice 1 (owner sign-off pending, see design doc §5 and the 5 decision points), then D, E, F, G, mini re-audit. Main b23196270+, nothing pushed.

- 2026-11-18: lane B design committed (16 packages P1–P16). Recommended slice 1 (code moves + scanner fix + existing pendingMoraleCheck backfill run) = ~9 Sonnet + 1 Opus review, fresh session. Needs owner sign-off: one-time growth of surface baseline; defer BattleParticipant.morale (P15); 2 permanent drift lines for Campaign.skillTrees/artifactSets; log-key bundle size.

- 2026-11-18: lane C done (f4c40f467, e9142ab47). Derived MCP idempotency key = hash(tokenId+tool+args) in 10-min bucket (+previous bucket lookup), no migration. DEPLOY NOTE: prod API tokens with only the `ai` scope now get 403 on the 12 moved read tools (need catalog read scopes: re-issue or one-off scope expansion). Strict tool input schemas reject extra keys.

- 2026-11-18: lane A done, local main 1885470d3, NOT pushed. Known limits: server fog ignores tile walls; log aimCell leaks; nonce CSP stays report-only (`NONCE_CSP_ENFORCED=false`, palette script needs a hash first). Deploy prerequisite: UPSTASH_REDIS_* or RATE_LIMIT_ALLOW_MEMORY=1 (else battle/audio 503 in prod).

- 2026-11-18: plan created.

- 2026-11-18 (session 2): lane B slice 1 done, NOT pushed. P1 scanner (surface 77->1477 hits honest reset, then 246 files after moves; message keys 34->192; literals 5->45 files/67 hits, target <=2 NOT met: the rest is vocabulary for P5), P2 (DEFAULT_RULES -> test fixture, 'd20' kind -> 'check'), P3 (slots secondaryAttack/sceneActions/rerollToken/itemGroups, d20 ext codecs owned by addons), P4 (sections of morale/heroScaling/deathSaves/inspiration owned by modules; namespaces rulesMorale etc.), P6.0 (content registry seam), P6a partial, P6b+P6c, P7, P8. Full tests green (2503 files), tsc, cycles 0. P11: prodcopy_w4b shows 0 rows with pendingMoraleCheck, nothing to backfill; prod has 1 active battle so `--expect-idle` fails until it ends.
- Open tails for slice 2: (a) core HTTP routes for skill-trees/artifact-sets stay (system/[action] has no path params and no API-token scopes) - needs a content-operation target kind; (b) skill hooks used by core UI (useSkillTrees/useRacialSkills/useMainSkills) need a SystemUi slot; (c) battle participant assembly (load-character-context, start-build-context) still queries skillTree/mainSkill - needs a ParticipantPart; (d) literal vocabulary hits (stat 'morale', retaliation labels, 'artifactSet' source type, 'offHand' slot) = P5; (e) Opus minors: DEFAULT_RULES fixture now has opportunityAttacks/retaliation on (sim/sweep baselines may shift), inline query keys in lib/hooks/content-import/keys.ts, 308 redirects cached, inspiration op without module now 404 instead of 409, 3 rules tests fail eslint import-sort.
- 2026-11-18: lane F done on feat/wave4-lane-f. `patchTileChunks` reads/writes only affected chunks (pure `tile-chunk-patch.ts`; snapshot = previous version's tileLayers + affected chunks); single `CHUNK_SIDE`/`chunkKey` (`lib/utils/battle/map-storage/chunk-key.ts`); memoized `rasterSignature`, `clearTileRasterCache` on map change/unmount, TileCanvas resize guard + full bitmap clear; `BattleMap` 436→290, `MapStage` 408→225 (hooks `useBattleMapFrame/Camera`, `useMapStageTokens`, `MapTokensLayer`, `MapTransformLayers`, type files); colour constants `GRID_COLORS/STROKE_COLORS/TEMPLATE_COLORS`. Gates: tsc (needs NODE_OPTIONS=--max-old-space-size=8192), cycles 0 SCC, lint:dirs --changed clean, full test:run 16 red in 10 files outside maps (lane B in-flight: inspiration/artifactsets/rules/scope-size; 7 verified red on base dccc3f287 too), map tests 208 green. Opus review: 0 confirmed issues; the 3 nitpicks fixed afterwards (signatureMemo capped at 512 per chunks/assets, raster cache cleared only when the last TileCanvas unmounts or the map changes, leftover empty chunk rows deleted on no-op layer clear).
