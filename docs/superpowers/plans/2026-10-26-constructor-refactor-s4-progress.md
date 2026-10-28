# S4 — assistant adapters, handoffs і run recovery

Дата: 2026-10-27. Виконано задачі **4.1–4.4** плану `2026-10-26-constructor-refactor-s4-assistant-adapters.md`. Це server S4 з roadmap; попередній checkpoint `2026-10-27-constructor-refactor-s4-keys-forms-progress.md` стосується іншого, вже інтегрованого обсягу 8.1/8.3.

## Вихідний стан

- Base/start HEAD актуального `feat/constructor`: `8c9bd69a7402067ff7578f451a3c3a86cebbaa07`; S2/S3 та 8.1/8.3 інтегровані.
- Branch: `refactor/constructor-s4-assistant-adapters`.
- Власний native managed worktree: `/Users/silentfox/.codex/worktrees/a2cc/dnd-tracker-constructor`; створений через `superpowers:using-git-worktrees`, повторно використаний після завершення попередньої задачі. Попередня verification branch збережена.
- Вихідний checkout `/Users/silentfox/Work/dnd-tracker-constructor` і робочі копії інших сесій не змінювалися. Untracked plan/execution guide читалися у вихідній папці. CLAUDE.md, roadmap, checkpoint-и S1/S2/S3/S8 та subsystem docs звірено.
- Node v22.0.0, pnpm 9.15.5; dependencies через symlink на наявні node_modules. Env/package/lockfile/Prisma migrations не змінювалися.
- Ledger і raw logs/samples: `.superpowers/refactor/s4-adapters/` у власному worktree (ignored).

## Виконані задачі та public interfaces

- [x] **4.1**, commit `58aed404`: `actions/handoff-navigation.ts` володіє schemas, reasons і `buildAssistantHandoff(actor, kind, target?)`. `HANDOFF_INPUTS` та builder залишаються compatibility exports із `handoffs.ts`; scope/sessionOnly/effect metadata лишилися в composition layer.
- [x] **4.2**, commit `25ac0a8f`: `actions/compendium-reads.ts` володіє `COMPENDIUM_READ_INPUTS`, `CompendiumRead`, `readCompendiumSummary`, bounded projections і локальним `safeText`. Prompt імпортує reader напряму. Facade реекспортує старі interfaces; explicit DM membership та repository.authorize збережено, sanitizer-и `safeText` і `publicToolData` не об'єднано.
- [x] **4.3**, commit `698b1f35`: recovery list має explicit selects для run DTO, receipt DTO та `intentSummary`; порожній run list повертає `{runs:[],receipts:[],intents:[]}` без залежних reads. Ліміти 30/100/100, порядок createdAt desc, owner/thread/request filters і publicToolData незмінні. Begin/finish/cancel, deadline 270000 + grace 30000 ms, unresolved unknown claim та persisted terminal mapping не редагувалися.
- [x] **4.4**: audit matrix нижче, runtime metadata comparison всього каталогу, unit/transport і guarded SQL canonical writer перевірки. Scoped simplify: прибрано зайвий порожній рядок EOF у двох extracted modules; додаткового mapper/validation cleanup не потрібно.

Ruling: плани untracked читаються у вихідній копії; вони не копіюються до гілки. Метадані reasons/session need експортуються як `HANDOFF_REASONS` / `COMPENDIUM_NEED`, щоб composition і implementations використовували одного власника без дублювання. Ризик помилки — ширша внутрішня export surface; чинні public exports сумісні.

Ruling: новий прямий import reader у prompt вимагає перенаправити test mocks у `assistant-context.test.ts` і додатковому `prompt.test.ts`. Це мінімальна test-only зміна consumer boundary; ризик помилки — mock перестане перевіряти explicit selection, тому обидві suites запущено.

## Перевірки за задачами

