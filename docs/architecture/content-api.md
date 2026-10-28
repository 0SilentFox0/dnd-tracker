# API контенту (REST, OpenAPI, MCP)

Спека: `docs/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md` (етап 2 «Конструктора кампаній»).

Контент кампанії можна змінювати з UI, через REST з токеном і через MCP. Усі три шляхи проходять через одні й ті самі Zod-схеми, сервіс і перевірки прав. До контенту належать раси, юніти, заклинання, школи магії, основні скіли, скіли, артефакти, сети, треки музики, класи (`classes`), риси (`feats`), а також правила кампанії й дерева скілів.

## Шари

- **Реєстр ресурсів** — `lib/server/content/resources/*.ts`, `CONTENT_RESOURCES`. Опис ресурсу — `ContentResource` (`define-resource.ts`):
  - `kind`, `label`, `description`, `path`, `idParam`;
  - `schemas` — `create`, `update`, а також `query?` і `apiCreate?` для документа;
  - `access` (`member` | `dm`) для `list`/`item`;
  - `invalidates` — кеш-теги;
  - `listFields` — короткі поля для `content_list`;
  - `errors?` (409/422);
  - функції `list`/`find`/`create`/`update`/`remove`/`removeAll?`/`toItem?`.
- **Нестандартні операції** — `lib/server/content/operations.ts`, `CONTENT_OPERATIONS`: правила, експорт, дерева скілів, дублювання скіла, імпорт юнітів, порядок треків, видалення заклинань за рівнем, каталог здібностей та інші. Кожна операція має `method`, `path`, `need`, `tag`, `body?`, `query?`, `response`. `id` дорівнює ключу.
- **Сервіс** — `lib/server/content/service.ts` (`listContent`/`getContent`/`createContent`/`updateContent`/`removeContent`/`removeAllContent`):
  - кожна функція спершу викликає `assertCan(actor, need)` (`access.ts`);
  - пошук завжди за `{ id, campaignId }`, запис іншої кампанії = 404;
  - відповіді `create`/`update` проходять через `toItem`, тож форма та сама, що в `GET`;
  - після запису скидаються теги `invalidates`.

  Правила (`lib/server/campaigns/rules.ts`) і дерева скілів (`lib/server/skills/skill-tree-service.ts`) — окремі сервіси з тією ж перевіркою прав.
- **Актор** — `lib/utils/api/actor.ts`: `{ campaignId, userId, isDM, via: "session" | "token", scopes }`. `scopes` = `null` для сесії, права токена для Bearer.
  - `resolveActor`: за наявності `Authorization: Bearer` діє лише токен, без відкату до cookie. Недійсний токен → 401; інша кампанія, немає права або `sessionOnly` → 403. Через токен актор = ДМ.
  - Потреби — пресети `NEED` у `lib/utils/api/need.ts`: `read(access)`, `write`, `writeAll` (лише сесія).
- **Роути** — `lib/utils/api/content-routes.ts`:
  - `collectionRoutes(r)` → `GET`/`POST`/`DELETE` (масове видалення, лише сесія);
  - `itemRoutes(r)` → `GET`/`PATCH`/`DELETE`;
  - `operationRoute(op, fn)` бере `need` з реєстру, сам парсить `op.body` і передає `{ actor, params, req, body }`.
  - `route.ts` — один рядок. `ContentError` перетворюється на `{ error, issues? }`.
- **Права токена** (`lib/constants/ai.ts`): `ai`, `content:read`, `content:write`. `content:write` включає `content:read`. Права задаються при створенні токена на `/dm/ai` і потім не змінюються. На шаблоні доступні лише права на контент.

## OpenAPI

