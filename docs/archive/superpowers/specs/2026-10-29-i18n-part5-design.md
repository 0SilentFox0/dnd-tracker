# i18n: частина 5 — великі домени

Гілка `feat/i18n-part5` (worktree `../dnd-tracker-t5`) від main `eb11461e`. Базові правила — `docs/architecture/i18n.md` (розділи «Межі коду», «CRUD-домени (частина 3)», «Середні домени (частина 4)»), порядок частин — `docs/superpowers/specs/2026-10-28-i18n-core-design.md`, зразок — `docs/archive/superpowers/specs/2026-10-29-i18n-part4-design.md` (рішення 1–10 ч.4 діють і тут).

## Мета і межі

**Входить** (інвентаризація кирилиці поза коментарями й `__tests__`, символів):

| Домен | Каталоги | ≈ символів / файлів |
|---|---|---|
| scenario | `components/scenario/**`, `lib/hooks/scenario/**`, `lib/utils/scenario/section-icon.ts`, `lib/constants/scenario.ts`, `lib/schemas/scenario.ts`, `app/campaigns/[id]/dm/scenario/**` | 3,6 тис. / 36 |
| show + acquaintances | `components/show/**`, `lib/hooks/show/**`, `lib/schemas/show.ts`, `lib/api/decks.ts`, `app/campaigns/[id]/{dm/show,show}/**`, `components/acquaintances/**`, `lib/hooks/acquaintances/**`, `app/campaigns/[id]/acquaintances/**` | 2,2 тис. / 32 |
| world | `components/world/**`, `lib/hooks/world/**`, `lib/schemas/world.ts`, `lib/constants/world.ts`, `lib/api/world.ts`, `app/campaigns/[id]/{dm/world,world}/**` | 4,0 тис. / 30 |
| ai UI | `components/ai/**`, `lib/hooks/ai/**`, `lib/constants/ai.ts`, `lib/schemas/ai.ts`, `lib/utils/ai/**`, `app/campaigns/[id]/dm/{ai,assistant}/**`, `app/settings/ai/**` | 5,0 тис. / 27 |
| assistant (сервер) | `lib/server/assistant/**`, `lib/server/{campaigns,characters,scenario,show}/action-service.ts`, `lib/server/characters/progression-service.ts`, `lib/server/content/{operations,openapi,tool-schemas,operation-service}.ts`, `lib/server/content/resources/**`, `lib/utils/scenario/{ai-ops,block-inventory}.ts` | 6,4 тис. / 34 |
| lib/ai (промпти, тули, MCP) | `lib/ai/**`, `app/api/mcp/route.ts`, `app/api/campaigns/[id]/ai/**` | 4,6 тис. / 22 |
| compendium UI | `components/content-import/{Compendium*,RulesPatchOffer,SourceNotes}.tsx`, `lib/hooks/compendium-import/**`, `lib/utils/compendium-import/**`, `lib/constants/compendium-import.ts`, `app/campaigns/[id]/dm/compendium/**` | 3,3 тис. / 14 |
| compendium сервер | `lib/server/compendium-import/**` | 4,4 тис. / 16 |
| CSV-імпорт | `components/content-import/{ContentImportWizard,ContentTransferButtons,ErrorReportButton}.tsx`, `components/content-import/steps/**`, `lib/hooks/content-import/**`, `lib/utils/content/**`, `lib/schemas/content-import.ts`, `lib/server/content/import/**` | 4,3 тис. / 26 |
| генератор героя | `lib/utils/characters/generate/{backstory,names}.ts`, `app/api/campaigns/[id]/characters/draft/backstory/generate-backstory.ts` | 2,8 тис. (контент) / 3 |

**Хвости ч.4:** (а) винесення ігрових термінів із `common` (root-чанк); (б) дублі `common.actions`; (в) HP-розкладка `getHeroMaxHpBreakdown`; (г) часова зона користувача.

**Успіх:** з `NEXT_LOCALE=en` сценарій, показ (редактор і сцена гравця), світ (редактор, гра, показ), знайомства, AI-панель/асистент/налаштування AI, імпорт компендіуму й CSV — англійською без сирих ключів; асистент відповідає мовою користувача (чат — мовою cookie, MCP — мовою профілю власника токена); з `uk` — слово в слово як зараз (крім текстів для моделі, рішення 2); храповик тримає всі каталоги скоупу; root-чанк легший; `scope-size` зелений.

