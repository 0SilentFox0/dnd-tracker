# WFRP 5g-0: інфраструктура шаблону Grim d100

Дата: 2026-11-09. Гілка `feat/wfrp` (не мерджити, WFRP off main до кінця епіку, див. [[feedback-wfrp-no-main]]).
Контекст: [research](../research/2026-11-03-wfrp-rule-system.md), [rule-systems.md](../../architecture/rule-systems.md) («Межі 5e-2», «Межі 5e-3», «Звірити з книгою»).

## Мета 5g і декомпозиція

5g наповнює офіційний шаблон «Grim d100» власним grimdark-d100 контентом (без тексту GW, англійська — основна мова, uk — переклад). Частини:

| Частина | Зміст |
|---|---|
| **5g-0 (цей spec)** | інфраструктура: `careers` і профіль виду в шарах/bundle/sync, формат `data/templates/grim-d100`, завантажувач, валідатор даних |
| 5g-1 | ядро персонажа: види з профілями, 16–24 кар'єри, таланти, навички, дефолти правил і таблиць |
| 5g-2 | бестіарій: юніти з characteristics і Traits |
| 5g-3 | магія й спорядження: лори, закляття, інгредієнти, зброя, броня, трапінги |
| 5g-4 | фініш: uk-переклад, іконки, приклади CSV, AI-контекст, whats-new/help, команда для prod |

5g-0 не пише реального контенту: лише фікстурний набір у тестах.

## Що перевикористовується (reuse before writing)

- Завантаження: `scripts/srd/lib/{load-template,run-load-template,data-files,template-store}.ts` (`ensureSrdTemplate`, `makeTemplateStore`, `importSrdData`, `withIcons`), `scripts/grim/empty-template.ts`. Узагальнюється, а не дублюється.
- Імпорт: `importContent` + `IMPORT_SPECS` (`careers`, `feats`, `units`, `spells`, `artifacts`, `races`), `OFFLINE_IMPORT_DEPS`; посилання по іменах (`ref`/`refList`).
- Шари: `layeredModels()` (`lib/db/layer/config.ts`) знаходить моделі з `XBase` автоматично; зразок міграцій — `20261124000001_feats_base_xp_cost_max_rank`, `20261128000000_artifacts_base_system_stats`.
- Профіль виду: `saveRaceProfile`, `listRaceProfiles` (`lib/server/races/race-profile.ts`), `SpeciesProfileSchema`/`parseProfile`.
- Ref-integrity: `lib/server/templates/sync/profile-refs.ts` (`isFeatUsedByRaceProfile`, `blockedByProfileWarning`), `profileReferences` (`lib/server/races/profile-usage.ts`), `assertCampaignRefs`, `CAREER_IN_USE`/`CAREER_IN_SPECIES_TABLE` у `resources/careers.ts`.
- Публікація: `publishTemplate`, `publishTemplateVersion` (ітерує `BUNDLE_TABLES`), `bumpContentVersion`.
- Нове лише там, де наявного немає: `CareerBase`, крок «профілі видів» у завантажувачі, валідатор даних (cross-ref перевірки по імпорт-рядках; готового немає).

## Дизайн

### 1. Дані й міграція

- `Career`: додати `sourceId`, `sourceHash`, `@@index([campaignId, sourceId])`. Нова модель `CareerBase` за зразком `FeatBase`.
- Міграція одна, expand-only: ADD COLUMN, `CREATE TABLE career_base` з `ENABLE ROW LEVEL SECURITY`, індекси. Додати до переліку міграцій «WFRP: чекліст перед деплоєм епіку» в `docs/STATUS.md`.
- Реєстрація `careers`: рядок `table("careers","Career","career")` у `BUNDLE_TABLES`, ключ у `SYNC_TABLE_SCOPES`, `layeredModels` (автоматично), `publishTemplateVersion`, `export-campaign`, `import-bundle`, `assert-no-leak`, `sync/{classify,apply,layered-apply,context}`, тестові `fake-db.ts` і `bundle-columns.test.ts`.
- Профіль виду лишається в таблиці `race_profiles` (без `id`/`sourceId`/base). У bundle він — вкладене поле `profile` рядка `races`: експорт читає з `race_profiles`, імпорт і sync пишуть назад логікою `saveRaceProfile`, хеш рядка виду (`races`) включає профіль, тож зміна профілю в шаблоні — зміна виду для sync. Видалення виду каскадує профіль, як і досі.

