# S9 — content contracts та feature resolution checkpoint

Дата: 2026-10-27. Поточний статус: S9.1–S9.5 завершено; нижче збережено історію scoped реалізації.

- Branch: `refactor/constructor-s9-content-contracts`.
- Worktree: `/Users/silentfox/.codex/worktrees/d296/dnd-tracker-constructor` (native `using-git-worktrees`).
- Base/start HEAD: `b97435d8ede7a45684c46a6f291c70c5479e2470`, зафіксований актуальний `feat/constructor`.
- Плани roadmap/execution-guide/S9 прочитано у вихідному checkout: вони untracked, не копіювалися. Прочитано CLAUDE.md, content-api.md, checkpoints S1/S5/S6. S6.1–S6.3 вже інтегровані; S6.4 і загальний assistant/rules gateway не закриті.
- Сторонній README diff та untracked-плани залишені у вихідній копії; гілки інших worktree не перемикалися.
- Середовище: symlink `node_modules` на встановлені залежності вихідного checkout; env не копіювалися, install/DB/external services не запускалися.

## Статус і межі

- [x] S9.1 — карта всіх 12 ContentKind, operations, validators, transport/writers та findings.
- [x] S9.2 — extraction та перевірка feature resolution.
- [x] S9.3 — виконано та інтегровано безпосередньо в `feat/constructor` (див. актуальний розділ нижче).
- [x] S9.4 — виконано та інтегровано безпосередньо в `feat/constructor` (див. актуальний розділ нижче).
- [x] S9.5 — завершено, roundtrip/measurements у фінальному розділі.

Pre-flight: S9.1 лише читає contracts і додає tests/docs; S9.2 змінює pure adaptation перед плануванням запису. Shared interfaces не конфліктують, schemas/routes/writers не змінюються.

Ruling: пряме доручення дозволяє S9.1–S9.2 до загальних залежностей; S9.3–S9.5 і combined integration не запускаються. Ціна: цей checkpoint не доводить готовність всієї S9 до merge/prod.

Ruling: extraction перевіряється existing behavioral tests і доданими відсутніми characterization cases, які спочатку пройшли на старому resolver; штучного RED для незміненої поведінки немає. Ціна: це доказ сумісності перевірених сценаріїв, не exhaustive equivalence proof.

## S9.1: карта ресурсів

Джерела: `lib/server/content/define-resource.ts`, `resources/index.ts`, усі `resources/*.ts`, `service.ts`, `operations.ts`, `operation-service.ts`, `openapi.ts`, `tool-schemas.ts`, `lib/utils/api/content-routes.ts`, `lib/ai/tools/content.ts`, `lib/server/assistant/actions/{content,content-operations,content-aliases,content-coverage,content-reads}.ts`, `catalog.ts`.

Спільний transport кожного рядка: справжні collection/item `route.ts` викликають `collectionRoutes`/`itemRoutes`; OpenAPI генерує `<kind>.list/create/get/update/delete`. MCP `content_list/get/create/update/delete` через `dispatchContentAlias` та catalog доходить до `createContentActions` і `list/get/create/update/removeContent`. Read scope `content:read`, write — DM + `content:write`; `content:write` включає read. Для session діють membership/DM, scopes=null. MCP create/update envelopes містять саме canonical Zod validators (новий `resource-contracts.test.ts` перевіряє object identity для classes/feats/backgrounds). OpenAPI і `content_schema` є projections цих schemas, не альтернативною runtime validation; Ability/Effect у MCP schema навмисно скорочені до підказок, runtime лишається повним.

Шляхи у таблиці — від `/api/campaigns/{id}`; `C/U` — create/update schemas; `M/D` — member/dm для list/item. Файл writer — `lib/server/content/resources/<kind>.ts`, якщо не зазначено інше. Тести — sibling `lib/server/content/__tests__/*.test.ts`.

