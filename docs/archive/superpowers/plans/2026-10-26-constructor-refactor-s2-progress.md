# S2 — assistant executor: checkpoint

Дата: 2026-10-27. Worktree: `/Users/silentfox/.codex/worktrees/3918/dnd-tracker-constructor`; branch `refactor/constructor-s2-assistant-executor`.

## Вихідна точка та результат

- Start HEAD: `0fd56e76c6807d1c314e31211a75918e4182775c` (`feat/constructor` після S1).
- End code/test HEAD перед цим checkpoint: `7183b7efeccabe105f6bd7e5f3ce080fd3ffee8c`.
- Підтверджено ancestry S1 commits: `ef90aaba` (SEC-01/02), `7efcb07e` (SEC-03), `5c2d7e7d` (tracked runner reports), а також S1 start commit `0fd56e76`. Runner files tracked на старті.
- S2.1–S2.4 виконано. Змінено assistant limits/schema, execution facade і internal boundaries, intent/receipt/run/cleanup owners та sibling tests. Механіки, content adapters, snapshots/hashing, UI/hooks, Prisma, package/lockfile, runner і файли паралельних S6/S9 не змінювалися.
- Snapshot/request hashing не редагували; жодного public API/MCP id, payload чи result envelope не змінено.

## Межі та власники стану

```text
dispatchAction → authorize → prepare → pending intent
confirm/reject → execute.ts facade → execution-transaction.ts
  read previous → campaign FOR UPDATE → intent FOR UPDATE → re-read intent/receipt
  → membership FOR SHARE → live authorize → origin token FOR SHARE + recheck
  → fresh prepare/precondition → domain write + receipt atomically on same tx
  → intent applied (або cascade deletion tombstone receipt)
after transaction → execution-effects.ts
  callbacks in order → durable effects with stable keys → receipt effectsStatus
external path:
  transaction claims receipt(started/unknown) + intent(executing)
  → one external call with abort + AI_LIMITS.requestDeadlineMs
  → persist result (including null) → resume callback into same executor
  → atomic finalize; unknown outcome is never re-invoked
```

`execution-state.ts` owns parsing of legacy/current external receipt JSON through `receiptEffectsSchema.safeParse`; malformed envelopes cannot authorize external finalization. `execution-transaction.ts` owns the atomic write path and typed receipt/external/conflict outcomes. `execution-effects.ts` owns continuation, after-commit settlement and reconciliation. `executor-deps.ts` owns injected database/catalog/clock/effect dependencies and execution-mode read. `execute.ts` remains the public facade with the same factory and dispatch/confirm/reject/reconcile methods. `intent-store.ts` owns intent create/expiry; `receipts.ts` receipt DTO and author-only deletion tombstone; `runs.ts` keeps its distinct run terminal mapping and re-exports `RUN_GRACE_MS`.

`ASSISTANT_LIMITS`: TTL 900000 ms, payload 3000000 bytes, tx 30000/5000 ms, run grace 30000 ms, redaction 7 days, receipt retention 90 days. External deadline reuses `AI_LIMITS.requestDeadlineMs` (270000 ms). Intent statuses, effect statuses, redaction allowlist and receipt deletion allowlist remain distinct. `Prisma.JsonNull` and legacy JSON shape are retained.

## Перевірки та результати