**Не входить (ч.6):** `components/battle/**`, `lib/utils/battle/**`, `lib/hooks/{battle,battles}/**`, `lib/server/battles/**`, `lib/server/assistant/actions/{battles,battle-actions,battle-coverage}.ts` (підписи бойових дій асистента — разом із логом бою), `lib/utils/abilities/registry/**` (`describe`/`summary`), `lib/constants/{critical-effects,save-critical-effects}.ts`, бойові константи-підписи (`spells`, `skills`, `abilities`, `damage`, `monster`, `artifacts`, `experience`, `classes`, `main-skills`, `ungrouped`, `choices`, `hero-archetypes` — їх читають імпорт/бій/AI). Також поза доменами: `lib/utils/items/item-stats.ts`, `lib/supabase/*-storage.ts`, `lib/server/templates/**`, `lib/utils/abilities/{read,build}` — задача 12 бере їх, лише якщо разом ≤ 0,6 тис. символів і без бойових споживачів, інакше ч.6.

## Reuse-аудит

| Існує | Як використовується в ч.5 |
|---|---|
| `getTranslator`, `getRequestLocale`, `useTranslator`, `translateIssue`/`issueParams`, `useFormatter` | серверні тексти за локаллю, динамічні ключі, Zod-issue, дати (`world_travel_log`, версії сценарію, запуски імпорту, токени) |
| `apiErrorJson`/`errorResponse`/`ContentError` + `API_ERRORS` | помилки маршрутів скоупу; рядок поза каталогом проходить як є (legacy-рядки з БД) |
| `translateImportReport` + `ImportIssue { params, minimum, maximum }` | CSV-імпорт: issue-повідомлення стають ключами `contentImport.issues.*` без нового механізму |
| `TextRef { key \| label, params }`, `useSheetLine` (ч.4) | HP-розкладка героя (хвіст в) |
| `common.actions/form/confirm/search/states/deleteAll/tabs/header`, `common.dmSections`/`dmMenu` | кнопки, пошук, стани, назви розділів DM у крихтах — не дублювати в нових ns |
| ns ч.3–4: `spells.*`, `units.*`, `rules.mechanics.*`, `characters.archetypes.*`, `campaigns.roles.*`, `dashboard.sections.*` | підписи видів контенту, механік, архетипів у UI імпорту/асистента/світу — читати за повним ключем, не копіювати |
| `expectLabelKeys`, `renderWithIntl`, `makeT`, `parity`, `api-errors-coverage`, `client-api-errors`, `scope-size`, `lib/__tests__/client-entry-imports.test.ts` | тести реєстрів, en-рендер, паритет ICU, серверні ns, бандл без zod |
| `CAMPAIGN_NAMESPACES` (`lib/i18n/scopes.ts`), один `app/campaigns/layout.tsx` | нові клієнтські ns ч.5 додаються в цей список, а не в локальні `LocaleScope` |
| `useConfirm`/`useNotify`, `NameOnlyCreateDialog`, `EmptyState`/`QueryState` | приймають перекладені `texts` |

**Нове:** клієнтські ns `scenario`, `show`, `acquaintances`, `world`, `ai`, `compendium`, `contentImport`, `gameTerms`; серверні ns `assistant`, `compendiumReport`; `SERVER_NAMESPACES` у `lib/i18n/config.ts`; `AssistantCaller.locale`/`AiToolContext.locale`; `languageName(locale)`; `lib/constants/import-aliases.ts` (дані); cookie часової зони.

## Namespace-и і завантаження

| ns | Що | Де вантажиться | Задача |
|---|---|---|---|
| `gameTerms` | `abilities`, `stats`, `spellLevels`, `dndSkills`, `ungrouped`, `damageTypes`, `monster`, `weaponTraits`, `creatureTypes`, `abbreviations` (з `common`) | `CAMPAIGN_NAMESPACES` | 1 |
| `scenario` | редактор, рукопис, гра рядків, док показу, діалог знайомства в редакторі | campaigns | 2 |
| `show`, `acquaintances` | редактор наборів, сцена гравця, пазл; сторінка знайомств, нотатки | campaigns | 3 |
| `world` | редактор карт/маркерів/зон, гра, показ, подорожі, нотатки, `world.validation.*` | campaigns | 4 |
| `ai` | панель, композер, пропозиції, інтенти, політика, токени, провайдери | campaigns + `app/settings/layout.tsx` | 5 |
| `assistant` | **серверний**: підписи результатів, summary/warnings/effects інтентів, handoff-причини, помилки ops сценарію | лише `getTranslator` | 6 |
| `compendium` | майстер компендіуму, категорії, залежності, звіт, запуски | campaigns | 8 |
| `compendiumReport` | **серверний**: issue-повідомлення адаптерів/плану компендіуму | лише `getTranslator` | 9 |
| `contentImport` | майстер CSV, кроки, підписи полів, `contentImport.issues.*` | campaigns | 10 |