| Content kind | Schema C / U | HTTP/OpenAPI/MCP | Access list/item; bulk | Canonical writer | Тести / evidence |
| --- | --- | --- | --- | --- | --- |
| units | createUnitSchema / updateUnitSchema | `/units`, `/{unitId}`; спільні CRUD/tools | M/M; removeAll sessionOnly | units.ts → unitCreateData, prisma.unit; campaign race/spell/perform refs | registry/openapi/tool-schemas, units-resource, units-resource-5e |
| races | createRaceSchema / updateRaceSchema | `/races`, `/{raceId}`; спільні CRUD/tools | M/D; bulk відсутній (405) | races.ts → prisma.race, updateRaceCascade; mainSkill/skill/choiceSpellIds refs | races-resource, choices-resources, import-nested-ref |
| classes | createClassSchema / updateClassSchema | `/classes`, `/{classId}`; спільні CRUD/tools | M/D; bulk 405 | classes.ts → prisma.gameClass; name/columns/stored features/usage guards | classes-resource, choices-resources, resource-contracts, openapi-4f2/4f4 |
| feats | createFeatSchema / updateFeatSchema | `/feats`, `/{featId}`; спільні CRUD/tools | M/D; bulk 405 | feats.ts → prisma.feat; name/origin type/ASI/usage guards | feats-resource, backgrounds-resource, resource-contracts, openapi-4f4 |
| backgrounds | createBackgroundSchema / updateBackgroundSchema | `/backgrounds`, `/{backgroundId}`; спільні CRUD/tools | M/D; bulk 405 | backgrounds.ts → prisma.background; validateRefs origin+campaign spells, ASI/usage | backgrounds-resource, resource-contracts |
| spells | createSpellSchema / updateSpellSchema; query listSpellsQuerySchema | `/spells`, `/{spellId}`; спільні CRUD/tools | M/M; removeAll sessionOnly | spells.ts → prisma.spell; group/definition/manual execution checks | registry/openapi/tool-schemas, service, domain (manual execution) |
| spell-groups | createSpellGroupSchema / updateSpellGroupSchema | `/spells/groups`, `/{groupId}`; спільні CRUD/tools | M/M; bulk 405 | spell-groups.ts → prisma.spellGroup | registry/openapi/tool-schemas, content-actions (cascade) |
| main-skills | createMainSkillSchema / updateMainSkillSchema | `/main-skills`, `/{mainSkillId}`; спільні CRUD/tools | M/D; bulk 405 | main-skills.ts → prisma.mainSkill; campaign spellGroup refs | registry/openapi/tool-schemas, service |
| skills | createSkillSchema / updateSkillSchema; query listSkillsQuerySchema | `/skills`, `/{skillId}`; спільні CRUD/tools | M/M; removeAll sessionOnly | skills.ts → prisma.skill, buildSkillUpdateData; campaign spell/group/mainSkill refs | registry/openapi/tool-schemas, service |
| artifacts | createArtifactSchema / patchArtifactSchema | `/artifacts`, `/{artifactId}`; спільні CRUD/tools; media handoff | M/D; removeAll sessionOnly | artifacts.ts → prisma.artifact, assertCampaignRefs, persistIcon (prepare до lock) | artifact-resources, artifact-item-resource, import-nested-ref |
| artifact-sets | createArtifactSetSchema / patchArtifactSetSchema | `/artifact-sets`, `/{setId}`; спільні CRUD/tools; media handoff | M/M; bulk 405 | artifact-sets.ts → artifact-set-queries, syncArtifactSetMembers, persistIcon | artifact-resources, service |
| tracks | createTrackSchema / updateTrackSchema; apiCreate=createYoutubeTrackSchema | `/tracks`, `/{trackId}`; OpenAPI/MCP create YouTube; session HTTP також file | D/D; bulk 405 | tracks.ts → prisma.campaignTrack; preparedSource/fileSource до lock; assistant deterministic YouTube title | registry/openapi/tool-schemas, service, content-actions |

`listFields` звірено без нового registry: units=`raceId,level,maxHp,armorClass`; races/spell-groups=`color`; classes=`color,caster,hitDie`; feats=`type,repeatable`; backgrounds=`originFeatId`; spells=`level,groupId,cost`; main-skills=`role,spellGroupId`; skills=`mainSkillId`; artifacts=`slot,rarity,setId`; artifact-sets=`[]`; tracks=`kind,durationSec`.

`invalidates`: units→UNITS; races→RACES+UNITS; classes→CLASSES; feats→FEATS; backgrounds→BACKGROUNDS; spells/spell-groups→SPELLS; main-skills→MAIN_SKILLS+SKILLS; skills→SKILLS; artifacts/artifact-sets/tracks→[] (не дописувалися нові cache policies). `apiCreate` існує лише для tracks; query лише spells/skills.

## Operations, scopes і справжні implementation paths

Усі 18 ids звірено з route imports (`operations.test.ts`), non-sessionOnly paths+methods — динамічними imports (`openapi.test.ts`), dispatcher — switch `runContentOperation`. Наявність у catalog сама по собі доказом реалізації не вважалася.

| Operation ids | HTTP; schema | Need | Writer / implementation |
| --- | --- | --- | --- |
| rules.get/update | GET/PATCH `/rules`; RulesetPatchSchema | member read / DM write | readCampaignRules/updateCampaignRules |
| campaign.export | GET `/export` | DM read | exportCampaign |
| source.diff/apply | GET/POST `/source-sync`; sourceSyncQuerySchema/sourceSyncApplySchema | DM read/write | getSourceDiff/applySource; assistant sourcePreview для closure; ScenarioPage не sync |
| skill-trees.list/save | GET `/skill-trees`, PATCH `/skill-trees/{treeId}`; saveSkillTreeSchema | member read / DM write | listSkillTrees/saveSkillTree; MCP get_skill_tree має окремий read adapter |
| skills.duplicate | POST `/skills/{skillId}/duplicate` | DM write | owned row → prisma.skill.create |
| spells.remove-from-group | POST `/spells/{spellId}/remove-from-group` | DM write | owned → prisma.spell.update |
| spell-groups.remove-all-spells | POST `/spells/groups/{groupId}/remove-all-spells` | DM write, assistant always confirm | owned → prisma.spell.updateMany (SetNull) |
| spells.delete-by-level | DELETE `/spells/delete-by-level`; deleteSpellsByLevelSchema | DM write sessionOnly | prisma.spell.deleteMany; нема в OpenAPI/legacy MCP alias |
| units.import | POST `/units/import`; importUnitsSchema | DM write | assertCampaignRefs → importUnitsIntoCampaign |
| content.import/import-example/export | POST `/content-import/{kind}`, GET `/content-import/{kind}/example.csv`, GET `/content-export/{kind}`; contentImportSchema, IMPORT_KINDS | DM write/read/read | importContent/exampleCsv/exportCsv; MCP content_import; dryRun→content.import-preview |
| tracks.reorder | PUT `/tracks/order`; reorderTracksSchema | DM write | exact campaign IDs → sequential campaignTrack updates |
| abilities.sources/get | GET `/abilities/sources`, `/abilities/{kind}/{ownerId}`; OwnerKind path enum | DM read | explicit delegates/readAbilities; розбіжність нижче |