- Baseline до змін: 13 plan suites, **112 passed, 0 failed/skipped**, exit 0; `baseline.log`.
- 4.1 characterization до/після extraction: **37 passed**, 2 suites, exit 0; `4-1-before.log`, `4-1-after.log`. Таблиця фіксує всі kind→href/reason pairs, tracks→music, slide із/без deck; unknown kind/non-DM/unsafe campaign/deck ids та encoded injection відхиляються. Opening handoff не створює intent/receipt; renderer не приймає external/API/confirm href. Syntactically valid foreign deck лише дає посилання у поточній кампанії; destination ownership guards не змінювалися й посилання не надає доступу.
- 4.2 characterization: **44 handoff tests** до extraction; після extraction **71 passed**, 4 suites (`handoffs`, `assistant-context`, `assistant-context-api`, `prompt`), exit 0; `4-2-characterization.log`, `4-2-after.log`. Перевірено selectedKeys 1..5, empty/duplicates/>5, pagination defaults/max20, foreign target campaign filter, structured notes placeholder, signed URL/Bearer/provider-key masking, bounds 200/20/3000 chars і відсутність unselected notes/raw JSON у projections.
- 4.3 RED: `emptyRunHistoryHasNoIntentsOrReceipts` із permissive DB boundary double повертав unrelated owner receipt: **1 failed, 6 passed**; `4-3-red.log`. GREEN: unit/API **10 passed**, exit 0; `4-3-green.log`. Це fail-closed boundary characterization: **реальна Prisma OR:[] уже повертала порожній результат до зміни**, тому початковий storage path не оголошується підтвердженим privacy defect.
- SQL baseline `handoff-storage` + `runs-storage`: **10 passed**, exit 0. Розширений runs suite до select optimization: **7 passed**; після: handoff+runs **12 passed**, 0 failed/skipped, exit 0. Порожній власний thread та відсутній requestId не бачать історії іншого thread того самого owner; перевірено retained request поза останніми 30 runs, Stop після commit, no resend, one user message, partial/null usage та unresolved unknown.
- 4.4 plan suites + assistant tools: **82 passed**, 8 suites, exit 0; `4-4-tests.log`.
- Runtime порівняння метаданих каталогу base `8c9bd69a` і поточного code: **217 actions**, усі ids/need/sessionOnly/confirmation/effect/input JSON schemas рівні; **1 passed**, exit 0; `catalog-compare.log`, `catalog-metadata.json`. Probe використовував baseline handoffs source із Git, решта adapters unchanged. Початковий custom probe без DB mock впав на Prisma constructor через відсутній URL до будь-якого запиту; додано DB boundary mock. Temporary probe sources/config видалено, artifacts лишилися ignored.
- Додаткові guarded canonical writer suites: **26 passed**, 5 suites, 0 failed/skipped, exit 0; `4-4-writers-integration.log` (деталі matrix нижче).
- TypeScript для 4.1/4.2/4.3 — exit 0; zero-warning ESLint змінених TS — exit 0. Перший aggregate range diff check виявив зайві EOF blank lines у newly tracked modules; прибрано, `git diff --check 8c9bd69a` → exit 0.

SQL команди запускаються **тільки з названими files** через:

```sh
pnpm exec tsx --env-file=/Users/silentfox/Work/dnd-tracker-constructor/.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --check-target
node --env-file=/Users/silentfox/Work/dnd-tracker-constructor/.env.local node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts lib/server/assistant/__tests__/runs-storage.integration.test.ts lib/server/assistant/__tests__/handoff-storage.integration.test.ts
node --env-file=/Users/silentfox/Work/dnd-tracker-constructor/.env.local node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts lib/server/assistant/__tests__/character-storage.integration.test.ts lib/server/assistant/__tests__/character-progression-storage.integration.test.ts lib/server/assistant/__tests__/battle-pipeline-storage.integration.test.ts lib/server/assistant/__tests__/scenario-storage.integration.test.ts lib/server/assistant/__tests__/show-storage.integration.test.ts
```