Root (`common`, `validation`, `whatsNew`) після задачі 1 легшає: `common` uk 11,1 → 6,9 KB raw, root-чанк (обидві мови) 13,2 → 10,5 KB gzip. `dmSections`/`dmMenu` лишаються в `common`: їх читають `Header`/`Breadcrumbs` у root-chrome, вище `app/campaigns/layout.tsx`.

**Оцінка розміру скоупу** (`scope-size`, gzip): зараз uk 43,6 / en 34,5 KB. Клієнтські ns ч.5 ≈ 21 тис. символів (без тексту для моделі та серверних ns) × ≈ 0,88 B/символ ≈ +18–20 KB → **uk ≈ 62–64, en ≈ 48–50 KB**. Пороги (задача 12): ≤ 80 KB — один layout (рішення ч.4 у силі); 80–100 — розщеплення: `app/campaigns/[id]/dm/layout.tsx` з `CAMPAIGN_NAMESPACES + DM_NAMESPACES` (`ai`, `compendium`, `contentImport`, `scenario`, `abilityRegistry`, `rules`, `spellEditor`), верхній layout без них (вкладений провайдер не зливає повідомлення — DM-скоуп повний); > 100 — тест червоний, розщеплення обов'язкове.

## Рішення

1. **Текст для людини vs текст для моделі.** Людині — ключі й переклад на межі. Моделі (системні промпти `lib/ai/context/prompt.ts`, `title`/`description` тулів `lib/ai/tools/**`, `.describe()`, OpenAPI `summary`/`description`/`tag` у `lib/server/content/openapi.ts` і `operations.ts`, промпт AI-мапінгу `lib/server/content/import/ai-map.ts`, `AI_TOOL_OUTPUT_COMPACTED`, `run-signal`, плейсхолдер редагування секретів) — **англійською в коді, без ns**.
2. **Мова відповіді моделі.** Промпт англійський з рядком `Reply in ${languageName(locale)}.` замість «Відповідай українською». Обґрунтування: одна копія промпту без дрейфу між мовами; моделі однаково (або краще) слідують англійським інструкціям; тексти для моделі не UI (прецедент `.describe()` ч.3); мова відповіді явно задана. Ризик — зміна стилю українських відповідей; перевірка — ручний чат uk/en на prod-копії з ключем (рев'ю).
3. **Локаль на сервері асистента.** Чат (cookie-сесія): locale визначає маршрут **один раз на старті** (`getRequestLocale`) і кладе в `AiToolContext.locale`/`AssistantCaller.locale`; тули й дії не викликають `getRequestLocale` (виконання тулів у стрімі йде після повернення відповіді — контекст запиту ненадійний). MCP/Bearer: `verifyApiToken` додає в `select` `user.locale` (без зайвого запиту); `locale = negotiateLocale(cookie, Accept-Language) ?? user.locale ?? "en"`. REST-маршрути з Bearer (`resolveActor`) лишаються на `getRequestLocale` (→ `en`) — відкладено.
4. **Результати асистента** (`actionResult(domain, label)`, summary/warnings/`effects[].description` інтентів, handoff-причини `handoff-navigation.ts`, фолбек-імена цілей «Показ», помилки `ai-ops`) → ключі серверного ns `assistant` з `params`, переклад на межі дії `getTranslator(caller.locale, "assistant")`. `actionResult` приймає ключ підпису (`"assistant.results.campaign"`), не текст. Помилки `ai-ops` — `{ ok: false, error: TextRef }`; межа тулу перекладає в `ctx.locale`, маршрут застосування пропозиції — через `apiErrorJson` (ключ із каталогу).
5. **Що пишеться в БД.**
   - `assistant_intents.summary`/`preview`, системні частини `ai_proposals` — **текст у локалі автора на момент створення** (інтент належить одному `userId` і спливає; схему не міняємо). Наявні українські рядки лишаються.
   - Назви за замовчуванням, що стають контентом (нові розділи сценарію «Історія»/«Розділ 1», `DEFAULT_SCENE_LEGEND`, назва нового набору показу/карти/треду) — `t()` у локалі автора в момент створення (ч.3, рішення 2).
   - Вміст сценарію/показу, нотатки світу, журнал, відповіді моделі, `ai_proposals.summary` від моделі, імпортовані назви/описи (5etools/homebrew) — **контент, не перекладається і не отримує fallback-ів**.
   - `world_travel_log` — структурні поля (`kind`, `rest`, маркер); підписи — ключі `world.travel.kinds.*` на клієнті. Лог бою — ч.6.
   - `compendium_import_runs.report` — issue з `code` + `params`; повідомлення будує сервер на читанні (`compendiumReport.issues.<CODE>`), legacy-рядки без коду показуються як є (`t.has` = false).
6. **Серверні ns.** `SERVER_NAMESPACES = ["errors", "assistant", "compendiumReport"]`; тест: жоден `LocaleScope`/`CAMPAIGN_NAMESPACES` їх не вантажить, клієнтський граф імпортів не містить ключів із цими префіксами (розширення `client-api-errors`). Так тексти, що бачить лише сервер, не роздувають клієнтський скоуп.
7. **Помилки API.** Усі кириличні повідомлення помилок маршрутів скоупу (зокрема мапа помилок `lib/constants/compendium-import.ts`, помилки `lib/api/{decks,world}.ts`-fallback) → `API_ERRORS` + `errors.json`; ключі додає **лише задача 0** (інвентаризація `rg`), доменні задачі підключають. Тексти `uk` слово в слово.
8. **Zod і константи скоупу.** Повідомлення `lib/schemas/{world,show,scenario,ai}.ts` → `<ns>.validation.*` + `params`; клієнтський показ — `translateIssue(t, { message, params: issueParams(issue) })`. `.describe()` (`content-import.ts`, `ai.ts`) → англійською. `lib/constants/{scenario,world,ai,compendium-import}.ts` — підписи → id, UI бере ключі (`scenario.pageKinds.<v>`, `world.markerKinds.<v>`, `ai.modes.<v>`…), тест `label-keys-<ns>`; якщо підпис читає модель — їй віддається id або англійський текст.
9. **CSV-імпорт.** Підпис поля (`label`) → ключ `contentImport.fields.<kind>.<key>`; псевдоніми заголовків, слова «так/ні» і приклади з назвами (дані розбору, мають розпізнавати українські таблиці) переїжджають у `lib/constants/import-aliases.ts` (поза храповиком, приклади — `{ uk, en }` за локаллю шаблону). Issue `values.ts` → `contentImport.issues.*` + `params` через `translateImportReport`.
10. **Генератор героя.** AI-передісторія (`generate-backstory.ts`) — мовою автора запиту: `getRequestLocale()` у маршруті, промпт англійський «Write in ${languageName(locale)}», архетип — ключем (не `heroArchetype().name`). Офлайн-генератор (`lib/utils/characters/generate/{backstory,names}.ts`) — це **контент у локалі автора**, а не UI: додається `en`-набір таблиць (`backstory.en.ts`, `names.en.ts`, канонічні англійські імена HoMM V), `generateCharacter({ locale })` з `useLocale()`. Обґрунтування: результат пишеться в БД як біографія гравця, тож мова має відповідати мові автора; змішувати українську передісторію з англійським UI гірше, ніж мати дві таблиці контенту. Каталог поза храповиком (контент).
11. **Хвіст (а), `gameTerms`.** Окремий ns, а не «злиття файлу в `common` на льоту»: ns = файл (правило `MessageSource`), типи з `global.d.ts` без хаків, `renderWithIntl` явно вказує ns. Ключі `common.<subtree>` → `gameTerms.<subtree>` у всіх споживачах (≈ 25 статичних файлів + ≈ 45 динамічних `t(\`abilities.${k}…\`)`); динамічні ключі покриває `label-keys-gameTerms` по обох мовах.
12. **Хвіст (б), дублі.** До `common.actions.*` зводяться: `artifacts.{card.edit,sets.card.edit,form.editSubmit,form.editSaving,form.createSaving}`, `auth.{newPassword.saving,signUp.submitting}`, `characters.form.submitting`, `characterProfile.{actions.edit,tokens.delete,goals.delete,goals.cancel,notes.save,notes.cancel,classLevelUp.cancel,editor.cancel,editor.save}`, `inventory.{actions.edit,actions.remove,itemDialog.save,grant.back}`, `rules.form.{cancel,save}`, `spellEditor.effects.remove`, `common.{import.cancel,renameGroup.cancel,renameGroup.save}`. Лишаються (інша роль — заголовок, сегмент крихт, кнопка підтвердження): `common.breadcrumbs.segments.*`, `inventory.add.title`, `skillTree.editor.removeConfirm.confirm`. Список звіряє скрипт задачі 1 (значення = значенню в `common.actions`).
13. **Хвіст (в), HP-розкладка.** `getHeroMaxHpBreakdown` віддає `TextRef[]`: `characterProfile.sheet.heroHp.formula` (`{ archetype, baseLevels, hpPerLevel, conMod, conCoefficient }`, назва архетипу — ICU `select` за ключем, без вкладеного перекладу) і `characterProfile.sheet.heroHp.total`. Показ — наявний `useSheetLine`. `hero-scaling.ts` — у храповик; `hero-archetypes.ts` не змінюється.
14. **Хвіст (г), часова зона.** Просто й без міграції: клієнт пише cookie `TZ` (`Intl.DateTimeFormat().resolvedOptions().timeZone`) після монтування; `LocaleScope` і `request.ts` читають її (валідація `new Intl.DateTimeFormat("en", { timeZone })`), fallback `APP_TIME_ZONE`. Root layout cookies не читає (root-chrome — браузерна зона після монтування). Перший візит без cookie — `Europe/Kyiv`, далі — зона користувача; провайдер сервера й клієнта отримують однакове значення → без розбіжностей гідрації. Якщо реалізація зачіпає статичність сторінок — відкласти (запис у STATUS).
15. **Храповик.** Globs усього скоупу (і `hero-scaling.ts`) додає **задача 0 одразу** — як у ч.4. Обґрунтування: один автор `i18n-migrated.json` (паралельні задачі в одному worktree не правлять спільний файл); повний `pnpm lint` до кінця гілки не запускається (хуків/CI немає); кожна доменна задача перевіряє `eslint <свої шляхи>` — храповик уже діє на її файли, glob не можна «забути». Поза храповиком свідомо: `lib/utils/characters/generate/**`, `lib/constants/import-aliases.ts`, бойові константи.

## Тести

- По задачі: тести домену на ключі мока; `label-keys-<ns>.test.ts` для кожного реєстру/динамічного ключа (обидві мови); ≥ 1 `renderWithIntl({ locale: "en", namespaces })`; `parity` (ті самі ICU-плейсхолдери); `api-errors-coverage` для нових `API_ERRORS`; `lib/__tests__/client-entry-imports.test.ts` (хуки з Zod-моделлю — поза barrel-ами, які читають entry-чанки).
- Сервер: тест `assistant`-перекладу дії в `en` і `uk` (`vi.unmock` перекладача); MCP — `verifyApiToken` повертає `locale`, тул отримує `ctx.locale`; звіт компендіуму — `code` + `params` → текст, legacy-рядок як є.
- Задача 0: тест серверних ns; задача 1: замір root-чанка до/після; задача 12: `scope-size` з фактичними цифрами.

## Ризики

- **Сирий ключ** у компоненті, що рендериться поза `app/campaigns` (AI-компоненти в `app/settings/ai`; `gameTerms` у root-chrome) — задачі 0/1 перевіряють `rg` імпортів.
- **Стиль відповідей моделі** після англійського промпту — ручна перевірка.
- **Змішана мова до ч.6:** лог бою, бойові дії асистента, описи здібностей — прийнято.
- **Переклад тексту в момент створення** (інтенти, назви за замовчуванням) — після зміни мови старі рядки лишаються мовою автора; прийнято.

## Відкриті питання (користувач)

1. Промпти й описи тулів для моделі — англійською з `Reply in <мова>` (рішення 2): ок, чи лишати український промпт і лише параметризувати мову відповіді?
2. Офлайн-генератор: `en`-таблиці в ч.5 (задача 11) чи відкласти (тоді en-гравець отримує українські передісторії)?
3. Часова зона через cookie браузера (рішення 14) — достатньо, чи потрібне поле профілю `User.timeZone` (міграція) пізніше?
4. REST-маршрути з Bearer (не MCP) — мова з профілю власника токена теж (зараз `en`)?