Collection DELETE додатково є у factory для всіх ресурсів, але тільки units/spells/skills/artifacts мають removeAll; інші дають 405. Legacy `/units/delete-all` і `/spells/delete-all` ведуть до того самого service. OpenAPI виключає collection DELETE і `sessionOnly` operation. Assistant catalog дозволяє token підготувати proposal, однак `NEED.writeAll` не дозволяє token execution/confirmation; чинний behavioral `content-actions` тест це перевіряє. Отже «присутня дія» не означає «token може виконати».

## Nested refs і findings (без змін writers)

1. **Підтверджена статична розбіжність abilities.get:** `operations.ts` бере enum `Object.values(OwnerKind)`, що включає `class` та `feat` (`lib/utils/abilities/read.ts`). `operation-service.ts:owner()` має лише SKILL/RACE/ARTIFACT/ARTIFACT_SET/UNIT, `abilities.sources` теж читає лише п'ять delegates. Для class/feat `owner()` повертає undefined, далі `runContentOperation` повертає 404. `openapi.test.ts` прямо очікує enum із class/feat, але не виконує ці handlers. Це розходження реклами та реалізації; catalog/route coverage його не спростовують. Потрібна окрема writer/operation задача поза allowlist; live DB не перевіряли.
2. **Неповний campaign-ref guard у class/feat writers:** `lib/schemas/choices.ts` перевіряє форму `options[].spells[].spellId` (непорожній рядок), але не campaign ownership. `resources/classes.ts:create/update` перевіряє names/columns/choice IDs і записує features/subclasses JSON; `resources/feats.ts:create/update` — names/usage/ASI, без campaign spell lookup. На відміну від races (`assertCampaignRefs(choiceSpellIds(...))`) та backgrounds (`backgroundSpellIds` + campaign-scoped count), власного guard для цих вкладених refs тут немає. Це статично підтверджена прогалина validation до збереження JSON, не доказ міжкампанійного читання/експлуатації в downstream mechanics. `choices-resources` перевіряє class JSON write, але не foreign refs; новий resource-contracts перевіряє лише однакову структурну валідацію, не стверджує ownership. Не виправлялося через заборону writer/schema змін.
3. **OpenAPI неповний для runtime errors видалення:** `openapi.ts:resourceSpecs` передає r.errors лише create/update. `classesResource.remove`, `featsResource.remove`, `backgroundsResource.remove` можуть відмовити 409 через usage; у DELETE документа цього response немає. Поточний openapi test явно закріплює errors only create/update. Не змінювалися schemas/routes/OpenAPI.
4. **Повторні parse підтверджено:** operationRoute парсить op.body, runContentOperation — envelope, окремі switch branches ще раз `.body.parse`; resource assistant schema + validatedBody + create/updateContent також повторюють parse. Видаляти їх у S9.1 не дозволено. Зокрема update class guard використовує stored columns — його не можна підмінити лише input schema.
5. **Очікувані відмінності:** tracks apiCreate вужчий за session create; content_schema з Ability/Effect stubs — опис discovery, не runtime bypass; media/file та compendium upload/confirm — UI handoffs, без нових model-callable confirm/scopes; additionalSpells, gear/gold — manual; ScenarioPage source-sync відсутній.
6. **Документаційний drift:** у content-api.md розділ «Імпорт і експорт» має старий перелік без feats/backgrounds; фактичний IMPORT_KINDS і раніший backgrounds розділ їх включають. Старий текст «без однієї транзакції» уточнюється поточним `importContent`: per-row transaction для HTTP, savepoints усередині outer assistant transaction. Спільну architecture doc не редагували.

## Частковий content.import і атомарний compendium confirm

`content/import/import-content.ts:planRow` спершу валідовує рядки canonical create/update, `importContent` пише лише pending, ловить помилку кожного рядка і продовжує, повертаючи counts/results. Звичайний HTTP — окремий `withCampaignContentWrite` на рядок; у assistant outer transaction — SAVEPOINT/ROLLBACK TO/RELEASE на рядок. Partial result є контрактом; `content-operations.ts` показує warning у preview та report. DryRun без writes/intent, але ownership checks writers не обов'язково виконуються під час dryRun.