`GET /api/openapi.json` — публічний документ OpenAPI 3.1 (~100 КБ), статичний (`force-static`, `s-maxage`).
- Його будує `lib/server/content/openapi.ts` з обох реєстрів.
- Тіла запитів — ті самі Zod-схеми через `toJsonSchemas` (`json-schema.ts`, локальний реєстр Zod). Спільні підсхеми підставляються через `$ref`: здібність, тригер, умова, кожен вид ефекту, `SpellFx`, `WeaponStats`, `RulesetPatch`. Спільні схеми 4f-2: `Formula`, `Flat`, `Amount`, `ArmorStats`, `ClassColumn`.
- Помилки й успішні відповіді винесені в `components.responses`.
- Кожна операція має `x-scopes`. Операції `sessionOnly` в документ не входять.
- Тест звіряє кожен шлях документа з наявним `route.ts`.

## MCP-інструменти контенту

`lib/ai/tools/content.ts`. `/api/mcp` реєструє лише інструменти, дозволені правами токена (`toolsFor(scopes)`). Чат усередині застосунку має тільки `ai` і цих інструментів не бачить.

| Інструмент | Право |
|---|---|
| `content_kinds`, `content_schema`, `content_list`, `content_get`, `get_rules`, `get_skill_tree`, `source_diff` | `content:read` |
| `content_create`, `content_update`, `content_delete`, `update_rules`, `save_skill_tree`, `source_apply`, `content_import` | `content:write` |

- `content_schema({ kind, op, effectKind })` (`lib/server/content/tool-schemas.ts`) віддає самодостатню JSON Schema з `$defs`. Здібності й ефекти замінено заглушками з підказкою; вони запитуються окремо: `kind: "abilities"`, а потім `effectKind`. Тож кожна відповідь вміщається в `AI_LIMITS.toolResultChars` (24 000; найбільша — ефект `flag`, ~14 КБ).
- `source_diff({ scope?, offset?, limit? })` / `source_apply({ apply, ignore })` — оновлення кампанії з джерела (шаблону). `source_diff` повертає сторінку: `items`, `total`, `offset`, `counts` (за scope), `nextOffset` (`null` — кінець); `limit` за замовчуванням 20 (макс. 50) і сам зменшується, щоб сторінка вмістилась у `toolResultChars`. Посилання в `apply`/`ignore` — `{ scope, key, sourceHash, status }`: якщо хеш джерела або статус пункту змінились після diff — 409 «Джерело змінилося». `scope` — таблиця вмісту, `rules` або `settings` (інакше 400). Apply виконується під блокуванням рядка кампанії.
- `content_list` повертає до 50 записів (`id`, `name`, `listFields`) і `total`, сторінки — через `offset`.
- Помилки валідації повертаються агентові текстом `шлях: повідомлення`. Інші помилки — загальним текстом, без сирих повідомлень БД.
- Масового видалення й експорту бандла в MCP немає; масовий імпорт — `content_import`. Бекап — `GET /export` з `content:read`.

## Як додати новий вид контенту

1. Схеми в `lib/schemas/<домен>.ts`.
2. Ресурс `lib/server/content/resources/<вид>.ts` (`defineResource`) і рядок у `CONTENT_RESOURCES`.
3. `route.ts` колекції й запису: `export const { GET, POST } = collectionRoutes(r)` / `itemRoutes(r)`.
4. REST, OpenAPI і MCP (`content_*` з новим `kind`) з'являються автоматично. Тести реєстру й документа перевірять шляхи.

Нестандартна дія — рядок у `CONTENT_OPERATIONS` + `operationRoute` у `route.ts`. Для MCP за потреби — окремий інструмент у `content.ts`.

## Правила

- `campaignId` береться лише з актора або токена, ніколи з тіла запиту. Посилання в тілі (раса, група, сет, скіли, заклинання) перевіряються на належність кампанії (`assertCampaignRefs`).
- Права перевіряються в сервісі (`assertCan`), а не лише в HTTP-шарі. Новий шлях до контенту (інструмент, скрипт) ходить через сервіс.
- Окремих «API-схем» немає: UI, REST, OpenAPI і MCP використовують одні схеми з `lib/schemas`.
- Кожен запис через сервіс скидає кеш-теги свого виду. `revalidateTag` діє лише в межах життя обробника роуту: `/api/mcp` для POST дочитує SSE-відповідь `mcp-handler` до кінця перед поверненням, інакше інструмент виконується вже після повернення `Response` і скидання кешу губиться.