Guard → `{"database":"constructor","local":true,"bothUrls":true}`, exit 0. Кожна suite також перевіряє **обидва URLs** до fixture writes, Prisma client має connection_limit=1; cleanup обмежений власними random-marker fixtures. Запускалися named handoff/runs, character-storage, character-progression-storage, battle-pipeline-storage, scenario-storage, show-storage files. Provider/Storage/Pusher/rate-limit dependencies у відповідних suites mocked/guarded; мережевих paid calls немає.

## Action → writer → scope → transport → evidence

Спільний transport для canonical actions — `assistant_read` / `assistant_action` → один dispatcher; chat і MCP передають trusted caller, а pending/handoff не означають завершений write. Усі нижченаведені adapters прочитані разом із реальними execute functions; coverage rows не використовувалися як єдиний доказ implementation.

| Family / ids | Prepare → canonical execute owner | Need / confirmation | Перевірений доказ |
| --- | --- | --- | --- |
| `characters.*` core (12 actions) | `characterState`/read-only preview → `runCharacterOperation` → чинні create/patch/review/notes/goals/token/delete handlers у scoped operation context | DM, `characters:read/write`; patch/delete/delete-all/goals/tokens.delete завжди human | `character-actions` 15 unit: foreign actor/refs, defaults, private notes, preview policy; `character-storage` 3 SQL: HTTP/tool defaults, atomic token audit, native change→stale |
| `characters.*` progression (22 actions) | `progressionState`/fingerprint, без roll/write → `runCharacterProgression` → choices/resources/rest/XP/level-up/progression/inventory/stash/transfer handlers | DM, `characters:read/write`; choices/resources/inventory.patch/stash.apply/unlearn/reset завжди human | `character-progression-actions` 13 unit: preview без update, active battle/foreign refs, stale content; `character-progression-storage` 10 SQL: repeat transfer/XP/rest/roll/level-up один раз, private notes не витікають |
| `battles.*` (39 actions) | `prepareBattleAction` без RNG/spend → `runBattleAction` → `executeBattleOperation` → чинні pipeline definitions/save; map-background лишається handoff | DM, `battles:read/write`; delete/clear-history/reset/rollback metadata always; додаткові destructive effects human через policy | `battle-actions` 15 unit: preview без rolls/save, stale/reach/manual errors; `battle-pipeline-storage` 2 SQL: battle write+receipt rollback, publication after commit, retry один раз, native HTTP stale guard |
| `scenario.*` (17 actions) | `scenarioState`/fingerprint/resolve preview → `runScenarioOperation` → shared page-store/snapshot/CAS writer; `scenario.propose-edit` → createProposal + **один** T6 applyProposal; `scenario.legacy-proposal` → той самий applyProposal | DM, `scenario:read/write`; propose-edit/save/delete/restore/section.delete/row.delete always; legacy sessionOnly | `scenario-actions` 5 unit: rich blocks/bindings/hash/policy; `scenario-storage` 6 SQL: snapshot-before-write, metadata stale, legacy apply/confirm race один write, alias canonical intent/receipt |
| `show.*` (10 actions) | `prepareShowAction` read-only → `runShowOperation` → shared show/deck stores; external generate/persistSlideImages поза DB transaction і лише зі збереженим результатом | DM, `show:read/write`; generate/discard/decks.delete always; generate paid+trusted run | `show-actions` 15 unit: stale/seq/ownership/paid unknown; `show-storage` 5 SQL: atomic save+receipt, repeat seq/publication один раз, persisted external result без regenerate, unknown не повторює charge |
| `handoff.*` (14), `compendium.options/reports/entries` (3) | Navigation builder без reads/writes; compendium member+repository authorize → bounded selects без importer | DM sessionOnly; navigation scopes campaign:read/content:write/show:write збережено; compendium content:write, token→handoff | `handoffs` 44 unit; `AssistantHandoff` 3 UI; `handoff-storage` 5 SQL: bounded fields/no raw/unselected notes, explicit selection, revoked membership/token fail closed |

