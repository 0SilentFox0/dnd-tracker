# API контенту (REST, OpenAPI, MCP)

Спека: `docs/archive/superpowers/specs/2026-10-21-constructor-stage2-open-api-design.md` (етап 2 «Конструктора кампаній»).

Контент кампанії можна змінювати з UI, через REST з токеном і через MCP. Усі три шляхи проходять через одні й ті самі Zod-схеми, сервіс і перевірки прав. До контенту належать раси, юніти, заклинання, школи магії, основні скіли, скіли, артефакти, сети, треки музики, класи (`classes`), риси (`feats`), а також правила кампанії й дерева скілів.

Передісторії (`backgrounds`, `backgroundsResource`, модель `Background`) використовують той самий ресурсний реєстр, REST/OpenAPI/MCP, CSV, bundle і source-sync. Поля: `choices`, `skillProficiencies`, `toolProficiencies`, `originFeatId`, `equipmentText`; залежні feats імпортуються перед backgrounds. Сервер перевіряє origin type та належність вкладених refs кампанії. Використаний запис не можна видалити або змінити його ASI-правила (409); source-sync дотримується тих самих обмежень. Старі bundles без backgrounds підтримуються. Спорядження та гроші з опису видає ДМ вручну.

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

`GET /api/openapi.json` — публічний документ OpenAPI 3.1 (~145 КБ), статичний (`force-static`, `s-maxage`).
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

Масове перенесення контенту з CSV/TSV/JSON для `units`, `spells`, `skills`, `main-skills`, `spell-groups`, `races`, `classes`, `feats`, `backgrounds`, `artifacts`, `artifact-sets` (треки — ні).