## Класи (етап 4c-1)

Ресурс `classes` (`lib/server/content/resources/classes.ts`, модель `GameClass`, таблиця `classes`): `hitDie`, `savingThrows`, `proficiencies`, `skillChoices`, `caster` (`none|full|half|third|pact`), `spellcastingAbility`, `features [{ level, abilities }]`, `subclassLevel`, вкладені `subclasses [{ id, name, features }]` (id підкласів стабільні, синхронізація оновлює рядок цілим записом). REST/OpenAPI/MCP, кеш довідника, бандл і синхронізація з джерела — автоматично з ресурсу.

- **Видалення** використаного класу (є персонаж з `classes[].classId`) → 409 `CLASS_IN_USE` (`lib/constants/api-errors.ts`). Синхронізація видаляє рядки напряму, тож персонажі з видаленим класом просто пропускають запис у розрахунках.
- **Відповіді** (`list`/`toItem`) нормалізуються через `toGameClassData` (`lib/utils/characters/classes/row.ts`): клієнтські хуки отримують `GameClassData` без `campaignId`/`sourceId`.
- **Бандл**: таблиця `classes` необов'язкова — старі бандли імпортуються без неї.
- Правила: `rules.classes { enabled }`; без нього ресурс доступний, але персонажів із `classes` сервер не приймає (422).
- **Колонки таблиці класу (4f-2)**: `columns` — `ClassColumn { key, label, values[20], pool? }`, міграція `20261101000000_class_columns` (лише додає колонку). Zod перевіряє посилання `scale`/`pool` вмінь на колонки; оновлення без `columns` перевіряється за збереженою таблицею — `CLASS_COLUMN_UNKNOWN`.

## Заклинання й зброя 5e (етап 4c-2)

- **Заклинання** (`spells`): додаткові поля `dieSides` (грань кубика; порожнє = d6 у 5e, HOMM поле ігнорує), `upcastDice` (кубики на крок підсилення), `upcastTargets` (цілі на крок), `addAbilityMod` (додавати модифікатор характеристики до шкоди); `dice` до 40 (`SpellDiceSchema`); `resolution` приймає `attack` (кидок проти AC). Міграція `20261028000000_spell_5e_dice` — лише додає колонки. У HOMM-заклинань поля порожні, поведінка не змінюється.
- **Зброя** (артефакти слота зброї і `attacks` юніта): `traits` — масив із `light|finesse|twoHanded|versatile|reach|thrown|ammunition` (в артефакті зберігається модифікатором `traits`), `versatileDice` — кубик двома руками для `versatile`; `properties` — вільна примітка. Форми: чекбокси `WeaponTraitsField`.
- Правила: `rules.criticals.doubleDice` (за замовчуванням `false`).
- **Броня артефакта (4f-2)**: `armor` — `ArmorStats { category, base, dexCap?, strength?, stealthDisadvantage? }`, лише слот `armor` (`ARMOR_SLOT_ONLY`); зберігається записами в `modifiers` з типами `ArmorModifierType`; імпорт/експорт поля `armor`, OpenAPI `ArmorStats`.
- **Предмети артефакта (4f-3)**: поле `item` — `ItemStats { unique?, property?: { appliesTo: { kinds, attackType?, armorCategories?, bases? (≤ 60 назв) }, nameTemplate? ({base}, {name}), overrides? }, attunement?, charges?: { max 1–50, rest: short|long|null }, consumable? }`, запис `modifiers` типу `itemStats` (JSON), `null` у PATCH прибирає; відмови `ITEM_PROPERTY_SLOT`, `ITEM_PROPERTY_STATS`, `ITEM_CONSUMABLE_CONFLICT`; `weapon.damageBonus` (−20…20); імпорт/експорт поля `item`, OpenAPI `ItemStats`. Дії сховища: `grant { artifactId, baseId?, quantity? }`, `attune`/`unattune { ref }` (відмови `ITEM_PROPERTY_NEEDS_BASE`, `ITEM_BASE_MISMATCH`, `ATTUNEMENT_LIMIT`, `ATTUNEMENT_NOT_REQUIRED`, `ALREADY_ATTUNED`, `ITEM_NOT_ATTUNED`, `ITEM_NOT_HELD`, `ITEM_ALREADY_IN_STASH`, `ITEMS_DISABLED`); міграція `20261102000000_inventory_attuned`.