`compendium-import/service.ts:confirmImport` виконує заплановані native writes, notes/provenance/sources/run в одній `repository.transaction`; repository використовує `withCampaignContentWrite`. Помилка не перетворюється на per-row success report. HMAC/locks/receipts/transactions не змінювалися й повторно не аудіювалися в S9.1–S9.2. Це різні workflows, їх не об'єднували.

## Baseline та characterization до extraction

Команда baseline: `pnpm exec vitest run lib/server/compendium-import/__tests__/{adapters,dependencies,domain,plan}.test.ts lib/server/content/__tests__/{registry,openapi,tool-schemas,classes-resource,backgrounds-resource}.test.ts` (у shell виконано явними дев'ятьма paths): **9 файлів / 117 passed / 0 skipped / exit 0**.

Baseline `pnpm exec tsc --noEmit --incremental false`: **exit 0**.

До production змін додано `compendium-import/__tests__/feature-resolution.test.ts` (13 cases) і `content/__tests__/resource-contracts.test.ts` (7 cases): **2 файли / 20 passed / 0 skipped / exit 0**. Перевірено parent/source/level та UID ordering, duplicate/missing/edition/source ambiguity, subclass source bindings/mergeParent/nested ID, optional count/partial failures/unique used counts/unused optionals, description/manual abilities, issue order, categories/excluded paths; canonical schema identity/invalid nested IDs/spell-ref shape/sessionOnly. Є Node punycode deprecation warning; failed/skipped немає.

## S9.2 interfaces та завершальні перевірки

Новий pure module `lib/server/compendium-import/feature-resolution.ts` експортує:

```ts
interface FeatureResolutionContext {
  root: Compendium;
  editionFallback: unknown;
  issues: ImportIssue[];
  embedded: Record<string, number>;
  usedOptionals: Set<string>;
}
resolveCompendiumFeatures(
  raw: unknown,
  kind: "classFeature" | "subclassFeature",
  ownerPath: string,
  context: FeatureResolutionContext
): JsonRecord[];
```

`effectiveEdition(value: unknown, fallback: unknown): Edition` перенесено в `adapters/shared.ts`; `adapt.ts` зберігає compatibility re-export. Existing consumers через adapt.ts не змінювалися. Runtime imports: adapt → feature-resolution → shared/entries/identity/parse/types; shared не імпортує adapt або feature-resolution, нового циклу немає. Registry adapters, orchestration, source binding/keys/mergeParent/refs та final issue association залишені в adapt.ts.

Resolver body перенесено механічно, без candidate index/cache чи вибору першого кандидата. UID не містить edition discriminator: кілька однакових candidate identities у різних editions лишаються unresolved, жодна редакція не обирається за fallback. Canonical keys usedOptionals зберігають effective edition. Декілька successful optional resolutions у неповному options group уже враховувалися в usedOptionals навіть без emitted choice — ця поведінка збережена. Категорії/excludedPaths фільтрують owners в orchestration; nested dependency definitions лишаються доступні resolver, як раніше. Опис/manual warnings не стають abilities.

Одноразова read-only перевірка `/tmp/s9-token-equivalence.cjs`: TypeScript compiler для старого inner features body з `git show b97435d8:.../adapt.ts` і нового resolver body після підстановки closure context видає **ідентичний JavaScript**. Exit 0. Початковий варіант lexical scanner experiment не обробляв template rescanning і давав хибний whitespace diff; його замінено реальною TypeScript transpilation, production code не виправлявся. Це структурне evidence extraction, не заміна behavioral suites.

Фінальний targeted прогін на code HEAD `7aa2c57d72d5a70132efc1e74432889e8852b1c8` (подальший cleanup прибирає лише порожній EOF рядок): **22 файли / 244 passed / 0 failed / 0 skipped / exit 0**. Команда:

```sh
pnpm exec vitest run lib/server/compendium-import/__tests__/{adapters,dependencies,domain,plan,feature-resolution}.test.ts lib/server/content/__tests__/{registry,openapi,tool-schemas,classes-resource,backgrounds-resource,resource-contracts,feats-resource,choices-resources,operations,access,service,import-content,import-nested-ref,openapi-4f4}.test.ts lib/server/assistant/__tests__/{content-actions,content-operations,coverage}.test.ts
pnpm exec tsc --noEmit --incremental false
pnpm exec eslint lib/server/compendium-import/adapt.ts lib/server/compendium-import/adapters/shared.ts lib/server/compendium-import/feature-resolution.ts lib/server/compendium-import/__tests__/feature-resolution.test.ts lib/server/content/__tests__/resource-contracts.test.ts
git diff --check b97435d8..HEAD
```

Команда Vitest виконувалася явними paths (brace notation тут лише компактний еквівалент). TypeScript exit 0; ESLint exit 0, errors/warnings 0. Попередній range diff check виявив порожній EOF рядок нового resolver (untracked файл не входив у попередній unstaged diff check); cleanup прибирає його, фінальний range check записується після commit. Є лише existing Node DEP0040 punycode warnings у assistant-dependent suites.

Новий registry, schemas/routes/writers, service/repository transaction code, HMAC, parser limits, source-sync writers, assistant core, mechanics, UI/hooks, package/lockfile і Prisma не змінювалися. DB/browser/provider/external services, production build/full suite та загальна інтеграційна перевірка не запускалися. Продуктивність/SQL/bytes/memory/p50/p95 не вимірювалися; прискорення не заявляється.

Під час S9 вихідний `feat/constructor` інша сесія просунула до `927ff45f2c27645f98a0ffddb96bdf36258351c7` (S2 completion). Новий S2 checkpoint прочитано: S2.1–S2.4 завершені/інтегровані; наступна S3.1. S9 лишається на зафіксованій початковій базі b97435d8, без rebase/merge/cherry-pick. Наведені S9 suites стосуються власного ізольованого HEAD, не нового combined HEAD.

## Commits для інтеграції та залишки

1. `0b79e88e` — `docs(content): map constructor resource contracts` (карта і schema/sessionOnly contract tests).
2. `7aa2c57d72d5a70132efc1e74432889e8852b1c8` — `refactor(import): isolate compendium feature resolution` (extraction + 13 characterization cases).
3. Наступний checkpoint/cleanup commit фіксує підсумковий статус, review і EOF cleanup. End HEAD визначається `git log -1 --format=%H -- docs/superpowers/plans/2026-10-26-constructor-refactor-s9-progress.md`.

S9.1–S9.2 завершено. S9.3–S9.5 **не виконані**; parser safety/HMAC/rollback/source-sync/benchmark/roundtrip залишаються наступній дозволеній сесії після узгоджених залежностей. Окремо передати власникам findings abilities.get enum/delegates, class/feat nested ownership, DELETE 409 documentation та parse duplication. Не трактувати їх як виправлені або як доведені downstream exploits.

Для майбутнього architecture/handoff: orchestration живе в adapt.ts, nested resolution — feature-resolution.ts з явним context; effectiveEdition — shared.ts із compatibility re-export. Спільні roadmap/README/STATUS/handoff цією сесією не редагувалися. Merge/push/deploy та інтеграція чужих сесій не виконувалися; worktree й гілка збережені для review/інтеграції.

## Review

Один незалежний read-only reviewer за `superpowers:requesting-code-review` перевірив range b97435d8..7aa2c57d та simplify. **Critical/Important/Minor = 0/0/1**. Вердикт: S9.1–S9.2 придатні до прийняття після завершення checkpoint, блокувальних регресій не знайдено. Reviewer незалежно виконав 12 цільових suites: **156 passed / 0 skipped / exit 0**; повторив emitted-JS equivalence — PASS. Файли/index/HEAD не змінював. Додаткових обґрунтованих спрощень не знайшов.

Final: minor (deferred): `lib/server/content/__tests__/resource-contracts.test.ts:31` — payload одночасно має invalid choice ID і порожній spellId; assertions на failure/equality не гарантують, що кожна з двох перевірок окремо спрацювала. Наступне посилення: розділити payloads або assert обидва issue paths. Canonical schema identity assertions незалежні від цього minor; production validation не змінювалася.

Final: Ruling: S9.3 parser/output safety, S9.4 HMAC/live auth/locks/rollback/idempotency/source-sync, S9.5 roundtrip/benchmarks/DDL лишаються явно неперевіреними в цій сесії за прямим обмеженням користувача. Ціна: extraction evidence не доводить безпеку й атомарність усіх import paths.

Final: Ruling: combined rules/assistant integration та готовність всієї S9 до merge/prod не випливають із цього review; це scope лише S9.1–S9.2 на pinned base. Ціна: потрібна повторна перевірка сумарного HEAD інтегратором.

Final: Ruling: статична прогалина class/feat nested ownership передана наступній writer-задачі, без виправлення заборонених файлів і без твердження про доведений downstream exploit. Ціна: ownership guard у поточних writers лишається неповним; exploitability потребує окремої перевірки.

Остаточна дія за `superpowers:finishing-a-development-branch` уже визначена користувачем: залишити гілку/worktree для інтегратора, без меню merge/push та без загальної regression/integration. Commit checkpoint і чистий range diff check закривають незалежну частину.

## Локальна інтеграція у constructor

Наступне доручення користувача «мерджи» дозволило локально інтегрувати завершені S9.1–S9.2.

- Target: `feat/constructor`, `/Users/silentfox/Work/dnd-tracker-constructor`.
- Target до merge: `927ff45f2c27645f98a0ffddb96bdf36258351c7` (містить інтегровану S2).
- Source: `refactor/constructor-s9-content-contracts`, `0f9fcefe4ef77eaf32d26624e7b1b2e4194202f6`.
- `git merge --no-ff refactor/constructor-s9-content-contracts -m 'Merge S9.1–S9.2 content contracts and feature resolution'`: exit 0, без конфліктів.
- Merge commit: `8b408e4f0c5dd8f0f3cf7fa36d5e7a7f19949a39`.
- На merge HEAD повторено фінальні команди Vitest/TypeScript/ESLint із розділу S9.2: **22 файли / 244 passed / 0 failed / 0 skipped / exit 0**; `pnpm exec tsc --noEmit --incremental false` — exit 0; ESLint із `--max-warnings=0` — exit 0, errors/warnings 0; `git diff --check 927ff45f..HEAD` — exit 0. Є тільки existing Node DEP0040 warnings.
- Сторонній README diff і всі untracked-плани збережено та не включено до merge або документаційного commit. Інші worktree не перемикалися й не редагувалися; native S9 worktree та гілку залишено.

S9.1–S9.2 інтегровано. S9.3–S9.5, загальний gateway/S10, full suite/build і DB/external integrations лишаються невиконаними цією сесією. Findings та deferred minor із review не виправлялися під час merge. Push/deploy не виконувалися.

## S9.3–S9.4 — безпека імпорту (2026-10-27)

Пряме доручення: тільки S9.3–S9.4. Згадка spell flow/calculations/turn boundaries звірена з S7: S7.1–S7.3 вже інтегровані; бойові файли не змінюються. Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, branch `feat/constructor`, start HEAD `8c9bd69a7402067ff7578f451a3c3a86cebbaa07`. Наявні сторонні README/untracked plans не включаються до commits. S9.5, combined gateway, S10, merge/push/deploy не входять до scope.

Pre-flight: S9.3 parser/readInput → S9.4 fingerprint/token/transaction: ті самі ImportInputSchema/COMPENDIUM_LIMITS; signatures і payloads не змінюються. Цільовий baseline 7 suites (parse/http/presentation/service/sync/template apply/source-sync API): **76 passed / 0 skipped / exit 0**. План і актуальні subsystem contracts прочитані; актуальний код є джерелом lock semantics.

### S9.3 — виконано

- Limits pinned: file bytes **3145728**, transport **3000000**, depth **32**, nodes **500000**, string bytes **131072**, record bytes **262144**, records **10000**, selected **2000**, sources **100**. File і transport не об'єднувалися.
- Додано exact/one-over для file (string/Uint8Array), depth, multibyte string, record, nodes; exact record/source counts доповнюють existing over-limit tests. Escaped/plain forbidden keys, duplicate decoded keys, invalid surrogates/NUL перевіряють CompendiumError/code; confirm не відкриває transaction і не викликає жодного repository method на malformed source.
- Реальний HTTP stream без content-length: 3000000 bytes приймаються, 3000001 → 413/REQUEST_SIZE до planning/confirm; invalid UTF8 → 422/INVALID_INPUT. HTML/unsafe URLs залишаються source data. Реальний CompendiumReport через React SSR екранує imported markup та показує metadata URLs як текст; publicToolData приховує credential-bearing URLs. SourceNotes також використовує React text children (статичний огляд), не HTML sink.
- Продуктові файли/public interfaces не змінено: нові characterization tests одразу GREEN, confirmed regression не знайдено, тому production fix/RED не потрібні. Це evidence перевірених меж, не твердження про відсутність усіх security defects.
- `pnpm exec vitest run lib/server/compendium-import/__tests__/parse.test.ts lib/server/compendium-import/__tests__/http.test.ts lib/server/compendium-import/__tests__/presentation.test.ts`: **3 files / 54 passed / 0 skipped / exit 0**.
- ESLint для трьох змінених test files (`--max-warnings=0`): exit 0. `pnpm exec tsc --noEmit --incremental false`: exit 0. `git diff --check`: exit 0.

### S9.4 — verification evidence

- Service tests: wrong user/campaign/fingerprint/planHash, tampered signature, token 4097 → попередні PREVIEW codes і всі writers=0; signed token рівно 4096 приймається. Secret 31 відхиляється, 32 приймається. Frozen clock: expiry рівно 15 хв приймається (`expires < Date.now()`), +1 мс відхиляється. Відмова live authorization перевірена до writes; розташування authorize всередині transaction підтверджене оглядом коду (окремої runtime assertion на transaction placement немає). Зміна repository settings після preview відхиляється до writes.
- Idempotent replay повертає збережений report без write/saveEntry/saveSources/saveRun; інший requestHash з тим самим key → IDEMPOTENCY_CONFLICT. Serialized input 3000000/3000001 перевірено окремо від file budget.
- Real repository integration: explicit binding на foreign origin feat у nested background відхиляється; після valid preview перенесення selected synthetic target до іншої owned campaign також відхиляє confirm (`BINDING_WRONG_CAMPAIGN`). Зміна template dependency після preview → PREVIEW_STALE без native writes/run.
- Real rollback nested graph: parent race + subrace + origin feat + dependent background. Injected failure після другого native write, другого provenance write та receipt insert повертає всі native rows, provenance, sources, credits/settings і runs до повного попереднього стану. Окремо canonical source apply через scoped transaction з failure перед baseline upsert rollback-ить native feat/provenance/sources/credits; baseline залишається незмінним. Rollback уже записаного baseline цей тест не доводить.
- Existing apply/API suites підтвердили stale sourceHash/status → 409, baseline/ignored, credits, dependency closure та foreign nested refs. Нові sync tests: усі provenance conflicts перевіряються до першого upsert; ScenarioPage entries/notes й нерелевантні source metadata не переносяться.
- Lock semantics уточнено за кодом: compendium confirm — target FOR UPDATE; direct source apply — target FOR NO KEY UPDATE; assistant source preview — source FOR SHARE NOWAIT після target guard. Новий deterministic test викликає реальний assistant prepare у scoped fake DB: exact NOWAIT SQL і 55P03/P2010 refusal до invoke. Двосесійний PostgreSQL contention не запускали; lock order й error mapping не змінювали.
- Перед DB baseline guard: `pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/constructor/assistant-check.ts --check-target` → `{"database":"constructor","local":true,"bothUrls":true}`, exit 0. Suite повторно перевіряє обидва URLs (localhost:54322/constructor) і встановлює connection_limit=1. Cleanup перевіряє owner + synthetic marker обох campaign fixtures, видаляє тільки їх і synthetic user, assert leftovers=0. Список applied migrations до/після однаковий; URLs/credentials не виводилися.
- `pnpm exec vitest run lib/server/compendium-import/__tests__/service.test.ts lib/server/compendium-import/__tests__/sync.test.ts lib/server/templates/sync/__tests__/apply.test.ts app/api/__tests__/source-sync-api.test.ts`: **4 files / 67 passed / 0 skipped / exit 0**.
- Combined S9.3–S9.4 named unit suites: **7 files / 121 passed / 0 skipped / exit 0**.
- `pnpm exec vitest run --config vitest.integration.config.mts lib/server/compendium-import/__tests__/repository.integration.test.ts`: baseline **3 passed**, final **9 passed / 0 skipped / exit 0**. Тільки named suite, без зовнішніх Pusher/Redis/provider викликів.

Production files, public signatures, error codes, payloads, HMAC semantics, lock order і persisted JSON не змінювалися. Нові characterization tests одразу GREEN; confirmed production defect не знайдено. Benchmarks/EXPLAIN, S9.5 roundtrip, full suite/build та фінальна combined integration належать наступним задачам і тут не запускалися. Невиконані попередні cross-stage gateways не оголошено закритими. Findings/deferred minor S9.1–S9.2 залишаються окремими.

S9.4 typecheck `pnpm exec tsc --noEmit --incremental false` — exit 0; ESLint усіх шести змінених tests із `--max-warnings=0` — exit 0; `git diff --check` — exit 0. Під час підготовки typecheck виявив відсутнє narrowing union AssistantActionDef у новому test; уточнено `effect === "write"`, повторний typecheck зелений. Lint warnings у нових non-null assertions прибрано явними guards; production defects це не засвідчувало.

### Фінальний review і передача

`superpowers:requesting-code-review`: один незалежний read-only reviewer перевірив **8c9bd69a..e5e1c435** та simplify. **Critical/Important/Minor = 0/0/2**; готовність у межах S9.3–S9.4 — так. Reviewer повторив 7 named unit/API suites: **121 passed / 0 skipped / exit 0**, diff check — exit 0. Продуктових змін чи обґрунтованої потреби у додатковому спрощенні не виявлено. Severity повторно оцінено: обидва findings стосуються точності майбутнього regression signal; поточний production path має transaction placement і загальний rollback, підтверджені code inspection/real repository tests. Нові Critical/Important не виявлено, fix pass не потрібен.

Final: minor (deferred): `repository.integration.test.ts:251` — simulated source-sync failure стається до actual baseline upsert; незмінний baseline не доводить rollback після записаного baseline. Можливе посилення: real tx.campaignSourceSync.upsert, потім throw. Точність checkpoint вище виправлено.

Final: minor (deferred): `service.test.ts:123` — authorization refusal перевіряє writers=0, але не runtime placement всередині transaction; окремий transaction-active flag або scoped repository spy посилить regression evidence. Поточне розташування звірене з кодом; scope не розширювали.

Final: Ruling: S9.1–S9.2 findings, S7, S9.5, combined gateways/S10, benchmarks/full suite/build лишаються поза цим дорученням, як і сторонні README/untracked plans. Ціна: ця сесія не доводить глобальну готовність конструктора й не закриває попередні findings.

Final: Ruling: NOWAIT adapter test доводить SQL/refusal до invoke, але не реальну двосесійну contention чи error mapping вище prepare; їх не оголошено перевіреними. Ціна: concurrency/mapping evidence обмежене. Reviewer не повторював DB run за read-only дорученням; executor сам виконав guarded suite (9 passed), повторний зовнішній запуск не потрібен для цього review.

Commits: **a818f829** — S9.3; **e5e1c435** — S9.4; завершальний docs commit додає review/checkpoint (його HEAD видно в git log). Обидві задачі виконано; наступний task — **S9.5**, лише за окремим дорученням. Гілку `feat/constructor` і чинний worktree збережено; відповідно до execution guide merge/push/deploy не виконуються. Сумарний range містить тільки 6 test files і цей checkpoint; production code/public contracts не змінено.

### Інтеграція S9.3–S9.4 та findings → S10

Доручення користувача: «мерджи і познач всі findings для s10». На початку виконання `feat/constructor` уже містив `a818f829`, `e5e1c435`, `55b93d7f` безпосередньо; `git branch --contains 55b93d7f` підтвердив target. Додатковий merge/cherry-pick не створювався: ці commits уже інтегровані, main не змінювалася.

У [реєстр S10](2026-10-27-constructor-refactor-s10-findings.md) передано всі відкриті findings S9: 5 статичних/content/documentation пунктів, minor S9.1–S9.2, обидва minor S9.3–S9.4 та concurrency evidence limitation. Додано intake/посилання на залишки доступних S1–S9 checkpoints і вимогу отримати відсутній S4 artifact при інтеграційній звірці. S10 plan прямо посилається на реєстр; усі пункти відкриті, їх не видано за виправлені. S10 і S9.5 цією дією не виконувалися.

Після перевірки target ancestry повторено ті самі 7 named unit/API suites на чинному integrated code: **121 passed / 0 failed / 0 skipped / exit 0**. Від S9.3–S9.4 verification продуктовий/test code не змінювався; попередні 9 guarded DB passes, typecheck/lint evidence залишаються історією попереднього прогону, повтору DB/full suite/build тут не було. Local Markdown file links — PASS; `git diff --check` — exit 0. Commit містить лише цей checkpoint, S10 plan (раніше untracked; тепер додано за прямим дорученням S10 handoff) і findings register; сторонній README та решта untracked plans залишені без змін. Push/deploy не виконувалися.

## S9.5 — roundtrip та вимірювання (2026-10-27)

Start code HEAD `52d4e112`; S5–S8 remaining gates закрито.

- [x] S9.5. Named bundle/background/remap/leak/compendium bundle suites: **5 files /24 passed /0 failed/skipped**, exit0.
- Новий guarded SQL scenario: **1 passed**, exit0 (~21s). 10/10/2 та500/500/20 spells/artifacts/heroes; class + feat + background; export→import→source spell update→apply→empty diff. Asserts remapped nested spell ID, grant policy, background origin feat, class feature grant, credits; target не отримує source characters/private settings. Owned campaigns/user очищені; migration list unchanged; обидва URL local constructor, connection_limit1.
- 5 warmups +30 samples/scenario. Fixture seed — index, немає clock-sensitive payloads. queryCount=Prisma operations через query extension, **без BEGIN/COMMIT**; resultJsonBytes=returned-query JSON, **не wire traffic**. Heap deltas з GC/noise доступні в raw samples; lock duration/wire traffic unavailable.
- EXPLAIN ANALYZE BUFFERS тільки synthetic SELECT: small Index Scan10 rows; large Seq Scan500 rows (~1ms). Умови/values прибрано зі звіту, індекс/DDL не додавався. Це окремий diagnostic read, не доказ bottleneck import/sync.

| Сценарій | Queries | JSON bytes | Median ms | p95 ms |
| --- | ---: | ---: | ---: | ---: |
| small.import | 5 | 57 | 5.350 | 5.999 |
| small.export | 15 | 11132 | 6.890 | 8.355 |
| small.diff | 31 | 24664 | 12.092 | 12.579 |
| small.apply | 33 | 27458 | 15.916 | 16.674 |
| small.features | 0 | 0 | 0.043 | 0.113 |
| large.import | 5 | 59 | 125.343 | 127.746 |
| large.export | 15 | 500462 | 26.762 | 30.370 |
| large.diff | 31 | 1096424 | 69.275 | 73.010 |
| large.apply | 33 | 1168798 | 82.630 | 91.603 |
| large.features | 0 | 0 | 29.717 | 31.118 |

Comparative baseline для S9 unavailable: нових lookup/cache/optimizations не додано, дані характеризують поточний код, speedup не заявляємо. Extraction feature resolver зберіг попередню семантику (S9.2); current CPU feature adaptation виміряно окремо, всі referenced features реально embedded.

Raw samples/versions/commit/EXPLAIN: `docs/superpowers/plans/2026-10-27-constructor-refactor-content-benchmark.json`. Відтворення: `pnpm exec vitest run --config vitest.integration.config.mts lib/server/templates/__tests__/refactor-roundtrip.integration.test.ts`; результат у `.superpowers/sdd/2026-10-26-constructor-refactor-s10-final-review/content-benchmark.json`. Перевірити both-URL guard перед запуском; тільки local constructor.

TypeScript/zero-warning ESLint/diff check — exit0. Початкові fixture credits/type/damageType/controlledBy та Prisma extension typing виправлено до фінального прогону; production files не змінювалися. S9.1–S9.5 завершено; усі раніше відкриті findings S10-F01–F08/E01 потребують disposition у S10. Full suite/build/final security review — наступні.
