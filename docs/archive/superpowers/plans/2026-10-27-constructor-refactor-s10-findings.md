# Findings і межі evidence для S10

Дата передачі: 2026-10-27. Integrated HEAD на момент передачі: `55b93d7f` (`feat/constructor`). S9.3–S9.4 уже записані в цю гілку безпосередньо: `a818f829`, `e5e1c435`, `55b93d7f`; повторний merge не потрібний. Цей реєстр готує [S10](2026-10-26-constructor-refactor-s10-final-review.md), не виконує його перевірки.

Первинний intake нижче збережено як історію; актуальні disposition — у таблиці завершення S10. Старі формулювання про відсутні checkpoint-и більше не визначають поточний статус. Статичні розбіжності, неповне тестове покриття і гіпотези не прирівнюються до доведеного exploit. Пріоритет статичних findings попередній: S10 має звірити актуальний код і оцінити наслідки. Попередні виправлені findings не перевідкриваються без нових evidence.


## Актуальний disposition (2026-10-27)

| ID | Результат | Evidence / owner |
| --- | --- | --- |
| F01 | Виправлено: scoped class/feat owners, discovery та class feature projection | SQL `content-storage`: RED404/empty projection→GREEN; `operation-service.ts` |
| F02 | Виправлено: foreign nested spell refs у class/feat create/update відхиляються | Canonical writers SQL RED→GREEN, own refs та stale metadata compatibility |
| F03 | Виправлено: OpenAPI DELETE409 | OpenAPI RED→GREEN; schema refs збережено |
| F04 | Явно відкладено: repeated parsing на різних trust boundaries | Owner: content/assistant boundary task; потрібні contract/performance evidence, stored columns guards збережено |
| F05 | Виправлено: import kinds і transaction/savepoint documentation | `docs/architecture/content-api.md`, звірено з IMPORT_KINDS/importContent |
| F06 | Закрито: invalid ID та spell ref перевіряються незалежно | `resource-contracts.test.ts` |
| F07 | Закрито: baseline реально записаний перед rollback injection | `repository.integration.test.ts`,9/9 SQL |
| F08 | Закрито: authorize asserted inside active transaction | `service.test.ts` |
| E01 | Закрито в local evidence: дві сесії/distinct PIDs, real55P03 NOWAIT, sanitized500 до intent/write | `content-storage.integration.test.ts`; lock order не змінено |

S4 checkpoint/merge існують (`1263a490`, follow-up map fix `a37fe381` закритий). S5.4/S6.4/S7.4/S8.2/S8.4/S9.5 завершені, актуальні фінальні розділи progress files мають commands/counts. Остаточні команди та межі — [S10 checkpoint](2026-10-26-constructor-refactor-s10-progress.md).

Залишені межі: byte/rate hardening budgets потребують окремого AI entrypoint contract і abuse measurements (potential Medium, не доведений exploit); SIGKILL cleanup не доведений; live provider/Storage/Pusher/Redis/Next auth/cron і prod/HOMM не запускалися. Shared notice dialog accessibility warning — low-priority UI owner. Scoped precondition/hash versioning, battle scans і downstream semantic constants — окремий backlog без performance claims.

## Історичний intake S9: передані findings