## Монстри 5e (етап 4e)

- Поля юніта: `cr` (0, 0.125, 0.25, 0.5, 1–30; `null` — HOMM), `xp` (`null` — з таблиці CR), `multiattack` (1–10), `legendaryActions` (0–5), `legendaryResistances` (0–10), `saveProficiencies` (ключі характеристик). Міграція `20261030000000_unit_5e` лише додає колонки.
- `proficiencyBonus` юніта (`resolveUnitProficiency`): не задано — таблиця CR, коли є `cr`, інакше 2; явний 0 — запасний варіант за рівнем (tier). Однаково для JSON-імпорту й створення.
- Шкода атаки при `cr`: рушій 5e сам додає модифікатор СИЛ/СПР, тож кістки зі статблока, де він уже враховано («2d6+4»), порахують його двічі — вказуйте кістки без модифікатора.
- Синхронізація із джерелом: збережені базові хеші рядків обчислені без нових колонок юніта, тож після деплою юніт, змінений лише в джерелі, показується як `conflict`, а не `updated` (`pairStatus`, `b` не збігається ні з однією стороною). Це властиво будь-якій міграції з новими колонками; юніти без змін з обох боків не зачеплені.
- Бандл, синхронізація, OpenAPI і MCP — автоматично; правила — `rules.encounters`.

## Риси й вибори (етап 4f-4)

- Вид `feats` (`/feats`, `featId`): `name`, `icon?`, `type` (`origin | general | fightingStyle | epicBoon`), `prerequisite { level?, scores?: { abilities, min }, text? }`, `repeatable`, `description?`, `abilities`, `choices` (без виду `feat`). Видалення риси, яку тримає герой (у `feats`, `raceChoices` чи `classes`), — 409 `FEAT_IN_USE`. Кеш — `ReferenceKind.FEATS`; бандл/синхронізація — таблиця `feats` після `classes`.
- `Choice` — спільна схема OpenAPI (`$ref`); поля `races.choices` (лише числова кількість, ≤ 1 `lineage`; `options[].spells[].spellId` — id заклинання), `features[].choices` класів і підкласів (кількість `{ scale }` — колонка таблиці класу; id виборів унікальні в межах класу й кожного підкласу), `classes.spellList` (тег списку), `spells.lists` (≤ 20 тегів).
- Імпорт: поле `ImportField.nestedRef { kind, key }` для JSON-колонок — `resolveNestedRefs` замінює назви на id у властивості `key` будь-якої глибини (раса: `{ kind: "spells", key: "spellId" }`), експорт CSV повертає назви. Порядок шаблону SRD: spell-groups → spells → races → classes → feats → units → artifacts.
- `PUT /api/campaigns/{id}/characters/{characterId}/choices` (сесія, поза OpenAPI): `{ raceChoices?, feats?, classChoices?: Record<classId, Picks> }` → персонаж; відмови `CHOICE_*`, `FEAT_*`, `SKILL_NOT_ALLOWED`, `EXPERTISE_NEEDS_PROFICIENCY`, `SPELL_NOT_IN_LIST`, `ABILITY_SCORE_CAP`, `CHOICES_NEED_CLASSES`, `ORIGIN_FEAT_ONLY_ONE`, `DM_FEAT_ONLY_DM` (422/403) з `issues [{ path, code, message }]`. Створення персонажа приймає `raceChoices`, `feats`, `classes[].choices`; level-up — `choices`; чернетка гравця — `choices { raceChoices?, feats?, classChoices? }`.
- Міграція `20261103000000_choices_feats`.