`action-definitions.ts` і п'ять domain adapter families/writers не змінювалися; нового domain writer/registry не створено. Legacy content aliases лишаються `dispatchContentAlias` → canonical dispatcher, `propose_scenario_edit` → scenario.propose-edit. Чинні v2 result/pending/handoff envelopes та paid-without-run fail-closed перевірені `assistant tools` і `transport-catalog` suites. Матриця доводить названі scenarios, а не exhaustive runtime coverage кожного operation/input.

## Recovery measurements

Fixture: 32 runs / 102 pending intents / 102 applied receipts, по 4096 synthetic padding chars у невикористаних JSON fields; fixed read clock Date(0), deterministic ordinal fixture content і createdAt, random owned IDs для cleanup. Перед/після fixture IDs різні, однакової довжини; це synthetic payload comparison, не ідентичний production snapshot. 5 warmups + 30 measured iterations на фазу. Node v22.0.0, PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2); metadata записано окремо у `recovery-environment.json` після обох прогонів на тому самому local server.

| Метрика | Before | After |
| --- | ---: | ---: |
| Queries на recovery (ORM operations, із live membership/thread reads) | 5 | 5 |
| `resultJsonBytes` трьох history select results | 1 906 441 | 177 953 |
| elapsed median, ms | 32.723 | 16.767 |
| elapsed p95, ms | 36.671 | 19.574 |

Raw samples: `recovery-before.json` / `recovery-after.json`; logs `recovery-before.log` / `integration-after.log`. Before — selects базового runs.ts на code `25ac0a8f`; after — code, закомічений як `698b1f35`. Виміряно serialization size повернених ORM results, **не PostgreSQL wire bytes**. Whole-run resultRefs лишається потрібним для terminal mapping; payload/preview/expected/effects не завантажуються без потреби. Timing має локальний host noise і не є production latency обіцянкою. `serializeMs`, `transactionMs`, lock wait/duration — unavailable; нових locks/indexes/cache немає.

## Фінальний gate та передача

Фінальна розширена unit/API/transport команда:

```sh
pnpm exec vitest run lib/server/assistant/__tests__ lib/ai/tools/__tests__/assistant.test.ts lib/ai/chat/__tests__/assistant-run.test.ts lib/ai/chat/__tests__/run-chat.test.ts lib/ai/context/__tests__ app/api/__tests__/assistant-context-api.test.ts app/api/__tests__/assistant-run-api.test.ts app/api/__tests__/assistant-intents-api.test.ts components/ai/__tests__/AssistantHandoff.test.tsx
pnpm exec tsc --noEmit --incremental false
pnpm exec eslint --max-warnings=0 lib/server/assistant/actions/handoff-navigation.ts lib/server/assistant/actions/handoffs.ts lib/server/assistant/actions/compendium-reads.ts lib/server/assistant/__tests__/handoffs.test.ts lib/ai/context/prompt.ts lib/ai/context/__tests__/assistant-context.test.ts lib/ai/context/__tests__/prompt.test.ts lib/server/assistant/runs.ts lib/ai/chat/__tests__/assistant-run.test.ts lib/server/assistant/__tests__/runs-storage.integration.test.ts
git diff --check 8c9bd69a
```