- Fresh pre-extraction baseline: `pnpm exec vitest run lib/server/assistant/__tests__ lib/ai/tools/__tests__/assistant.test.ts lib/ai/chat/__tests__/run-chat.test.ts app/api/__tests__/api-tokens-mcp.test.ts app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-run-api.test.ts scripts/constructor/assistant-check/__tests__/` — exit 0, 31 files, 264 passed, 0 failed, 0 skipped.
- Targeted S2.1 RED→GREEN: malformed external state failed against the extracted unsafe reader (4/9 expected failures); validated Zod boundary passed execution-state/cleanup/intent-store/execute/show tests (49 passed, 0 skipped). Malformed resume regression separately failed against the exact unsafe reader (would apply a write), then passed with validation (23 focused tests, 0 skipped).
- Targeted S2.2: execute/authorize/battle-pipeline/show suites — 48 passed, 0 skipped. Real SQL `execution.integration.test.ts` before the last S2.4 fixtures — 6 passed, 0 skipped.
- Targeted S2.3: execute/effects/runtime-effects/show suites — 33 passed, 0 skipped. Expanded real SQL execution suite — 10 passed, 0 skipped; tests persisted `result:null`, crash/recreate finalize, one paid call, unknown-no-retry, and prepare 404/409 stale rollback behavior.
- Final unit/API: `pnpm exec vitest run lib/server/assistant/__tests__ app/api/__tests__/assistant-intents-api.test.ts app/api/__tests__/assistant-run-api.test.ts` — exit 0, 27 files, 219 passed, 0 failed, 0 skipped.
- Final guarded real SQL: `node --env-file=/Users/silentfox/Work/dnd-tracker-constructor/.env.local node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts lib/server/assistant/__tests__/execution.integration.test.ts lib/server/assistant/__tests__/runs-storage.integration.test.ts --reporter=default --reporter=json --outputFile=.superpowers/sdd/2026-10-26-constructor-refactor-s2/compatibility-integration.json` — exit 0, 17 passed, 0 failed/skipped. Both URLs passed the constructor loopback guard; both used connection_limit=1. Concurrent confirm now holds two independent one-connection clients open together and asserts distinct `pg_backend_pid()` values before they contend on campaign/intent locks. Domain increment is exactly once and both callers receive the same receipt. Coverage also includes revoke, fresh prepare 404/409, stale preview, legacy pending intent/receipt JSON after redaction, crash/retry, callback failure after committed write, and author-only deletion tombstone. Tests clean only their own marked fixtures and assert cleanup.
- Final tracked runner: `ASSISTANT_CHECK_RUN_ID=s2-final-20261029 pnpm exec tsx --env-file=/Users/silentfox/Work/dnd-tracker-constructor/.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --run --output-dir .superpowers/sdd/2026-10-26-constructor-refactor-s2/final` — exit 0; SQL 12/12, browser 18/18 across 1440/390 viewports, skip 0; migrations 41→41; owned fixture leftovers `[0,0,0,0,0]`. One earlier repeat could not connect because Docker Desktop was stopped; after starting Docker Desktop and the existing local `dnd-tracker-db-1`, the guarded rerun passed. No migration was run.
- Runner evidence is in ignored `.superpowers/sdd/2026-10-26-constructor-refactor-s2/final/s2-final-20261029-xR0n9g/`. Read-only guard: `{"database":"constructor","local":true,"bothUrls":true}`. PostgreSQL 17.11, Node 22.0.0, pnpm 9.15.5. Exact applied migration list (41, unchanged): `20261005000000_init`, `20261006000000_battle_store`, `20261008000000_ability_columns`, `20261009000000_character_seen_level`, `20261010000000_mobile_profile`, `20261011000000_units_race_id`, `20261012000000_contract`, `20261013000000_spell_model_v2`, `20261014000000_spell_stacking`, `20261015000000_unit_level_scaling`, `20261016000000_character_tokens`, `20261017000000_character_archetype`, `20261018000000_skill_granted_spell`, `20261019000000_battle_map`, `20261020000000_campaign_tracks_battle_audio`, `20261021000000_scenario_pages`, `20261021000000_scene_show`, `20261022000000_character_notes`, `20261022100000_scenario_play`, `20261022110000_ai_assistant`, `20261022120000_ai_instructions`, `20261023000000_show_curtain`, `20261024000000_constructor_content_fields`, `20261024000000_stash_and_player_drafts`, `20261024100000_campaign_rules`, `20261025000000_campaign_templates`, `20261025000000_user_onboarding_flags`, `20261026000000_campaign_source_sync`, `20261027000000_classes`, `20261028000000_spell_5e_dice`, `20261029000000_out_of_combat`, `20261030000000_unit_5e`, `20261031000000_campaign_credits`, `20261101000000_class_columns`, `20261102000000_inventory_attuned`, `20261103000000_choices_feats`, `20261104000000_monster_5e_full`, `20261105000000_spell_casting_time`, `20261106000000_backgrounds`, `20261107000000_compendium_import`, `20261108000000_assistant_intents`.
- TypeScript: `pnpm exec tsc --noEmit` — exit 0 after final code/test changes.
- Lint: `pnpm exec eslint --max-warnings=0` over every changed TS file — exit 0, 0 errors/warnings.
- `git diff --check` — exit 0.
- Independent read-only review of S2 diff: no confirmed Critical/Important/Minor findings. Reviewer did not run tests; runtime evidence above is the executor's fresh run. No full suite/build run is claimed; execution guide schedules full suite/build for S10.

## Commits та залишки

1. `f5a9c4e2` — `refactor(assistant): centralize execution limits and envelope parsing`
2. `be2b0024` — `refactor(assistant): isolate atomic intent execution`
3. `05fcf3a0` — `refactor(assistant): separate external execution and settlement`
4. `7183b7ef` — `test(assistant): verify executor compatibility on single-connection clients`
5. This checkpoint commit records evidence for the above code/test HEAD.

Залишків S2 немає. Відомі межі evidence: browser scenarios use synthetic deterministic HTTP and no live provider/Storage/Pusher/Redis; after-commit retry paths use registered test handlers. Full branch suite/build і заключний joined-branch review — S10.

Наступна задача: S3.1, guarded preview benchmark із контрольованими small/large fixtures, 5 warmups + 30 samples, без зміни production paths до вимірювання. S2 не переходить у S3 у цьому checkpoint.