## Імпорт і експорт (етап 4f-0)

Масове перенесення контенту з CSV/TSV/JSON для `units`, `spells`, `skills`, `main-skills`, `spell-groups`, `races`, `classes`, `artifacts`, `artifact-sets` (треки — ні).

- **Реєстр полів** — `lib/utils/content/import/fields/` (`IMPORT_SPECS`, без `server-only`): ключ (= ключ тіла create; у `skills` плоскі, вкладає `toBody`), підпис колонки, синоніми, тип (`string|int|number|bool|enum|list|dice|cr|ref|refList|json|attacks|abilitiesText`), посилання, обов'язковість, два приклади. Синоніми юнітів покривають заголовки старого CSV-імпорту (`docs/units/units-all.csv` дає ті самі дані), «Спасброски» не зіставляється; юніт без колонки «Майстерність» і без CR отримує майстерність за рівнем.
- **Ядро** — `lib/utils/content/import/`: `parseTable` (`csv-parse/browser/esm/sync`: BOM, рядок `sep=`, автороздільник `;`/`\t`/`,`, лапки з переносами; JSON — масив або об'єкт), `autoMap` (ключ/підпис/синоніми без регістру; `_` = пробіл, `’` = `'`), `applyMapping` (кілька колонок здібностей з'єднуються «. »), `coerceRecord`/`parseFieldValue` (ідемпотентні), `toCsv`/`recordToCells` (BOM, `;`, посилання — назвами, вкладене — JSON, списки з комою в назві — через « | »).
- **Правила значень**:
  - Необов'язкове поле, яке не розібралося, дає попередження, і поле відкидається; помилка рядка — лише для обов'язкових. Прочерки (`-`, `—`) у нетекстових полях — порожньо.
  - Необов'язкове посилання на невідомий запис — попередження і `null`; у режимі `update` таке поле пропускається (не затирає).
  - CR розбирається з початку клітинки (`1/4 (50 XP)`, `CR 5`); зіпсовані Excel дати (`01.апр`, `1-Apr`) — не CR (попередження). В експорті CR — десяткове (`0.25`), щоб Excel не робив дату.
  - Захист формул Excel: у експорті клітинки, що починаються з `= + - @`, табуляції або CR (крім простих чисел), а також з `'` перед такими символами, отримують `'` попереду; імпорт знімає один такий `'`.
  - Кодування: спершу строгий UTF-8, інакше windows-1251 (`decodeImportBytes`).
- **Сервер** — `importContent` (`lib/server/content/import/import-content.ts`): `assertCan(write)`; усі рядки перевіряються до першого запису (назва, дублі у файлі, режим, посилання за назвою без регістру або точним id, Zod create/update ресурсу); валідні пишуться по одному через `resource.create/update` (без однієї транзакції — ресурси пишуть через Storage й каскади), помилка рядка не зупиняє решту; кеш довідника — один раз. Режими: `create` (дубль — помилка), `update` (за назвою; порожні клітинки не змінюють поле; `refList` з опечаткою не розриває зв'язки), `skip`. `dryRun` нічого не пише. До 500 рядків за запит (`IMPORT_LIMITS`); клієнт ділить: перевірка по 500, запис по 100 і ≤ 3 МБ.
- **API**: `POST /content-import/{kind}` (`content.import`, `content:write`), `GET /content-import/{kind}/example.csv` (`content.import-example`) і `GET /content-export/{kind}` (`content.export`) — `content:read`, `text/csv`, ім'я файлу `<kind>.csv` — із `Content-Disposition`. `POST /units/import` лишився як був (старий формат, `createMany`).
- **MCP** `content_import(kind, rows, mode, dryRun)` (`content:write`) — стислий звіт (`compactImportReport`): `counts` + рядки з помилками/попередженнями, кількість зменшується, доки відповідь вміщається в `AI_LIMITS.toolResultChars`.
- **AI-мапінг** — `GET/POST /content-import/{kind}/ai-map` (лише ДМ із сесії, не в OpenAPI): `pickDmTextModel` + `generateObject`, відповідь лише з відомими колонками й полями; без ключа — 409 `IMPORT_AI_NO_KEY`; ліміт `AI_PLAYER_RATE_LIMIT`.
- **UI** — `ContentTransferButtons` («Імпорт» + «Експорт CSV») на сторінках бібліотеки ДМ; майстер `ContentImportWizard` (файл → колонки → перевірка → підсумок, лінивий чанк), мапінг запам'ятовується в `localStorage` за набором заголовків, звіт помилок — CSV. Хук `useContentImport` (`lib/hooks/content-import`).
- **Дерева скілів** — JSON `{ format: "skill-tree/1", race, skills, names }` (`lib/utils/skills/tree-transfer.ts`): експорт додає назви використаних основних скілів, скілів і груп заклинань, імпорт замінює чужі id за назвою й видом (невідомий `spellGroupId` відкидається з попередженням) і зберігає через `skill-trees.save`; перезапис наявних дерев — після `useConfirm` (кнопки на сторінці дерев, `useSkillTreeTransfer`).
- Обмеження: XLSX — лише через «Зберегти як CSV»; `raceModifiers` заклинань — id (між кампаніями правити вручну); іконки — посилання (data URL у CSV не підтримуються).

## Шаблон SRD 5.2 (етап 4f-1)

Офіційний шаблон «5e SRD 5.2» збирається з файлів у репо, без мережі.

- **Конвеєр** — `scripts/srd/`: `lib/source.ts` (Open5e `open5e/open5e-api`, тека `data/v2/wizards-of-the-coast/srd-2024`, SHA `e69ac13b…`, 17 файлів з md5), `lib/fetch.ts` (завантаження в tmp з перевіркою md5), `convert/*.ts` (чисті функції: рядок Open5e → рядок імпортера 4f-0), `overrides/*.ts` (ручні таблиці за `slug`: заклинання — сторона/цілі/баффи, вміння класів, раси, монстри). `pnpm srd:build` пише `data/templates/srd-5.2/{spell-groups,spells,races,classes,units,artifacts}.json` + `manifest.json` (SHA, дата, лічильники, credits). Кожен рядок має `slug` для майбутніх мовних накладок; імпортер його не отримує. Тест цілісності (`scripts/srd/__tests__/data-integrity.test.ts`) проганяє всі файли через `importContent` з `dryRun` без помилок і попереджень.
- **Унікальність slug** — лише в межах виду: `srd-2024_shield` є і заклинанням, і артефактом. Мовні накладки мають ключуватися парою `(kind, slug)`, не самим `slug`.
- **Завантажувач** — `pnpm constructor:srd-template [--owner <userId>] [--allow-remote]`: знаходить або створює офіційний шаблон, пише пресет правил (`scripts/srd/lib/rules-preset.ts`: усі механіки 5e увімкнено, мораль вимкнено, `initiative 0–20`, баланс `xp` 2024) і `credits`, потім `importContent(mode: "update")` у порядку `spell-groups → spells → races → classes → units → artifacts`; exit 1, якщо є помилки рядків. Повторний запуск оновлює за назвами. Кеш Next скрипт не інвалідовує (`ImportDeps.invalidate` = no-op) — довідник оновиться протягом `REFERENCE_REVALIDATE_SECONDS`.
- **Обсяг** — 8 шкіл (значок і колір), 339 заклинань (137 з ефектами), 9 рас, 12 класів з підкласами (механізовано 51 із 284 вмінь класів), 331 монстр, 51 артефакт (38 видів зброї, щит і 12 обладунків); що механізовано, а що лишається описом/нотаткою — спек §4f-1 «Контент». Монстри — без раси (тип, чуття, мови, режими руху — нотатка «Statblock»), `gridSize` gargantuan = 3, `level = ⌈CR⌉`.
- **Атрибуція** — `campaigns.credits` (текст, міграція `20261031000000_campaign_credits`): бандл (`Bundle.credits`), створення з шаблону, «оновлення з джерела» (копіюється, коли відрізняється); показ лише для читання — картка шаблону, банер шаблону, налаштування кампанії «Джерела й ліцензії».
- **Іконки** — сторонніх наборів немає. Заклинання без іконки показують значок школи в її кольорі (`SpellIcon`; ключі `shield|portal|eye|heart|flame|mask|skull|vortex` поруч із 5 ключами HOMM5). `pnpm assets:attach <campaignId> <тека> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official]`: ім'я файлу = назва контенту або `slug` рядка даних SRD (з префіксом `srd-2024_` чи без); нормалізація без регістру й пунктуації (`_`, `-`, `:`, апострофи, повторні пробіли → пробіл), суфікси варіантів `A1`/`2`/`v3` відкидаються, із кількох варіантів — перший, завантаження в бакет виду (`<campaignId>/<kind>/<назва>-<sha1>.<ext>`, `cacheControl` рік), прив'язка через `importContent(update)` (юніт — `avatar`, решта — `icon`), звіт без пари. Офіційний шаблон — лише з `--allow-official` (власні AI-іконки; токени Forgotten Adventures — ніколи).
- **4f-2**: 12 обладунків; колонки таблиць класів з пулами (Focus, Sorcery Points, Channel Divinity, Lay on Hands) і додатковими колонками (Action Surge, Divine Spark); 37 механізованих умінь класів. Завантажувач замінює назви шкіл у `school` на id груп кампанії (ручний імпорт `classes.json` через UI лишає назву — бонус школи не спрацює).
- **4f-3**: джерело `MagicItem.json` (md5 у `OPEN5E_FILES`), спорядження `unique: false`, 32 властивості (31 сімейство варіантів + Dragon Slayer; назви складаються з повної назви бази, перевірка 513 варіантів у `pnpm srd:build` нормалізує слово «Armor»), 248 унікальних (244 + 4 зілля лікування з `Item.json`), неунікальні всі, крім Dragon Orb; регулярки механізації — `scripts/srd/convert/magic-items.ts`.
- **4f-4**: джерела `Feat.json`/`FeatBenefit.json` (md5 у `OPEN5E_FILES`), 17 рис (`convert/feats.ts`, механіка — `overrides/feats.ts`), вибори рас (`convert/race-choices.ts`: таблиці, жирні абзаци, список; 24 опції, 22 заклинання назвами → `nestedRef`), 101 вибір класів (`convert/class-choices.ts`, `overrides/class-choices.ts`; синтетична колонка `metamagic`), `Spell.classes` → `lists`, `spellList` = назва класу для 8 заклиначів.

## Оновлення з джерела (етап 3)

Спека: `docs/superpowers/specs/2026-10-21-constructor-stage3-source-sync-design.md`. Кампанія або шаблон з `createdFromId` (його пише лише сервер: клон шаблону, «Зберегти як шаблон», скрипт офіційних шаблонів; JSON-імпорт — ні) порівнює себе з джерелом і вибірково бере зміни.

- **Стан** — `campaign_source_syncs` (рядок на кампанію): `baseline` = хеші версії джерела, з якою синхронізовані (`tables[таблиця][sourceId]`, `rules[механіка]`, `settings`), `ignored` = версія джерела, яку ДМ проігнорував (або `"deleted"`). Пишеться в `createCampaignFromBundle` при клонуванні і після кожного apply. Кампанія без рядка — запасний baseline з `sourceId`/`sourceHash` рядків.
- **Ядро** — `lib/server/templates/sync/` (без `server-only`, тож доступне tsx-скриптам): `context.ts` (джерело + ціль + стан, перевірка доступу до джерела `canReadSource`), `classify.ts` (S/B/L: хеш джерела, baseline, локальний рядок у просторі id джерела → `new`/`updated`/`conflict`/`deletedInSource`/`deletedLocally`), `apply.ts` (замикання залежностей `requires`, перестановка id через `remapIds`, `createMany`/`update` у порядку FK, видалення у зворотному, перенесення ключа прогресу дерева скілів, `assertNoLeak` + чужі id → 422, оновлення baseline/ignored), `diff.ts` (відповідь без повних рядків + `usage` для видалених у джерелі), `state.ts`, `service.ts` (`assertCan`, транзакція з `SELECT … FOR NO KEY UPDATE` на рядку кампанії, `invalidateReference`).
- **API** — `GET/POST /api/campaigns/[id]/source-sync` (`source.diff` — DM + `content:read`, `?scope=`; `source.apply` — `content:write`, тіло `{ apply, ignore }` з `{ scope, key, sourceHash, status }`; 409 — джерело або статус змінились). MCP: `source_diff`/`source_apply`.
- **Перевірка вживу** — `scripts/constructor/source-sync-check.ts <templateId> <userId>` (клон → зміни в шаблоні й клоні → diff → apply → порожній diff, паралельний apply → один 409; усе прибирає) і `--diff-only <campaignId>`.
- **UI (3b)** — кнопка «Оновлення з шаблону» в налаштуваннях кампанії і «Оновлення з джерела» в банері шаблону (лише ДМ і лише з `createdFromId`) відкриває `SourceSyncDialog` (`components/campaigns/templates`): групи за scope, галочки за замовчуванням лише для `new`/`updated`, «Також буде додано» (транзитивні `requires`), підтвердження видалень і «Ігнорувати», після 409 — примітка й свіжий список. Шари: `lib/api/source-sync.ts` → `lib/hooks/campaigns/useSourceSync.ts` → чиста логіка `lib/utils/campaigns/source-sync.ts`. Diff запитується лише при відкритому діалозі.
- Обмеження: персонажі, бої й сценарій не синхронізуються; у «Змінено: …» — назви колонок без перекладу; id наявних записів не змінюються; файли треків у Storage не видаляються; ключі JSON-об'єктів не перекладаються (як і в `importBundle`).

## Монстри й площі (етап 4f-5a)

- `units.statblock` — тип/розмір/світогляд, чуття (дальності у футах), рух (`fly`, `swim`, `climb`, `burrow`, `hover`), мови, телепатія й `lairResistances`. `units.spellcasting` — характеристика, СК, бонус атаки та `spells [{ spellId, perBattle?, recharge?, castLevel?, dc?, attackBonus?, legendaryOnly? }]`. `recharge` має поріг 4/5/6; обмеження діють у межах бою.
- `spells.fixedDice` і `damageBonus` — сталі кубики й додаткова шкода. Шаблон площі підтримує точне коло (`exact`) й `emanation`. Міграція `20261104000000_monster_5e_full` лише додає колонки; відсутні поля зберігають стару поведінку.
- CRUD, CSV/JSON імпорт/експорт, бандл, клон і source sync передають ці поля; `spellId` у грантах і `perform` remap-иться разом з іншими посиланнями, перевіряється належність кампанії; повтори `spellId` у грантах відхиляються спільною схемою, зокрема після розв’язання назв при імпорті. REST, OpenAPI та MCP використовують спільні схеми; поріг розміру OpenAPI — 145 000 символів із дедуплікацією `$ref`.
- SRD-конвертер створює **149 Monster Actions**, разом **488 заклинань, 331 юніт і 9 груп**. Парсер дій із рятівним кидком генерує заклинання з фіксованими кубиками й грантом; Spellcasting і легендарні дії отримують посилання. Повний SRD-текст залишається в описах; нерозпізнана механіка — текстові нотатки. `N/Day` і відновлення після відпочинку трактуються як ліміт на бій; Recharge — кидок на початку ходу. Завантажувач імпортує групи → заклинання → юнітів; повторний запуск оновлює записи за стабільними ключами.