- Unit/API: **36 suites, 339 passed, 0 failed/skipped**, exit 0; `final-unit.log`.
- ESLint: exit 0, errors/warnings 0; `final-lint.log`.
- Фінальний TypeScript: exit 0, без діагностик; `final-tsc.log`.
- Незалежний read-only review: нових confirmed Critical/Important/Minor у S4 diff не виявлено; reviewer окремо прогнав 94 unit tests (усі passed), diff check та normalized extraction comparison. Остаточні деталі reviewer наведено нижче.
- У Node22 suites є чинний dependency `punycode` deprecation warning; warnings не приховувалися.
- Підтверджених нових security findings немає. Explicit empty recovery return — defense in depth, не доказ початкового SQL витоку.
- Browser synthetic harness/full suite/build у S4 не запускалися: UI/rendering не змінювалися, full branch gates лишаються S10. Prod/prodcopy/HOMM gateway/provider/Storage/Pusher/Redis/merge/push/deploy не запускалися.
- Для S8: keyless review/receipt shape, Stop без rollback, retained request recovery без resend сумісні. UI 8.1/8.3 вже на base; 8.2/8.4 залишаються окремими задачами. Загальні STATUS/architecture/roadmap не змінювалися, handoff — тут; загальне узгодження docs заплановано S10.
- Гілка/worktree зберігаються для інтегратора. Code HEAD `698b1f35`, end HEAD цього checkpoint визначається `git log -1 --format=%H -- docs/superpowers/plans/2026-10-26-constructor-refactor-s4-progress.md`.


## Review rulings та відкриті питання

Final: Ruling: reviewer виявив pre-existing producer→renderer mismatch для `battles.map-background`: `actions/battles.ts:24` повертає `/campaigns/:id/battles...`, тоді як `isAssistantHandoffHref` не допускає `/battles`, і `AssistantHandoff.tsx:32` показує «Недоступний перехід». Усі три файли незмінні проти base. Залишити цей поведінковий UI fix окремій задачі S8/S10, а не розширювати allowlist під час сумісного extraction S4. Ціна рішення — цей існуючий перехід далі недоступний; follow-up має додати RED→GREEN producer→renderer test і перевірити safe href contract. Це відкритий функціональний finding, не нова регресія чи security issue цього diff.

Фінальна scope межа: SQL authority доведено named integration scenarios, а не mocked transport tests; provider/browser/live external behavior не перевірялися. Попередній UI checkpoint не замінює S8.4 browser/receipt/disclosure gate. Shared docs узгоджуються в S10; вони не включені в цей commit. Source-note текст доступний тільки explicit session selection, невибрані notes не проходять catalog reads.


Прийняті межі незалежного reviewer (всі declined-to-judge items):

- Final: Ruling: повний набір inputs усіх domain operations не оголошувати перевіреним; routing і named scenarios підтверджені, exhaustive domain audit лишити S10. Ціна — позасценарні pre-existing domain defects можуть лишатися.
- Final: Ruling: reviewer не повторює SQL через read-only scope; authority evidence — власні 38 guarded SQL tests executor. Ціна — SQL gate має одного незалежного виконавця, хоча source/tests перевірені reviewer.
- Final: Ruling: synthetic recovery measurements не екстраполювати на production/wire bytes/locks. Ціна — production виграш невідомий; bytes/query counts і raw samples залишені для перевірки.
- Final: Ruling: live provider/Storage/Pusher/Redis/paid cancellation не запускати; незмінність коду й mock regressions достатні для цього extraction. Ціна — live external behavior не доведений цими тестами.
- Final: Ruling: browser navigation/layout, build/full suite лишити ширшим S10 gates; це server-only scope без rendering змін. Ціна — вони не доведені поточною сесією.
- Final: Ruling: повний security audit sanitizers та всіх destination routes не заявляти; перевірено їхню незмінність і названі privacy/access cases. Ціна — аудит не є exhaustive assurance.
- Final: Ruling: загальні STATUS/architecture/roadmap узгодити в S10, у цьому scope handoff записано лише тут. Ціна — shared docs ще не описують нових module owners.
- Final: Ruling: після незалежного review дозволити лише фінальну документацію/evidence commit; runtime source після reviewed code має тільки перевірене видалення EOF blank line. Ціна — фінальний commit документації не має другого незалежного review; staged diff check є локальним gate.

Незалежний reviewer: **Ready to merge: Yes для S4**, confirmed findings у S4 diff 0/0/0, simplify без додаткових змін. Його 94 тести у 7 suites пройшли, source/diff не редагував. End-of-branch workflow `superpowers:finishing-a-development-branch`: гілку/worktree залишено згідно із забороною самостійного merge/push у execution guide; підтвердження інтеграції тут не запитується. Відкладених minor findings у scoped diff немає; pre-existing map-background окремо відкритий вище.