- **Реєстр полів** — `lib/utils/content/import/fields/` (`IMPORT_SPECS`, без `server-only`): ключ (= ключ тіла create; у `skills` плоскі, вкладає `toBody`), підпис колонки, синоніми, тип (`string|int|number|bool|enum|list|dice|cr|ref|refList|json|attacks|abilitiesText`), посилання, обов'язковість, два приклади. Синоніми юнітів покривають заголовки старого CSV-імпорту (`docs/units/units-all.csv` дає ті самі дані), «Спасброски» не зіставляється; юніт без колонки «Майстерність» і без CR отримує майстерність за рівнем.
- **Ядро** — `lib/utils/content/import/`: `parseTable` (`csv-parse/browser/esm/sync`: BOM, рядок `sep=`, автороздільник `;`/`\t`/`,`, лапки з переносами; JSON — масив або об'єкт), `autoMap` (ключ/підпис/синоніми без регістру; `_` = пробіл, `’` = `'`), `applyMapping` (кілька колонок здібностей з'єднуються «. »), `coerceRecord`/`parseFieldValue` (ідемпотентні), `toCsv`/`recordToCells` (BOM, `;`, посилання — назвами, вкладене — JSON, списки з комою в назві — через « | »).
- **Правила значень**:
  - Необов'язкове поле, яке не розібралося, дає попередження, і поле відкидається; помилка рядка — лише для обов'язкових. Прочерки (`-`, `—`) у нетекстових полях — порожньо.
  - Необов'язкове посилання на невідомий запис — попередження і `null`; у режимі `update` таке поле пропускається (не затирає).
  - CR розбирається з початку клітинки (`1/4 (50 XP)`, `CR 5`); зіпсовані Excel дати (`01.апр`, `1-Apr`) — не CR (попередження). В експорті CR — десяткове (`0.25`), щоб Excel не робив дату.
  - Захист формул Excel: у експорті клітинки, що починаються з `= + - @`, табуляції або CR (крім простих чисел), а також з `'` перед такими символами, отримують `'` попереду; імпорт знімає один такий `'`.
  - Кодування: спершу строгий UTF-8, інакше windows-1251 (`decodeImportBytes`).
- **Сервер** — `importContent` (`lib/server/content/import/import-content.ts`): `assertCan(write)`; усі рядки перевіряються до першого запису (назва, дублі у файлі, режим, посилання за назвою без регістру або точним id, Zod create/update ресурсу); валідні пишуться по одному через `resource.create/update`: у звичайному HTTP кожен рядок має власну guarded transaction; усередині assistant outer transaction кожен рядок використовує SAVEPOINT/ROLLBACK TO SAVEPOINT, тож помилка рядка не скасовує успішні рядки, а результат і receipt комітяться атомарно; кеш довідника — один раз. Режими: `create` (дубль — помилка), `update` (за назвою; порожні клітинки не змінюють поле; `refList` з опечаткою не розриває зв'язки), `skip`. `dryRun` нічого не пише. До 500 рядків за запит (`IMPORT_LIMITS`); клієнт ділить: перевірка по 500, запис по 100 і ≤ 3 МБ.
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
- **Іконки** — власні AI-іконки з `fantasy-tokens` (токени Forgotten Adventures не використовуються). `pnpm assets:tokens-5e <templateId> [--dir <v2>] [--dry-run] [--allow-remote]` (`templateId` має бути офіційним шаблоном «5e SRD 5.2»; `--dir` — тека `v2` каталогу, типово `~/Downloads/fantasy-tokens/output/v2`) ділить каталог на юнітів/заклинання/артефакти за slug-мапінгом, конвертує в webp (юніти 384 px, заклинання й артефакти 256 px, quality 80), вантажить у бакети `unit-icons`/`spell-icons`/`artifact-icons` і пише `data/templates/srd-5.2/icons.json` (slug → URL). `pnpm constructor:srd-template` підмішує `icons.json` у рядки імпорту (`withIcons`: юніт — `avatar`, решта — `icon`), тож клони отримують їх через «Оновлення з шаблону». Варіант `<slug>-…` береться лише для артефактів-«шаблонів властивості» (`adamantine-armor`, `flame-tongue`): базова зброя/обладунок ніколи не бере арт іншого предмета (кандидат, чий slug сам є slug шаблону, пропускається); серед решти перевагу має `<slug>-plus-1`, інакше перший за алфавітом. Префікс URL — id шаблону першого завантаження; на проді потрібен лише `pnpm constructor:srd-template` (`assets:tokens-5e` на проді не запускати). Заклинання без іконки показують значок школи в її кольорі (`SpellIcon`; ключі `shield|portal|eye|heart|flame|mask|skull|vortex` поруч із 5 ключами HOMM5). `pnpm assets:attach <campaignId> <тека> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official]`: ім'я файлу = назва контенту або `slug` рядка даних SRD (з префіксом `srd-2024_` чи без); нормалізація без регістру й пунктуації (`_`, `-`, `:`, апострофи, повторні пробіли → пробіл), суфікси варіантів `A1`/`2`/`v3` відкидаються, із кількох варіантів — перший, завантаження в бакет виду (`<campaignId>/<kind>/<назва>-<sha1>.<ext>`, `cacheControl` рік), прив'язка через `importContent(update)` (юніт — `avatar`, решта — `icon`), звіт без пари. `assets:attach` лишається для власних іконок; офіційний шаблон — лише з `--allow-official`.
- **4f-2**: 12 обладунків; колонки таблиць класів з пулами (Focus, Sorcery Points, Channel Divinity, Lay on Hands) і додатковими колонками (Action Surge, Divine Spark); 37 механізованих умінь класів. Завантажувач замінює назви шкіл у `school` на id груп кампанії (ручний імпорт `classes.json` через UI лишає назву — бонус школи не спрацює).
- **4f-3**: джерело `MagicItem.json` (md5 у `OPEN5E_FILES`), спорядження `unique: false`, 32 властивості (31 сімейство варіантів + Dragon Slayer; назви складаються з повної назви бази, перевірка 513 варіантів у `pnpm srd:build` нормалізує слово «Armor»), 248 унікальних (244 + 4 зілля лікування з `Item.json`), неунікальні всі, крім Dragon Orb; регулярки механізації — `scripts/srd/convert/magic-items.ts`.
- **4f-4**: джерела `Feat.json`/`FeatBenefit.json` (md5 у `OPEN5E_FILES`), 17 рис (`convert/feats.ts`, механіка — `overrides/feats.ts`), вибори рас (`convert/race-choices.ts`: таблиці, жирні абзаци, список; 24 опції, 22 заклинання назвами → `nestedRef`), 101 вибір класів (`convert/class-choices.ts`, `overrides/class-choices.ts`; синтетична колонка `metamagic`), `Spell.classes` → `lists`, `spellList` = назва класу для 8 заклиначів.

## Оновлення з джерела (етап 3)

Спека: `docs/archive/superpowers/specs/2026-10-21-constructor-stage3-source-sync-design.md`. Кампанія або шаблон з `createdFromId` (його пише лише сервер: клон шаблону, «Зберегти як шаблон», скрипт офіційних шаблонів; JSON-імпорт — ні) порівнює себе з джерелом і вибірково бере зміни.

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


## JSON-компендіуми: backend Task19 (4f-6)

`lib/server/compendium-import/` доповнює CSV bounded 5etools adapter, source+edition identity, generic entry fallback і звіт manual/partial/native. `previewImport` підписує actor/campaign/plan digest з TTL15min, `confirmImport` повторно авторизує й перебудовує план під Campaign lock; idempotency report зберігається разом із native content/provenance/rules. HTTP upload і UI Task20 реалізовано нижче. Не викликати confirm без актуального preview й session DM.

`withCampaignContentWrite` та AsyncLocal transaction context зберігають існуючі resource guards всередині tx; CRUD/CSV/rules/scenario/sync ділять Campaign lock, cache invalidation після commit. Зовнішня підготовка artifact media — до tx. `CompendiumEntry` містить source attribution, baseline власних полів, bindings і notes окремо від template sourceId/sourceHash. Nested provenance не захоплює сусідні підраси. Повторний імпорт зберігає IDs і локальні зміни; немає автоматичного видалення відсутніх записів.

Spells: час/дистанція/компоненти/тривалість → `cost`/`casting`/`targeting` і рядок-заголовок опису (колонок castingTime/range/components/duration у моделі більше немає); школи 5etools-кодів → групи з назвою, кольором, іконкою (`SPELL_SCHOOLS`). Механіку виводить `adapters/spell-derive.ts` через спільний `lib/utils/spells/derive` (його ж використовує SRD-конвертер): шкода з атакою/рятівним, стан, зниження швидкості → `native`; заклинання без бойової механіки → `native` без ефектів (`SPELL_NARRATIVE_ONLY`; причини `narrativeReason`: немає бойових чисел, HP лише поруч із відпочинком/подорожжю, стан лише на об'єкті, створення звичайних предметів або виклик без AC/HP/швидкості/stat block, довгий каст з ефектом ≥8 год без шкоди/атаки); «can move only by…»/«grows around…» + рятівний кидок → `applyCondition immobilized`; «speed increases by N feet» → `modifyStat speed +N` на союзників; тригер `whenever… move up to…` без шкоди → rider; решта → `executionMode=manual` з кодом причини `MANUAL_SPELL_<ПРИЧИНА>`; cast відхиляється до витрат ресурсів і побічних ефектів, поки ДМ не налаштує механіку. Backgrounds — існуючий backgroundsResource, Choice/Picks, originFeatId і skill/tool proficiencies; equipment/currency тільки вручну. Офіційні SRD dependencies лише явним вибором існуючого локального шаблону, без зовнішніх завантажень.
Races/subraces: розмір, швидкість, зір (`darkvision`/`blindsight`/…), мови, вік → заголовок опису (`passiveAbility.description`); швидкість ходьби ≠ 30 → пасивка `modifyStat speed` (дельта), зір → `flag sense`, `resist` → `flag resistance`; ASI раси лишається вибором `abilityScore` (weighted `from` ≥ 2, `choose { from, amount }`), у підраси (опція лінії) фіксований ASI → пасивка `modifyStat`, `additionalSpells` лінії → `options[].spells` з `grant` (фіксовані; «обери одне» і фільтри → `MANUAL_RACE_SPELLS`). Інші види руху → `MANUAL_RACE_MOVEMENT`, опір з вибором → `MANUAL_RACE_RESIST`. Якщо підраса приносить посилання (спели), батьківський рядок раси переставляється в кінець плану, щоб спели записались раніше. Backgrounds: `startingEquipment` → читабельний `equipmentText` (гроші в монетах: `value` — мідь; `a/b` — на вибір) з `MANUAL_EQUIPMENT` (інвентаря в моделі немає), вибір інструментів → `MANUAL_TOOL_CHOICE` + рядок у описі, мови → рядок опису; сирий JSON у нотатках лише для нерозібраного. Feats: `prerequisite` з одним варіантом → `level`/`scores`/`text` (решта ключів і `other` → `manualText` + `MANUAL_PREREQUISITE`, кілька альтернатив → весь текст); `resist` → пасивка; `additionalSpells` (`innate.will` лише закляття-фокуси, `daily`/`rest` `Ne` → вибір-опції з `grant { uses, rest, dcAbility }`, `N` без `e` → «обери одне», `choose` з `level=N` → вибір `spell`, фільтр школи лише описаний) → вибори з `refs`; неописане (at-will зі слотами, `expanded`, `resource` тощо) → `MANUAL_FEAT_SPELLS` + нотатка `additionalSpells`.
Items: `consumable` — тип `P/SC/A/AF/EXP/FD`, мітка `CNS` або власний `itemType` з назвою на кшталт ingredient/potion/scroll (отримує дію «Випити»/«Використати» з пулом `charges`); `unique: true` лише для рідкості `artifact`/`unknown*` (як у SRD-конвертері), решта — неунікальні. `bonusWeapon*` → `weapon.attackBonus/damageBonus`; `bonusAc`, `bonusSavingThrow`, `resist` → пасивка `bonuses` (у витратних — тимчасова дія з тривалістю з тексту, ≤ 99 раундів); решта ефектів (`modifySpeed`, `attachedSpells`, `charges`, `bonus*` інші…) → `MANUAL_ITEM_EFFECT` + нотатки. Optional features: `optionalfeatureProgression` класу/підкласу прив'язує опції за `featureType` (з урахуванням префіксу-вимог, що називає інший клас/підклас) як вибір на кожному рівні приросту (`MANUAL_OPTIONAL_FEATURE`); без власника лишаються лише опції без прогресії (`OPTIONAL_FEATURE_WITHOUT_OWNER`).

Bundle/clone переносить optional compendium section й DM notes; source-sync лише provenance обраних native rows, бо ScenarioPage не входить до sync scopes. Дизайн і ліміти: `docs/archive/superpowers/specs/2026-10-23-constructor-compendium-json-import-design.md`. Migration `20261107000000_compendium_import` локально застосована, production deployment не проводили.


### Кампанійний JSON-компендіум (Task20)

`POST /api/campaigns/[id]/compendium/preview` приймає `{input}` Task19, повертає signed token/report та read-only graph/coverage metadata. `POST …/confirm` приймає той самий input, token, idempotencyKey і `rightsConfirmed:true`. Єдині writes — через чинний Task19 service/repository. `GET …/reports` дає paginated lightweight runs, `?runId=` — збережений report; `GET …/entries?kind=&targetId=` — paginated source notes/attribution конкретного native row; `GET …/options` — доступні локальні targets та дозволені чинним dependency gate SRD targets. Усе лише session-DM цільової кампанії, private/no-store; mutations same-origin, rate limiting з memory fallback, bounded UTF-8 transport≤3000000bytes, fixed-code errors без payload logging. HMAC `COMPENDIUM_PREVIEW_SECRET`≥32 chars; fail closed без конфігурації. Node routes maxDuration60s покриває наявні planning15s/tx30s/maxWait5s.

UI `/campaigns/[id]/dm/compendium`: повний локальний scanner у Worker(5s/cancel), projection категорій/DM chapters, unsupported roots лише як counts/placeholders, preview без writes, окремі readiness/importability, explicit refs/dependencies/mixed-edition/rules diff/conflicts, rights-confirmation, refreshable report та next actions. Payload не йде до mapping/AI/localStorage/analytics. Source notes доступні у native editors; URLs — текст. Ручне spell executionMode зберігається формою, автоматичне застосування потребує явного рішення ДМ після налаштування; feature descriptions класу/підкласу відображені для отриманих рівнів. Екіпірування/гроші backgrounds не видаються автоматично.


### Task21: перевірений контракт і межі

Same-origin mutations порівнюють Origin із browser-facing Host та protocol request URL (Next може нормалізувати hostname до localhost); forwarded-host не використовується. Planned dependency aliases не перетворюють create нового SRD parent на update під час nested assembly. Coverage book/adventure рахує спожитий manifest/data container один раз, незалежно від кількості обраних глав; якщо всі глави виключені, container лишається skipped. Next-action знаходить native row також за власним issue code/path, тому raw `spell[0]` відкриває редактор заклинання.

Task21 synthetic integration підтвердила atomic confirm/reimport/idempotency, conflicts/stale/auth, notes privacy/versioning, clone/remap і scoped native sync, explicit SRD dependency та backgrounds Choices/Picks. Докази: task21 ledger (12 файлів/78 тестів, включно з real local DB6/6), browser/API evidence; це збережений перевірочний checkpoint, не повторні запуски під час документації. Scanner/limits/concurrency успадковано з Tasks19–20. Full suite/build тут не запускали.

`additionalSpells` DSL лишається manual/UNSUPPORTED_FIELD: native spell Choice/Picks перевірено після явного налаштування чинним ресурсом. Gear/gold вручну; ScenarioPage source-sync відсутній, оновлення notes через JSON reimport/вручну. Окремий backgrounds single-connection live PUT/PATCH checkpoint пройдено2026-10-25 (11 HTTP requests); блок закрито. Applied migration20261107000000_compendium_import незмінна. [Користувацька інструкція](../guides/compendium-json-import.md) описує формат, права, edition й різницю readyToImport/readyToPlay. Етап6 AI не починався.


Backgrounds closure2026-10-25: окремий локальний session-DM HTTP прогін із `connection_limit=1` підтвердив PUT/PATCH select/swap/remove, idempotency, ASI422 без запису та збереження biography/inventory/manual proficiencies/classes. Harness і власні fixtures очищено; SRD збережено. Код не змінювався, збережені suite/build/browser докази не перезапускали. Точний фінальний checkpoint — у `docs/archive/superpowers/plans/2026-10-24-constructor-backgrounds.md`.


## Етап6: контентні дії асистента (T5)

`lib/server/assistant/actions/content.ts` експортує `CONTENT_ACTIONS` над усіма12 чинними `CONTENT_RESOURCES` і `CONTENT_OPERATIONS`; `content-coverage.ts` пов’язує кожен HTTP method/path цього блоку з action id та тестами. Адаптери використовують спільні services, схеми та actor scopes. У review запис повертає pending intent, auto виконує звичайну зміну один раз із receipt; delete/clear та session-only масові операції потребують session-підтвердження людини. DryRun імпорту залишається читанням без intent; звіт зберігає помилки окремих рядків і явно позначає частковий результат.

Preview містить валідований patch, актуальне before, залежності й FK-каскади; source-sync показує також dependency closure та автоматичну зміну credits. Некешований fingerprint читається під shared campaign lock із locks на наявних персонажах, inventory та progression: зміна контенту чи залежностей дає stale. Fingerprint консервативний — стороння правка контенту цієї кампанії також може вимагати нового preview. Під час імпорту в outer transaction кожен рядок має savepoint; SQL-помилка рядка не залишає його часткових записів і не блокує commit наступних рядків та receipt.

Підготовка не вантажить іконки/файли та не викликає платні сервіси. Іконки артефактів/сетів і файли треків передаються чинному UI; для YouTube без назви адаптер задає явний `YouTube <id>` без oEmbed під lock. Native HTTP media preparation виконується до lock. Інвалідація й очищення файлів виконуються після commit; `CONTENT_EFFECT_HANDLERS` підтримує повтор лише durable effect, без повторного доменного запису. `additionalSpells`, спорядження й золото не автоматизуються; ScenarioPage source-sync відсутній.

**Історичний checkpoint T5:** на той момент каталог, `dispatchContentAlias` та handlers ще не були підключені до transport. Це завершено в T14: legacy aliases тепер ідуть через спільний dispatcher і review/auto policy, а `content:write` не отримує нових scopes.

### MCP assistant contract v2 (stage6 T14)

Legacy content tool names збережено, але записи проходять shared assistant dispatcher та review/auto policy. Відповідь тепер має `version: 2`, зовнішній `kind: result|error`; `data.kind: pending` і `reviewUrl` означають, що доменний запис ще не виконаний. Scopes не розширюються. Підтвердження та auto policy змінює тільки ДМ у session UI; model-callable apply/confirm немає. Великі JSON/schema/data читаються bounded projections/pagination через `assistant_schema/read`, без невалідного clipped JSON. Деталі контракту, міграції proposal aliases і статусів — [Assistant transport v2](ai.md#assistant-transport-v2--stage6-t14). Чинні REST API contracts не змінено.

## Refactor S9/S10 — контракти та перевірки

Class/feat writers перевіряють нові nested choice spell refs через `assertCampaignRefs` у scoped transaction; update використовує `addedIds`, тому старі stale refs не блокують metadata-only save. Class column guard окремо перевіряє stored features при зміні columns. DELETE usage409 класів/рис/передісторій задокументовано в OpenAPI.

`abilities.sources/get` обслуговує всі OwnerKind, включно з class/feat, у межах кампанії. Class projection збирає прямі abilities base/subclass features через `toGameClassData`, не вибирає option grants і не застосовує їх персонажу; feat використовує чинний `readAbilities`.

Compendium orchestration — `adapt.ts`, nested class/optional feature resolution — `feature-resolution.ts`, без іншого adapter registry. SQL export→import→source-update roundtrip і5warm/30sample measurements — [S9 checkpoint](../archive/superpowers/plans/2026-10-26-constructor-refactor-s9-progress.md). Реальна source contention підтверджує NOWAIT refusal до intent; tool transport повертає sanitized500. API/MCP ids/payloads і persisted JSON сумісні; writer validation defects виправлено окремо від extraction.