### 2. Ref-integrity у sync

- Кар'єра, на яку посилається `careerTable` профілю виду або яку тримає герой, не видаляється sync-ом: пропуск видалення + попередження (розширення `blockedByProfileWarning`, `deleteRemoved`, `applyItem`).
- Талант, на який посилається `tiers[].talents` кар'єри чи профіль виду, поводиться так само (зараз покрито лише профіль виду).
- Після sync перевірка: профіль не містить `careerId`/`featId` неіснуючих рядків; інакше попередження в результаті sync (дані не змінюються мовчки).
- `detachRefs`/`DetachKind` не розширюються: посилання JSON, не колонки.

### 3. Формат шаблону і завантажувач

- `data/templates/grim-d100/<kind>.json`: масиви import-рядків (`races`, `careers`, `feats`, `units`, `spells`, `artifacts`) плюс `manifest.json` (ім'я, ліцензія/credits, counts). Крос-посилання по іменах.
- Додаткові файли: `race-profiles.json` (профіль за іменем виду, посилання на кар'єри/таланти по іменах), `rules.json` (пресет і таблиці поверх `WFRP_RULES`), `artifact-stats.json` (`system_stats` за іменем артефакту; чи окреме поле в import-рядку, уточнює plan за `IMPORT_SPECS`).
- Завантажувач: `loadSrdTemplate` отримує параметр «опис шаблону» (перелік видів + додаткові кроки), SRD залишається з поточною поведінкою без змін. Для Grim: `ensureSrdTemplate` → `importContent` за видами → профілі видів → rules/tables → `bumpContentVersion` → `publishTemplate`. Ідемпотентний (`mode:"update"`).
- Нова команда `constructor:grim-template` (за зразком `constructor:srd-template`, `--owner`, `--allow-remote`); `constructor:empty-grim-template` лишається до 5g-4 (рішення про назву й заміну).
- Валідатор даних (юніт-тест, запускається і завантажувачем перед записом): zod на рядок за схемою ресурсу, унікальність імен, усі посилання (`careers → feats`, профіль → `careers`/`feats`, `units` → traits) резолвляться.

### 4. Поза 5g-0

Остаточна назва шаблону (вибирає користувач; працювала «Grim d100»), uk-overlay (`TABLES` у `localize-srd-bundle.ts` розширяється в 5g-4), іконки, приклади CSV, AI-контекст, whats-new/help.

## Тестування

- Юніт: sync для `careers` (new/changed/removed/conflict), захист посилань (кар'єра в профілі, талант у tier), профіль як частина хеша виду; валідатор даних на хороших і зламаних фікстурах.
- Інтеграційний (локальна БД `wfrp`): фікстура → шаблон → publish → clone кампанії → sync після зміни шаблону → ref-warnings.
- Регрес homm/dnd5e: наявні sync/bundle/layer тести (`pnpm test:related`); повний `test:run` і `battle-sweep` — у pre-deploy гейті епіку, не в цій частині.

## Обмеження й ризики

- Нова таблиця має RLS; міграція expand-only; перелік міграцій епіку в STATUS оновити.
- Не піднімати scope-size і OpenAPI-бюджет (195000) без виміру й запису; 5g-0 нових маршрутів і uk-текстів майже не додає, виміряти в plan.
- Хеш виду з профілем змінює `sourceHash` усіх наявних видів лише в wfrp-кампаніях (там профілі існують); для d20-видів `profile` відсутній, тож хеш не змінюється. Перевірити тестом, що хеші homm/dnd5e видів стабільні.
- Кар'єри з наявних wfrp-кампаній не мають `sourceId`: працюють як локальні рядки, як і інший локальний контент.

## Відкрито для plan

- Точне місце вкладення `profile` у bundle-рядку `races` і порядок import (вид має існувати до профілю; кар'єри й таланти до профілю).
- Чи `system_stats` артефакту проходить через `IMPORT_SPECS`, чи окремим кроком.
- Тайм-аут транзакції publish для великих наборів (SRD: ~7 хв, 120 с tx).