## Follow-up: виправлення map-background перед merge

Наступне пряме доручення користувача дозволяє виправити старий дефект, локально merge у `feat/constructor` та видалити **цей** worktree. Воно замінює попередні заборони merge і ruling про відкладення map-background. Інші робочі копії/гілки та чужі dirty files залишаються недоторканими.

- Root cause: producer формував `/campaigns/:id/battles[/:battleId]`; bare `/battles` не має сторінки, а detail path показує battle scene. Чинний редактор карти — `app/campaigns/[id]/dm/battles/[battleId]/page.tsx` (`requireCampaignDM` + `BattleSetupForm`), список — `dm/battles/page.tsx`.
- Fix: producer веде у `/campaigns/:id/dm/battles[/:battleId]`; shared href validator дозволяє лише цей campaign-scoped list/editor path з bounded alphanumeric id. External/query/hash/traversal/encoded/extra action paths залишаються забороненими; mutation/authorization logic не змінено.
- Regression RED: два producer→href/validator cases і два renderer cases впали: **4 failed, 18 passed**; `map-handoff-red.log`. GREEN після fix: battle-actions + AssistantHandoff + handoffs — **66 passed, 0 failed/skipped**, exit 0; `map-handoff-green.log`.
- `pnpm exec tsc --noEmit --incremental false` → exit 0; `map-handoff-tsc.log`. ESLint чотирьох змінених TS/TSX → exit 0; `map-handoff-lint.log`. `git diff --check` → exit 0.
- Незалежний read-only review fix: **Ready to merge: Yes**, confirmed findings 0/0/0; reviewer повторив 22 тести (2 suites), усі passed. Browser/upload/save, full authorization audit, live external services не перевірялися; повні TypeScript/lint/SQL gates виконав executor.


## Локальна інтеграція та cleanup

- Target перед merge: `feat/constructor`, `dfd5bcaf` (містить подальшу S9 інтеграцію). Source: `refactor/constructor-s4-assistant-adapters`, `a37fe381`.
- `git merge --no-ff refactor/constructor-s4-assistant-adapters -m 'Merge S4 assistant adapters and map background handoff fix'` → exit 0, без конфліктів. Merge commit: **`1263a490`**.
- На merge HEAD повторено broad targeted unit/API команду з фінального gate вище: **343 passed, 36 suites, 0 failed/skipped**, exit 0; `merged-unit.log`.
- Named guarded handoff/runs SQL suites: **12 passed, 0 failed/skipped**, exit 0; `merged-integration.log`. Мережевих providers/storage/pusher викликів немає.
- Post-merge `pnpm exec tsc --noEmit --incremental false` → **exit 0**, `merged-tsc.log`; `pnpm exec eslint --max-warnings=0` усіх 14 змінених TS/TSX → **exit 0**, `merged-lint.log`. `git diff --check HEAD^1..HEAD` → exit 0.
- Після всіх gates `git worktree remove /Users/silentfox/.codex/worktrees/a2cc/dnd-tracker-constructor` → exit 0; `git branch -d refactor/constructor-s4-assistant-adapters` → exit 0. Worktree і merged source branch видалено; інші worktrees збережено.
- Перед merge збережено hashes усіх 9 pre-existing dirty/untracked files вихідної копії; після merge hashes незмінні. Чужі edits не stashed/committed/discarded.
- Raw evidence власного worktree перед видаленням скопійовано у `/Users/silentfox/Work/dnd-tracker-constructor/.superpowers/refactor/s4-2026-10-27-a37fe381/`; там же зберігаються post-merge logs. Попередні ignored outputs keys/forms також збережено в підпапці `earlier-keys-forms-verification`.
- Виправлення map-background закриває знайдений раніше UI finding; попередній ruling про його відкладення більше не чинний. Інші межі S4 evidence залишаються.