Джерело: [S9 checkpoint: nested refs і findings](2026-10-26-constructor-refactor-s9-progress.md#nested-refs-і-findings-без-змін-writers) та [фінальний review S9.3–S9.4](2026-10-26-constructor-refactor-s9-progress.md#фінальний-review-і-передача).

| ID | Тип / пріоритет | Файл або сценарій; evidence | Owner / наступна дія у S10 |
| --- | --- | --- | --- |
| S10-F01 | Статична розбіжність; triage | `lib/server/content/operations.ts`, `operation-service.ts`: `abilities.get` рекламує class/feat в OwnerKind, але owner/delegates їх не обслуговують; 404. `abilities.sources` також має лише п'ять delegates. | Content operations, S10.2: виконати handlers для class/feat, узгодити advertised contract із runtime, RED→GREEN для підтвердженого дефекту. |
| S10-F02 | Security validation gap; triage | `resources/classes.ts`, `resources/feats.ts`, `lib/schemas/choices.ts`: вкладені spell refs мають structural validation, але немає campaign ownership lookup, на відміну від races/backgrounds. Downstream exploit не доведено; S9.4 binding tests не закривають цей CRUD writer gap. | Content writers, S10.2: відтворити foreign refs у class/feat features/subclasses/choices через canonical writers; визначити наслідки й додати ownership regression/fix за evidence. |
| S10-F03 | Документація контракту; triage | `lib/server/content/openapi.ts`: DELETE класів/рис/передісторій може повернути usage 409, але `r.errors` документуються лише для create/update; existing test закріплює це обмеження. | Content/OpenAPI, S10.2/10.4: звірити DELETE responses і runtime, оновити schema tests та документ. |
| S10-F04 | Дублювання; triage | `content-routes.ts`, `operation-service.ts`, assistant schema/validatedBody/content service повторно парсять input. Stored class columns guard має додаткову семантику. | Content/assistant, S10.1: оцінити повтори; видаляти лише за доказу тотожних pre-write checks, без послаблення stored-state guards. Допустиме явне відкладення без performance claims. |
| S10-F05 | Документаційний drift; triage | `docs/architecture/content-api.md`, «Імпорт і експорт»: старий перелік без feats/backgrounds; опис transaction відстає від per-row HTTP transactions / savepoints у outer assistant transaction. | Documentation, S10.4: узгодити текст з IMPORT_KINDS та актуальним importContent. |
| S10-F06 | Minor, review S9.1–S9.2 | `lib/server/content/__tests__/resource-contracts.test.ts:31`: один payload одночасно має invalid choice ID і empty spellId, тому failure не доводить обидві перевірки окремо. | Content tests, S10.2: розділити payloads або перевірити обидва issue paths; canonical schema identity assertions зберегти. |
| S10-F07 | Minor, review S9.3–S9.4 | `lib/server/compendium-import/__tests__/repository.integration.test.ts:251`: source-sync failure перед actual baseline upsert доводить rollback попередніх writes, але не вже записаного baseline. | Import/sync tests, S10.2/10.3: виконати real transaction-scoped baseline upsert, потім injected throw; assert baseline/ignored/native/provenance/sources/credits повернулися до before. Both-URL guard і owned cleanup обов'язкові. |
| S10-F08 | Minor, review S9.3–S9.4 | `lib/server/compendium-import/__tests__/service.test.ts:123`: authorization refusal і writers=0 перевірені; runtime placement authorize всередині transaction окремо не asserted. У production code placement звірено оглядом. | Import service tests, S10.2: transaction-active assertion або окремий transaction-scoped repository/spy, щоб перенесення authorize до transaction спричиняло failure. |
| S10-E01 | Межа concurrency evidence | Assistant source preview test у `compendium-import/__tests__/sync.test.ts` перевіряє exact FOR SHARE NOWAIT SQL і simulated 55P03/P2010 refusal до invoke. Не перевіряє реальну двосесійну contention чи error mapping вище prepare. | Assistant/sync, S10.2/10.3: named guarded local contention/mapping verification або явний documented limitation. Не змінювати lock order без окремого доказу. |

Expected differences не є findings: tracks apiCreate вужчий за session schema; tool discovery Ability/Effect stubs не замінюють runtime validators; compendium confirm — UI handoff; additionalSpells/gear/gold — manual; ScenarioPage notes не входять у source-sync. S10 має зберегти ці контракти, не додавати можливості під виглядом виправлень.

## Залишки серії, які S10 має звірити

Це intake з доступних checkpoints, не новий аудит і не позначення всіх залежностей виконаними.

| Джерело | Відкрите питання / межа evidence | Наступна дія |
| --- | --- | --- |
| [S1](2026-10-26-constructor-refactor-s1-progress.md#гіпотези-structural-та-залишки) | Potential Medium hardening: chat/MCP/legacy routes без окремих rate budgets; chat/context/policy/credentials читають req.json до Zod bounds. DoS/provider-cost impact не виміряно; окремий MCP byte bypass уже виправлено. | S10.2: triage поточного стану, окремий byte/rate contract і abuse/streaming evidence перед fix. Не перевідкривати виправлений MCP finding. |
| [S1](2026-10-26-constructor-refactor-s1-progress.md#гіпотези-structural-та-залишки) | Low tooling: SIGKILL/OS crash worker може залишити owned fixtures; graceful cleanup не доводить аварійний. Live provider/Storage/Pusher/Redis, реальний HTTP/browser auth та cron/HOMM не покриті synthetic UI. | S10.3: записати фактично виконані cases/cleanup і явні обмеження; не видаляти чужі fixtures. |
| [S2](2026-10-26-constructor-refactor-s2-progress.md#commits-та-залишки) | Відкритих review findings немає; synthetic HTTP/after-commit handlers не є live external evidence. | S10.3: combined regression/build та чесні межі live checks. |
| [S3](2026-10-26-constructor-refactor-s3-progress.md#завершення-й-передача) | Wall-time measurements зашумлені; transactionMs/lock duration/Postgres wire traffic unavailable; test-only lock identity stub не доводить окремий auth boundary. Scoped precondition/hash protocol зміни — окремий backlog. | S10.2/10.4: звірити raw samples і protocol, не заявляти end-to-end/egress/lock improvement без виміру. Виправлений FIXTURE_CLOCK minor не перевідкривати. |
| S4 | У поточній гілці немає S4 progress artifact; існування окремої worktree не доводить інтеграцію чи findings disposition. | S10.1: отримати актуальний checkpoint/review, звірити ancestry і додати всі відкриті findings до manifest. |
| [S5](2026-10-26-constructor-refactor-s5-progress.md) | Позаскопові дублікати перелічені в таблиці власників; формальне S5.4/combined rules-assistant evidence потребує звірки. | S10.1: визначити актуальний статус за commits/evidence; не закривати gateway лише на підставі локального rules PASS. |
| [S6](2026-10-26-constructor-refactor-s6-progress.md) | Решта S6.4: lifecycle/combined integration та реальні DB measurements не виконані цим checkpoint. | S10.1/10.3: звірити залежності, виконати або явно залишити відкритими prerequisite checks. |
| [S7](2026-10-26-constructor-refactor-s7-progress.md) | S7.4 не виконано: фінальна pipeline/snapshotHash/version/delta перевірка не випливає з S7.1–S7.3 extraction tests. | S10.1: закрити prerequisite у відповідній задачі або явно заблокувати загальний completion claim. |
| [S8](2026-10-26-constructor-refactor-s8-progress.md) | S8.2/S8.4 не виконано; ChoiceListEditor callback перевірено mock-ом; server authority не доведено UI tests. Shared dialog accessibility warning лишився поза scoped diff; benchmark/render/refetch unavailable. | S10.1/10.3/10.4: звірити залежності, browser/disclosure/receipt evidence й accessibility warning; не вважати весь S8 завершеним. |
| [S9](2026-10-26-constructor-refactor-s9-progress.md) | S9.5 roundtrip/benchmarks/EXPLAIN не виконано; S9.3–S9.4 мають 121 unit/API + 9 guarded integration passes, але не global full suite/build. | S10.1: звірити S9.5 як prerequisite. S10.3/10.4 — фінальні commands, measurements і limitations на одному integrated HEAD. |

Закривати рядок можна лише посиланням на commit/test/result або явним owner/причиною відкладення. S10.1 має перечитати всі актуальні checkpoints: цей реєстр не підміняє їх і не фіксує майбутні висновки інших сесій.


## Залишки після закриття roadmap

Незалежний final review range `73c5de1a..4f8c0a8e` і closure diff не знайшов нових production blockers. Два defects verification harness (missing attack fixture, callback arity assertion) виправлено; свіжі результати — у S10 checkpoint.

| Severity / тип | Файл або сценарій; evidence | Причина перенесення; owner / наступна дія |
| --- | --- | --- |
| Low / structural F04 | `content-routes.ts`, `operation-service.ts`, assistant/content validation повторно парсять дані на різних trust boundaries | Тотожність guards і bottleneck не доведені; content/assistant owner має спочатку виміряти й довести contract equivalence |
| Potential Medium / hardening | `app/api/mcp/route.ts`, chat/context/policy/credentials entrypoints: byte/rate budgets; S1 security matrix | Abuse/provider-cost impact не виміряний, нові budgets змінюють contract; AI entrypoint owner — окремі streaming/load tests і budgets |
| Low / accessibility | Shared notice/confirm dialog: test stderr про відсутній description | Не підтверджений функціональний blocker рефакторингу; UI primitives owner — доступний опис і перевірка screen-reader semantics |
| Low / tooling evidence | `scripts/constructor/assistant-check.ts`: SIGKILL/OS crash fixture cleanup | Перевірено graceful own-process cleanup, аварійний crash не моделювався; harness owner — fault injection з точними owned IDs |
| Evidence boundary | Live provider/Storage/Pusher/Redis/Next-session browser auth/production cron | Звичайна серія із synthetic зовнішніми boundaries; integration owner — окремий погоджений live service сценарій |
| Release gateway | HOMM main/constructor parity, prodcopy battle-sweep, DM/player workflows | Навмисно поза scope S1–S10; release owner — окремий запит і всі критерії загального constructor spec перед merge/deploy |
| Future epic | `modules/<domain>` migration, scoped hash/versioning і ширші scans/invalidation | Нові архітектурні/протокольні зміни не є extraction; architecture owner — окремий spec після constructor gate, measurements перед оптимізаціями |
