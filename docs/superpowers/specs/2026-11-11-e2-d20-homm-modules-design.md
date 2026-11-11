# E2: база `systems/d20` і модулі правил — дизайн

Дата: 2026-11-11 (ред. 2: модель композиції за рішеннями власника). Статус: проєкт на погодження. Продовжує [architecture-modularity](2026-11-10-architecture-modularity-design.md) (R14, R16; E0 і E1 змерджені в main `e92fbb5b5`). План: [2026-11-11-e2-d20-homm-modules.md](../plans/2026-11-11-e2-d20-homm-modules.md).

**Що змінює ця редакція відносно U9.** U9 описував `systems/homm` як одну систему поверх `systems/d20`. Рішення власника 2026-11-11: правила кампанії = **база + набір необов'язкових модулів**. Механіки Heroes стають окремими модулями, які можна ввімкнути на будь-якій сумісній базі (напр. класичний 5e + мораль), а `homm` і `dnd5e` лишаються **пресетами** (база + набір модулів), тож збережені `system.key` працюють далі. «Система розширює базу» — окремий випадок композиції.

## 1. Мета й критерій готовності

Core не знає жодної системи й жодного модуля. База (`d20`, `wfrp`) і модулі (`morale`, `retaliation`, …) мають однаковий контракт; режим гри збирається з бази й обраних модулів — із шаблону, з пресета або з нуля. Бій як функція (конвеєр, дельти, порядок ходів, сітка, учасники, журнал, ефекти як механізм) лишається в core.

Вимірювані критерії (тести наприкінці E2):

1. У `lib app components types scripts` (крім коренів реєстрів і `scripts/templates/systems/**`) немає читань секцій правил, що належать базі чи модулю (`rules.morale`, `rules.criticals`, …): зараз 83 файли (28 у `lib/utils/battle`), ціль 0.
2. `system-imports-exempt.json` порожній; `system-literals-exempt.json` — лише сховища даних і тексти (кодек журналу, `whats-new`, `site`, скрипти активів).
3. У `RuleSystemDefinition` немає слота, де `undefined` означає «поведінка d20»; у core немає `?? d20-формула`.
4. Фікстурна база `d6pool` проводить мінімальний бій (старт → атака → 0 HP → наступний хід) без жодного файла з `systems/*` у графі імпортів.
5. Кампанія `dnd5e` з модулем `morale` (без решти модулів Heroes) проходить `battle-sweep`; пресет `homm` дає ту саму поведінку, що й до E2.
6. `battle-sweep` × 3 (`srd-5.2`, `heroes-homm`, `grim-d100`) на prodcopy: 0 помилок після кожної частини, що чіпає бій; попереджень не більше, ніж у базовому прогоні на main.

## 2. Перевикористання (reuse before writing)

| Що беремо готовим | Де | Як використовуємо |
|---|---|---|
| Слот `SystemSlot` / `defineSlot` | `lib/utils/rules/systems/slot.ts` | стан бази й модулів в учаснику й запиті; додається лише `extend` (розд. 5.5) |
| Реєстри й генератор `pnpm systems:index` | `scripts/shared/systems-index.ts`, 8 коренів | бази, модулі й пресети підключаються тими ж блоками `<systems:generated>`; +1 корінь (секції правил) |
| Корені ефектів умінь | `abilities/schema/system-effects.ts`, `registry/effects/system-rows.ts` | прапорці моралі/відсічі стають рядками своїх модулів так само, як Traits wfrp |
| `systems/wfrp` як еталон форми | `meta.ts`, `index.ts`, `rules/ ui/ hooks/ api/ server/ constants/ __tests__/` | та сама розкладка й ті самі ESLint-шари `SYSTEM_LAYERS(id)` для кожної теки |
| Наявні хуки `RuleSystemDefinition` | `resolveAttack`, `mitigateDamage`, `onZeroHp`, `initiative`, `hitModel`, `conditions.*`, `magic.*`, `details`, `sheetTest`, `rest` | d20 отримує власні реалізації; core-гілка «хука нема» видаляється |
| `SystemUi.battle`, `rulesSections`, `SystemServer.operations/schemas/ai` | `components/systems/types.ts`, `lib/server/systems/types.ts` | внески бази й модулів; `mergeSystemOperations` уже ловить колізії |
| `PackHooks` | `scripts/templates/systems/` | хуки пакета = композиція хуків бази й модулів маніфесту |
| Ratchet і контракт | `system-ratchet.ts`, `system-literals.test`, `system-contract.test`, `d6pool` | розширюються (токени з meta, залежності, матриця композицій) |
| `battle-sweep` з профілями шаблонів | `scripts/sim/battle-sweep/profiles` | гейт; +1 профіль `srd-5.2` з модулем `morale` |
| `runBattleMutation`, `CHARACTER_OPERATIONS`, `parseBody`, `loadOwned` | `lib/server`, `lib/utils/api` | загальний маршрут `/system/[action]` лише диспетчеризує |

Нове і чому без цього не обійтись:

- **Маніфест модуля і `composeSystem`** — композиції «база + модулі» немає взагалі; без неї механіки Heroes або дублюють d20, або недоступні на 5e.
- **Секції правил від модулів з адресами-шляхами** — зараз 19 секцій зашито в `schema.ts` (153 імпортери).
- **Хуки ходу `turn.*`, каталог дій, реакції, `afterAttack`** — мораль, рятунки від смерті, відсіч, дії 5e не мають шва.
- **Види контенту й маршрути від модуля** — борги E1 (`careers`, 12 route-файлів).
- **Слот із картою розширень** (`codec.extend`) — стан кількох модулів в одному слоті учасника.
- **Каталог і валідація композиції** — шов для UI «зібрати режим».

## 3. Межа «механізм — правило»

### 3.1 Тест рішення

Питання по черзі; перше «так» визначає місце.

1. **Чи код тлумачить число, таблицю або термін із книги правил?** (d20, КБ, перевага, СК 10, три рятунки від смерті, модифікатор `(x−10)/2`, слот заклинання, мораль, відсіч.) → правило: у базу або модуль.
2. **Чи третя, не схожа система (`d6pool`) використала б цей код без змін?** → механізм, core.
3. **Чи це форма збережених даних, спільна для систем** (колонка Prisma, знімок учасника, рядок журналу)? → форма лишається core як сховище; тлумачить її власник через хук або кодек.
4. **Чи правило можна вимкнути, не зламавши базу, і чи має воно сенс на іншій базі або без решти механік свого «набору»?** → окремий модуль. Інакше — частина бази (з перемикачем у секції, якщо він уже є).
5. MIXED-файл ділиться: механізм лишається, правило стає викликом хука. Копіювати механізм у модуль заборонено.

Наслідок: що є в книзі 5e — база d20 (навіть вимкнене в шаблоні Heroes); механіки Heroes — модулі, кожна окремо.

### 3.2 Модулі E2

| Модуль (тека) | Вид | Зміст | `requires` |
|---|---|---|---|
| `d20` | база | усе з книги 5e (нижче) | — |
| `wfrp` | база | як є | — |
| `morale` | модуль | секція `morale`, перевірка на початку ходу, `pendingMoraleCheck`, прапорці й ефекти моралі, стат `morale`, внесок лідерства в мораль | `d20` |
| `retaliation` | модуль | відсіч після атаки, лічильники, прапорці `noRetaliation` тощо, пункт `actions.retaliation` | `d20` |
| `heroscaling` | модуль | HP-формула героя, кубики за рівнем, архетипи, множники | `d20` |
| `skilltrees` | модуль | головні навички, дерева, прогресія дерева, вивчення заклинань зі шкіл, види контенту `main-skills`, `skills`, `skillTrees` | `d20` |
| `artifactsets` | модуль | вид контенту `artifact-sets`, бонуси набору як джерело вмінь | `d20` |
| `unitstacks` | модуль | кількість у стеку, `min/maxTargets`, `levelScaling`, `scale-units`, шкода стека в балансі | `d20` |
| `dnd5e` | пресет | `d20` + `[]` (оголошений у `systems/d20/meta.ts`) | — |
| `homm` | пресет (`systems/homm`) | `d20` + усі шість модулів + типові правила Heroes | — |

Усі шість модулів на старті вимагають `d20`: вони читають d20-статблок і перевірялись лише з ним. Зняти вимогу для конкретного модуля = правка маніфесту + проходження матриці контракту на новій базі; коду core це не чіпає. Механіки самої книги 5e (рятунки від смерті, концентрація, крити, дії) лишаються секціями бази з перемикачами `enabled`; контракт дозволяє пізніше винести будь-яку з них у модуль тим самим способом.

Взаємодія модулів між собою — лише через механізми core (ефекти вмінь, стати, формульні змінні) або через оголошену залежність `requires`. Приклад: роль лідерства головної навички (`skilltrees`) дає ефект на стат, який читає `morale`; імпорту між ними немає.

### 3.3 Вердикти

| Область | Вердикт | Обґрунтування |
|---|---|---|
| Конвеєр бою, дельти, `runBattleMutation`, порядок ходів, сітка, режими карти, FX-рушій, журнал і кодек | core | тест 2 |
| Ефекти як механізм, рушій умінь `collectModifiers`/`runAbilities` | core | тест 2; wfrp ними користується |
| Суддя атаки d20, перевага/перешкода, КБ, крит/провал, таблиці крит-ефектів, `crit-choice` | `d20` | тест 1; `combat.resolveAttack` |
| Подвоєння кубиків на криті, рядки розкладу шкоди | `d20` (`combat.damage`) | тест 1 |
| Опір/вразливість/імунітет за типом шкоди | core | механізм множників, дані з ефектів |
| Рятунки, концентрація, рятунки від смерті, `unitsDieAtZero` | `d20` | тест 1 |
| Атаки з нагоди, реакції, підготовлена дія, каталог 5e-дій, легендарні й лігвищні дії | `d20` | тест 1; лічильники економіки дій — core |
| Каталог станів 5e, виснаження | `d20` (`conditions`) | прибирає `conditions === undefined → 5e` |
| Слоти заклинань, СК, апкаст, класові таблиці слотів, Arcane Recovery | `d20` (`magic`) | тест 1 |
| Модель заклинання, таблиця `spells` | core | спільна з wfrp |
| Класи, мультиклас, кубики хітів, level-up/ASI, передісторії, навички 5e, світогляд, CR/XP, натхнення, відпочинок | `d20` | тест 1 |
| Риси (`feats`), двигун виборів (`choices`) | core | спільні з талантами wfrp |
| Ініціатива: кидок і статичний режим | `d20` | статична ініціатива — варіант 5e; пресет `homm` лише задає типові межі; **відхиляємо** `homm.initiative` |
| Сітка екіпірування 9 слотів, рідкість | `d20` (`equipment.layout`) | користуються й 5e-кампанії; **відхиляємо** `homm.artifactGrid` |
| Чесний баланс (`computeFairScaling`, `TARGET_ROUNDS`, `HERO_EDGE`) | core + `hitModel` бази; `unitstacks` обгортає `damage` | каркас спільний; **відхиляємо** `homm.balance` |
| `lib/constants/abilities` (112 імпортерів) | імена шести колонок → core `lib/constants/stat-columns.ts`; `AbilityKey`, модифікатор, межі, підписи → `systems/d20/constants` | колонки Prisma не міняються, а тлумачити їх core не повинен; **відхиляємо** обидві пропозиції класифікатора |
| `types/classes` (126) | `systems/d20/rules/classes/types.ts` | `classes`/`backgrounds` — види контенту d20 |
| `types/characters` (140), `types/units` | core | рядок сховища |
| `lib/constants/battle` (585) | core | словник журналу; `MORALE_SKIP`, `RETALIATION` лишаються (збережені), `CONDITION_LIMITS.dc` → d20 |
| `lib/constants/api-errors` | core | словник платформи |
| `Ruleset`: тип і розбір | core; секції дають база й модулі | розд. 6 |
| `rules.tables`, `rules.advancement` | `wfrp` | плоске зберігання (рішення власника 3) |
| Шаблони вмінь, формульні змінні, джерела вмінь | база/модуль (`abilities.*`) | тест 1 |
| Клієнтські flow, store бою | core; `fortune`, `moraleOutcome` → непрозорий `flow.system` | тест 5 |

### 3.4 Обмежена асиметрія (свідомо)

d20-статблок (шість характеристик, КБ, швидкість, ініціатива, `spellSlots`, `morale`, `min/maxTargets`) лишається **колонками Prisma й полями знімка учасника**: перейменування колонок заборонене. Core ці поля зберігає й копіює, але не читає в умовах і формулах. Гард — тест на доступ до них у core-правилах (лічильник лише падає, ціль 0 поза будівниками учасника й мапперами сховища). Колонка `morale` існує й тоді, коли модуль `morale` вимкнено: значення просто ніхто не читає.

## 4. Модель композиції

### 4.1 Маніфест (`systems/<id>/meta.ts`, лише дані)

```ts
interface SystemMeta {
  module: string;                          // id теки, [a-z0-9]+
  kind: "base" | "addon" | "preset";
  keys?: readonly string[];                // база: ключ «голого» пресета (d20 → "dnd5e", wfrp → "wfrp"); пресет: свій ключ ("homm")
  preset?: { base: string; modules: readonly string[] };   // лише kind "preset"
  requires?: readonly string[];            // модулі (база чи addon), що мають бути активні; лише їх дозволено імпортувати
  conflicts?: readonly string[];           // не можуть бути активні разом
  claims?: readonly string[];              // виключні слоти, які модуль заміщує (шлях слота, напр. "progression.maxHp")
  after?: readonly string[];               // м'який порядок: мої хуки після хуків цих модулів, якщо вони активні
  toggle?: "free" | "setup";               // чи можна вмикати/вимикати в кампанії з персонажами (за замовчуванням "free")
  tokens?: readonly string[];              // підрядки для ratchet
  i18n: SystemI18n; dmSections?: readonly string[];
}
```

`unusedMechanics` зникає: система просто не має секцій неактивних модулів.

### 4.2 Зберігання вибору

```jsonc
"system": { "key": "dnd5e" }                          // старий рядок: пресет dnd5e = d20 + []
"system": { "key": "homm" }                           // старий рядок: пресет homm = d20 + шість модулів
"system": { "key": "dnd5e", "modules": ["morale"] }   // 5e + мораль
"system": { "key": "dnd5e", "modules": ["heroscaling", "morale", "skilltrees"] }   // режим «з нуля» на базі d20
```

- `key` обов'язковий і завжди є ключем пресета; він визначає базу. Режим «з нуля» = ключ голого пресета бази + явний список.
- `modules` необов'язковий. Відсутній → набір пресета. Присутній → **повний** явний набір модулів (заміщує набір пресета), зберігається відсортованим.
- Expand-only: старі рядки читаються без змін. Невідомий id модуля в `modules` → помилка розбору секції `system` (`rules.validation.unknownModule`), як для невідомого ключа.
- `composition(rules.system)` → `{ base, modules }` — єдина точка розгортання; далі всі реєстри працюють із композицією, а не з ключем.
- Наявна секція `system` — `strictObject({ key })`: старий код відкинув би рядок із `modules`. Тому толерантний читач (приймає й зберігає `modules`) викочується першим (Ч1), а запис `modules` дозволяється лише після нього.

### 4.3 Порядок і конфлікти

`composeSystem(base, addons)` (`lib/utils/rules/systems/compose.ts`, core, без знання конкретних модулів):

1. **Перевірка набору:** кожен `requires` активний; жоден `conflicts` не активний; на кожен виключний слот — не більше одного модуля з `claims`. Порушення → `CompositionIssue[]` (422 при збереженні правил; у розборі збережених правил — помилка секції `system`, сторінка показує причину).
2. **Порядок:** топологічне сортування за `requires` і `after`, рівні — за id модуля за алфавітом. Порядок вибору користувачем і порядок у JSON не впливають.
3. **Згортка** в цьому порядку за видом поля контракту:

| Вид поля | Правило |
|---|---|
| Список хуків (`readonly X[]`: `turn.*`, `combat.afterAttack`, `abilities.sources`) | конкатенація: база, далі модулі в порядку композиції; порядок у списку = порядок виконання |
| Словник (`operations`, `routes`, `battle`, `dmPages`, `contentKinds`, секції, рядки ефектів, формульні змінні) | об'єднання; однаковий ключ у двох учасників → помилка композиції |
| Виключний слот (скаляр або функція: `combat.resolveAttack`, `combat.initiative`, `progression.maxHp`, `combat.hitModel.damage`, …) | значення бази; модуль може замістити лише слот зі свого `claims`, його будівник отримує попереднє значення (`prev`) і може делегувати |
| Група (`magic`, `conditions`) | заміщення лише через `claims` на всю групу |

Два модулі з однаковим `claims` (напр. дві моделі ініціативи) ніколи не активні разом: `composeSystem` відхиляє набір, а тест контракту вимагає, щоб така пара була оголошена в `conflicts` (UI робить вибір взаємовиключним заздалегідь). Обгортання без виключності (додати змінну, додати хук) йде списками й словниками, тож `claims` потрібен рідко: у E2 — `heroscaling` (`progression.maxHp`) і `unitstacks` (`combat.hitModel.damage`).

Хуки ходу виконуються згорткою: кожен отримує стан після попереднього; `skipTurn` або непорожній `pending` зупиняє решту списку. `morale` оголошує `after: ["d20"]` неявно (база завжди перша): мертвий не перевіряє мораль.

Результат `composeSystem` кешується за `key + modules.join()`; `ruleSystemOf(rules)`, `systemUiOf(rules)`, `systemServerOf(rules)` повертають зібране. `extendSystem(base, build)` лишається як окремий випадок (композиція з одним анонімним модулем) для пресетів і фікстур.

### 4.4 Пресет

`systems/homm/` містить `meta.ts` (`kind: "preset"`, `keys: ["homm"]`, `preset: { base: "d20", modules: [...] }`), `rules/rules-preset.ts` (типові значення секцій Heroes: ініціатива 10–16 static тощо) і більше нічого виконуваного. Хуки пакета `heroes-homm` (`scripts/templates/systems/homm`) лишаються. Пресет не має власних слотів, секцій чи UI — лише склад і типові значення.

### 4.5 Вмикання й вимикання в живій кампанії

- Зміна `key` — як зараз (`SYSTEM_LOCKED`, якщо є персонажі чи юніти).
- Зміна `modules`: дозволена ДМ, якщо набір валідний і в кампанії немає активного бою (409 `SYSTEM_MODULES_IN_BATTLE`). Модуль із `toggle: "setup"` (у E2 — `heroscaling`, `skilltrees`: міняють розрахунок HP і прогресію наявних героїв) у кампанії з персонажами вимагає явного підтвердження (`confirm: true` у патчі), UI показує наслідки.
- Вимкнення нічого не видаляє: рядки видів контенту модуля, значення колонок і збережені секції лишаються й повертаються при повторному вмиканні (розд. 6, 7).

### 4.6 Шов UI створення режиму

Сам екран — пізніша частина; E2 дає лише шов:

- `moduleCatalog(): { bases, addons, presets }` — id, вид, `requires`, `conflicts`, `toggle`, ключі i18n `gameTerms.module.<id>.{name,summary}` (клієнтобезпечний, з meta);
- `validateComposition(system): CompositionIssue[]` — та сама функція на клієнті й сервері;
- сервер: створення кампанії приймає `system: { key, modules? }` без шаблону (правила = типові значення секцій композиції); патч правил приймає `system.modules`;
- мінімальний UI в E2: список перемикачів модулів у наявній секції «Система» сторінки правил.

## 5. Форма тек, ESLint, ratchet, контракт

### 5.1 Теки

```
systems/d20/          база: meta.ts (kind "base", keys ["dnd5e"]), index.ts (D20_MODULE), rules/ constants/ ui/ hooks/ api/ server/ __tests__/
systems/wfrp/         база (як є; експорт перейменовується на WFRP_MODULE)
systems/morale/       модуль: meta.ts (kind "addon", requires ["d20"]), index.ts (MORALE_MODULE = defineAddon(...)),
                      rules/{sections,ability-effects,ability-effect-rows,slots}.ts, ui/, server/, __tests__/
systems/retaliation/  systems/heroscaling/  systems/skilltrees/  systems/artifactsets/  systems/unitstacks/   — так само, лише потрібні шари
systems/homm/         пресет: meta.ts, rules/rules-preset.ts
```

Модуль — та сама форма, що й база, але кожен шар необов'язковий, а `index.ts` експортує будівник часткового внеску: `defineAddon((prev: RuleSystemDefinition) => DeepPartial<RuleSystemDefinition>)`. Типи живуть поруч із кодом; окремого шару `types/` немає.

### 5.2 Реєстри

Генератор більше не припускає «тека = ключ». Реєстри тримають модулі за id (`MODULES`, `MODULE_UI`, `MODULE_SERVER`, `MODULE_HOOKS` — по рядку на теку з відповідним шаром); пресети виводяться з meta (`PRESETS: Record<key, { base, modules }>`). `RULE_SYSTEM_KEYS` = ключі пресетів. Ручні рядки `homm: d20System("homm")`, `dnd5e: …`, `D20_SERVER` зникають. `SYSTEM_MODULE` (правило `include` між пакетами, R17) стає «однакова база»: Heroes і далі бере рядки SRD; придатність рядка виду, якого композиція цільового пакета не має, відхиляє валідатор пакета.

### 5.3 ESLint

- `SYSTEM_SELF_PATTERNS(id)`: заборонені всі `@/systems/<other>/**`, крім модулів із `requires` цієї теки. Список `eslint.config.mjs` бере з `meta.ts` регулярним виразом по `requires: [ … ]`; тест контракту звіряє розбір із `META.requires` (розбіжність = червоний тест).
- Напрям лише «вниз»: база не імпортує модуль, модуль не імпортує модуль без `requires`, пресет не імпортує нічого, крім типу meta. Шарові правила (`@/systems/*/server`, `@/systems/*/api`) записані через `*` і діють між теками без змін.
- `SYSTEM_IMPORT_PATTERN` (d20-теки в core) видаляється разом із теками; `SYSTEM_OWNED_FILES` втрачає d20-частину.

### 5.4 Ratchet

Зараз `literalTokens().substring = systemIds()`: ім'я теки шукається як підрядок. `d20` дав би 217 влучань у 71 файлі, `morale` — сотні. Обидва exempt-файли можуть лише зменшуватись, тому:

1. Підрядки беруться з meta: `substring = SYSTEM_META.flatMap((m) => m.tokens ?? [])`; літерали в лапках — ключі пресетів, id баз і ключі шаблонів, як зараз. Id модулів-доповнень у літерали не входять (слова `morale`, `retaliation` — частина словника журналу й колонок).
2. `d20`: `tokens: ["dnd5e"]`. `d20` — назва кубика, підрядком не буває; `"d20"` у лапках — літерал (кодек `["q","d20"]` уже в списку). `wfrp`: `tokens: ["wfrp"]` (як сьогодні). Пресет `homm`: на старті без підрядка, у фіналі `["homm"]`.
3. Виняток d20-тек у `isLiteralAllowed` видаляється.
4. Імена-протікання й читання чужих секцій ловить блок у `system-literals.test.ts` — таблиці `патерн → максимум` прямо в тесті, числа лише падають, ціль 0: `D20_[A-Z]+`, `d20System`, `judgeD20`, `CONDITION_5E_`, `applyCondition5e`, `isHomm`, `HOMM_[A-Z]+`, а для модулів — `rules-section-readers` за секціями (`morale`, `heroScaling`, …) і лічильники імпортів їхніх колишніх core-файлів. Окремих json не заводимо.

### 5.5 Слот зі станом кількох модулів

Слот несе ключ бази; модулі кладуть свої дані в карту розширень усередині:

```ts
interface SlotCodec<T> {
  read(slot: SystemSlot | undefined): T | undefined;
  write(data: T, prev?: SystemSlot): SystemSlot;
  extend<E>(module: string, parse: (v: unknown) => E | undefined): SlotCodec<E>;   // читає/пише data.ext[module], не чіпаючи решти
}
// { key: "d20", data: { deathSaves, inspiration, …, ext: { retaliation: { left: 1 }, morale: { … } } } }
```

База читає свій слот однаково з будь-яким набором модулів; дані вимкненого модуля в `ext` ігноруються й не губляться. Форма `SystemSlot = { key, data }` і збережені слоти wfrp не міняються.

### 5.6 Тест контракту

- теки `systems/*` = модулі meta; кожна має `meta.ts`, бази й модулі — `index.ts`;
- граф: `requires` існують і ациклічні; розбір ESLint = meta; кожна пара з однаковим `claims` оголошена в `conflicts`; пресети посилаються на наявні модулі й проходять `validateComposition`;
- **матриця композицій:** `assertSystemContract` проходять кожна база окремо, кожен пресет, кожен модуль поодинці на кожній сумісній базі і повний набір сумісних модулів на базі; для кожної — немає колізій словників, усі обов'язкові слоти визначені, секції/ефекти/види/операції не перетинаються;
- фікстури: база `d6pool`, модуль `d6pool-plus` (секція, хук ходу, дані в `ext`), модуль `d6pool-alt` з тим самим `claims` (доводить відмову конфлікту);
- поведінкові тести `d6pool-battle` (критерій 4) і «dnd5e + morale» на рівні рушія.

## 6. Контракт слотів

Позначки: **E** — є, **R** — змінює форму, **N** — новий. Сигнатури — ескізи; `Ctx` несуть `rules`, `rng`, `participants`, `map`, `round`.

```ts
interface RuleSystemDefinition {
  key: string;                                                     // E: ключ пресета
  modules: readonly string[];                                      // N: активні модулі (для UI й AI)
  distance: { unit; perCell };                                     // E
  currency: RuleSystemCurrency;                                    // R: обов'язковий
  stats: {                                                         // R: з characteristics.*, d20Stats, baseStats, participantFields
    persisted; defaults(); isEmpty(v); reconcile?; initial?; redact?;
    columns: readonly StatColumnsHook[];                           // N, список: що писати в колонки сховища (база + модулі: archetype, morale, targets)
    participant(row, gear?): { initiative; speed; slot?: SystemSlot };
  };
  progression: { levels; hpTerm; maxHp(input): { total; breakdown } };            // R: null заборонено; виключний
  sheet: { blocks: readonly SheetBlockHook[]; test: { accepts; roll } };          // R: блоки списком (база + модулі)
  rest: { kinds; onSession? };                                     // E
  combat: {
    judge; dice; actionEconomy;                                    // E
    resolveAttack(ctx): ResolvedAttack;                            // R: обов'язковий, виключний
    damage(ctx): DamageResult;                                     // R: з mitigateDamage; крит-кубики, рядки розкладу
    onZeroHp(ctx): DamageConsequencesResult;                       // R: обов'язковий
    onDamaged: readonly DamagedHook[];                             // N, список: концентрація (d20), channelled SL (wfrp)
    afterAttack: readonly AfterAttackHook[];                       // N, список: спровокована нагода (d20), відсіч (retaliation)
    reactions?: { onMove(ctx): ReactionOffer[]; resolve(ctx): AttackFollowUp };   // N
    actions: { catalog(ctx): ActionInfo[]; available(p, key, ctx): Reason | null; run(p, key, ctx): ActionRun };   // N
    initiative(p, ctx): InitiativeScore; tieBreak(p): number;      // R: обов'язкові, виключні
    input?: { parse(raw: SystemSlot | undefined): unknown };       // N: системні дані запиту (замість fortune)
    hitModel: HitModel;                                            // R: обов'язковий; damage — виключний підслот
    attacksOf?; attackTarget?; details?;                           // E
  };
  turn: {                                                          // N: усе списки
    beforeAdvance: readonly TurnHook[]; onTurnStart; onTurnEnd; onRoundStart; onSkippedTurn; onJoin;
  };
  conditions: RuleSystemConditions;                                // R: обов'язковий
  magic?: {                                                        // R
    resource: { canCast(caster, spell, level): Reason | null; spend(caster, spell, level): BattleParticipant };
    saveDc?; upcast?; sustain?: { begin; drop };
    castTest?; castPreview?; channel?; miscast?; attribute?; badge?; ingredients?; avertMiscast?;
  };
  abilities: {                                                     // N
    variables: readonly VariablesHook[];                           // зливаються словником; колізія імені — помилка
    sources: readonly AbilitySource[]; recipes: readonly Recipe[];
  };
  participant: {                                                   // N, списки: постобробка нейтрального учасника
    fromCharacter: readonly ParticipantHook[]; fromUnit: readonly ParticipantHook[]; persist: readonly PersistHook[];
  };
  equipment?: { layout; armourAp? };                               // R
  advancement?; traits?; identity; lineage; attacks; spells; items; inventory;   // E
}
type TurnHook = (ctx: TurnCtx) => TurnPatch | undefined;
interface TurnPatch { participants?; messages?; actions?; pending?: unknown | null; skipTurn?: true; downed?: string[] }
```

Видаляються: `d20Stats`, `classes` (прапорець), `characteristics`, `combat.baseStats/participantFields/mitigateDamage/fortune`, `resources.fortuneOf`, `conditions.turnStart/skippedTurn`, `traits.psychology` (→ `turn.onJoin`), `magic.onDamaged`, `magic.slots`, `unusedMechanics`.

Назви класифікаторів згорнуто так: `attackPipeline` → `resolveAttack`; `onDamage/damageRows/critEffects/mitigateDamage` → `damage`; `coreActions/maneuvers/operations` → `actions`; `ammo` — core; `clientFlow` → `combat.input` + UI; `checks.save` → `magic.saveDc` і `sheet.test`; `magic.cost/concentration/cast` → `magic.resource/sustain/castTest`; `progression.proficiency` — не слот; `turn.hooks.*` → `turn.*`; `balance.model` → `hitModel`; `effects.lifetimeBinding` → `magic.sustain`; `fx.diceSource` → `combat.details.diceFx`; `items.sets` → `abilities.sources`; `characters.foreignFields/initialSheet` → `stats.columns/initial`; `unitSchema`, `kindImport` → `SystemServer.contentKinds`.

```ts
interface SystemUi {
  battle: { HeroPanel; ParticipantStats; panels: readonly BattlePanel[]; dialogs: readonly BattleDialog[]; badges: readonly BadgeHook[]; notices: readonly TurnNotice[] };
  sheet: { tabs: readonly SheetTab[]; HeroStats; RollDialogBody };
  forms: { StatsFields; UnitStatsFields; fields: readonly FormFieldGroup[]; DraftForm? };
  rulesSections: readonly RulesSectionUi[]; dmPages: Record<string, DmPage>; contentForms: Record<string, ContentFormUi>;
}
interface SystemServer {
  schemas; operations; ai?;
  routes: { campaign: Record<string, SystemRoute>; character: Record<string, SystemRoute> };
  battle: Record<string, { schema: ZodType; mutation: BattleMutation }>;
  contentKinds: readonly ContentKindDef[];
}
interface SystemRoute { method; access: "member" | "owner" | "dm"; schema?; handle(ctx): Promise<Response> }
```

Модуль дає `DeepPartial` цих форм; виключні компоненти (`HeroPanel`, `StatsFields`) належать базі, модулі додають у списки (`panels`, `tabs`, `fields`, `dialogs`). Рядок ефекту отримує власника (`SystemEffectRow.system` = id модуля, заповнює генератор коренів); `traits-guard.ts` перевіряє `kind` проти активної композиції кампанії.

Загальні маршрути (3 файли замість 12 + боєвих): `…/[id]/system/[action]`, `…/characters/[characterId]/system/[action]`, `…/battles/[battleId]/system/[action]` (тіло → `runBattleMutation`). Кожен: сесія → `systemServerOf(rules)` (зібраний) → пошук дії (404 `SYSTEM_ACTION_UNKNOWN`; дія вимкненого модуля теж 404) → `access` → `parseBody` → обробник. Клієнт: `lib/api/system.ts`, хуки — у теці модуля. Старі URL живуть один реліз через `rewrites`.

**Без core-фолбеків.** Типи не дозволяють `undefined` в обов'язкових слотах; нейтральні заготовки (`noActions`, `noTurnHooks`, `dieAtZero`, `flatInitiative` у `lib/utils/rules/systems/neutral.ts`) нічого не знають про d20. `?? p.abilities.dexterity`, `maxHp null → клас/герой`, `conditions undefined → 5e`, `system?.key ?? "homm"`, `DEFAULT_RULES.system.key`, вгадування ключа — видаляються в частинах, де переїжджає правило.

## 7. Схема правил

**Зберігання плоске** (рішення власника 3): `Campaign.rules` = обʼєкт секцій + `system`. Власника секції визначає реєстр.

**Адреси.** Кожне налаштування має стабільний шлях `секція.пункт` (`morale.cap`, `morale.checkOn`, `actions.retaliation`, `criticals.critOn`). Секція — обʼєкт із під-ключами; пункт може бути скаляром або обʼєктом. Шляхи — публічний контракт: їх використовують розбір, патч, UI, sync шаблонів і AI-інструменти.

```ts
interface RulesItem<T = unknown> { schema: ZodType<T>; default: T; upgrade?(legacy: unknown): T | undefined }   // upgrade: старе значення іншої форми → нове
interface RulesSection {
  owner: string;                                  // id модуля або "core"
  items: Record<string, RulesItem>;               // під-ключі; модуль може додати пункт у чужу секцію через extendSection
  refine?(value: Record<string, unknown>): boolean;
  mechanic: boolean; playerHidden?: true;
}
```

- Розбір — **по пунктах**: відсутній або невалідний пункт → його `default` (через `upgrade`, якщо є), решта секції не страждає; зайві під-ключі не валять секцію. Так пункт-скаляр можна пізніше перетворити на обʼєкт із деталями без міграції даних: новий `schema` + `upgrade` для старої форми.
- Патч адресується шляхом і зливається вглиб по пунктах (зараз — поверхнево по секції); UI секції рендерить пункти за шляхами, тож вкладений пункт — це вкладений редактор, а не нова секція.
- `sectionsOf(composition)` = core + база + активні модулі. `parseRules` читає `system` → композицію → розбирає її секції. Секції й пункти **неактивних** модулів у результат не потрапляють, але у збереженому JSON **лишаються без змін** (`mergeRules` пише поверх сирого обʼєкта) — вимкнув і ввімкнув модуль, налаштування на місці.
- `RulesetPatchSchema`, `MECHANIC_REGISTRY`, вкладки `RulesForm`, `stripPlayerHiddenRules` будуються з того ж списку. `rulesHashes` лишаються по секціях.

Власники: **core** — `system`, `defaultAttacks`, `spellIngredients`, `outOfCombat.{persistResources,xp}`, `encounters.{balance,unitGroups}`, `items.enabled`; **d20** — `criticals`, `formulas`, `initiative`, `saves`, `deathSaves`, `concentration`, `conditions`, `actions.{enabled,opportunityAttacks,variant}`, `classes`, `outOfCombat.{longRestHitDice,inspiration}`, `encounters.{edition,autoXp}`, `items.attunementLimit`; **morale** — `morale.*`; **retaliation** — `actions.retaliation`; **heroscaling** — `heroScaling.*`; **wfrp** — `tables`, `advancement`. Наявні перемикачі `enabled` лишаються: активний модуль = механіка доступна, `enabled` = увімкнена.

**Типи.** Core `Ruleset` = `CoreRules`. Власник читає свої секції типізованим доступом (`d20Rules(rules)`, `moraleRules(rules)`); безпечно, бо `parseRules` провалідував секції композиції. Перехідний стан: поки код ще в core, типи видно з `lib/utils/rules/legacy-sections.ts` (лише типи), ratchet рахує читачів; файл видаляється у фіналі.

## 8. Реєстр ризиків збережених даних

| # | Форма | Що міняється | Стратегія | Відкат |
|---|---|---|---|---|
| D1 | `rules.system` відсутній у старих рядках | видаляється вгадування `classes.enabled ? dnd5e : homm` і типовий ключ | скрипт `backfill-rule-system`: dry-run → звіт → `--apply --allow-remote` за «так»; дописує `key` за правилом старої здогадки; код без здогадки — лише після `0 рядків без system` | бекфіл адитивний; старий код його читає |
| D2 | Кампанії `dnd5e`, де ввімкнена механіка Heroes (`morale.enabled`, `actions.retaliation`, нетиповий `heroScaling`) | механіка стає модулем, якого пресет `dnd5e` не має | той самий скрипт у режимі `--modules`: таким кампаніям дописує явний `modules` (напр. `["morale"]`), щоб поведінка не змінилась; виконується **до** деплою частини секцій; звіт показує кожну таку кампанію власнику | видалити `modules` тим самим скриптом (`--revert`); старий код після Ч1 їх ігнорує |
| D3 | `rules.system.modules` (нове поле) | expand-only | толерантний читач у Ч1 (перший деплой); запис — лише скриптом D2 і, пізніше, UI; невідомий id → помилка секції з причиною, не падіння | **поріг відкату коду — Ч1**: старіший код має `strictObject` і відкине рядок; після першого запису `modules` у prod нижче Ч1 не відкочуємось |
| D4 | Секції неактивних модулів у `Campaign.rules` | не читаються, але зберігаються | `mergeRules` пише поверх сирого JSON; тест: зберегти правила `dnd5e` з чужою секцією → секція на місці | revert коду; дані не чіпались |
| D5 | `rules.tables`, `rules.advancement` (wfrp); розбір по пунктах | місце схеми; гранулярніший фолбек (невалідний пункт → типове значення пункту, а не секції) | тест «розбір до = після» на 5 `rules.json` пакетів і всіх правилах prodcopy; розбіжності — у звіт до деплою | revert коду |
| D6 | `rulesHashes` (sync шаблонів) | набір механік залежить від композиції | невідомі ключі ігноруються; sync-diff клонів SRD/Heroes/Grim на prodcopy до = після | revert коду |
| D7 | Знімок учасника: `battleData.{fortune,channelledSl,sin,conditionTests,psychologyTested}` (wfrp) | → `battleData.system` (слот `wfrp`) | dual-read (слот, інакше старі поля), запис лише слота; старі поля `@deprecated` один реліз; деплой лише коли в єдиній активній кампанії немає активного бою (скрипт `active-battles-report`) і за окремим «так» | скрипт `battle-state-downgrade` (слот → старі поля для активних боїв), потім revert коду |
| D8 | Знімок учасника: `battleData.{deathSaves,inspiration,inspirationSpent,attackedWithLight}`, лічильники відсічі | → слот бази `d20` + `ext[module]` | те саме; окрема частина після D7 і спостереження; та сама умова «немає активного бою» + окреме «так» | як D7 |
| D9 | `battle_scenes.pendingMoraleCheck`, `pendingCritChoice` | у сховищі нічого; у TS — непрозоре `pending`, тлумачить власник; якщо модуль `morale` вимкнули (це можливо лише без активного бою) — поле завжди `null` | форма payload незмінна; тест на бій prodcopy з очікуваною перевіркою моралі | revert коду |
| D10 | `battle_scenes.system_state`, M4 | дельта шле `scene.system` лише при зміні, `null` = очищення | клієнт приймає обидві форми | revert коду |
| D11 | Журнал бою, кодек `["q","d20"]`, `actionType` (`MORALE_SKIP`, `RETALIATION`), `actionDetails` | нічого: словник core | golden-тест: 3 реальні журнали декодуються й рендеряться однаково | не потрібен |
| D12 | Колонки `characters`, `units`, `battle_participants` | нічого: пишуть `stats.columns` бази й модулів тими самими значеннями; при вимкненому модулі його колонки не перезаписуються | тест «create/patch до = після» для `dnd5e`, `homm`, `wfrp` і `dnd5e + morale` | revert коду |
| D13 | JSON `abilities` (ефекти `kind`, прапорці моралі/відсічі) | рядки `kind` незмінні, змінюється власник | звіт: усі `abilities` prodcopy проходять схему композиції своєї кампанії; ефект вимкненого модуля в наявному рядку не відхиляється при читанні — рушій його пропускає, відхиляються лише нові записи | revert коду |
| D14 | Пакети шаблонів: `manifest.system`, `kinds`, slug-и, `rules.json`, `contentVersion` | файли й БД без змін; маніфест може (необов'язково) нести `modules`, інакше — набір пресета | `pnpm template import <key> --dry-run` × 5 на prodcopy: 0/0/0 | revert коду |
| D15 | Види контенту (`careers`, `classes`, `backgrounds`, `main-skills`, `skills`, `artifact-sets`) | реєструє база/модуль; таблиці без змін | рядки виду, якого композиція не має, не видаляються й не показуються; звіт на prodcopy | revert коду |
| D16 | Вимкнення модуля в живій кампанії | дані модуля стають «сплячими» (рядки, колонки, секції, `ext`) | нічого не видаляється; заборонено під час активного бою; `toggle: "setup"` вимагає підтвердження; тест «вимкнув → увімкнув → стан той самий» для кожного модуля | увімкнути модуль назад |
| D17 | URL API і сторінок ДМ | `/system/[action]`, `/dm/system/[section]` | `rewrites`/`redirects` на один реліз; OpenAPI й AI-інструменти в тій самій частині | revert коду |

Загальні правила: міграцій Prisma в E2 не заплановано (якщо знадобиться — expand-only, `CREATE TABLE` з RLS); кожен запис у prod — окреме «так» після бекапу й репетиції на prodcopy; частини з D1–D3, D7, D8 деплояться окремо від решти, по одній.

## 9. Не цілі

- Перейменування чи перенесення колонок Prisma, DROP боргів БД.
- Зміна збережених ключів `homm`/`dnd5e`, ключів шаблонів, slug-ів, формату журналу, значень `ActionType`.
- Перенесення d20-статблока з колонок у `characteristics`; вкладення секцій у `rules.system.data`.
- Повний екран «зібрати режим» (майстер, описи, попередній перегляд) — E2 дає шов і мінімальні перемикачі.
- Розбиття самої бази d20 на модулі (рятунки від смерті, концентрація, крити як окремі доповнення) і нейтральна «порожня» база як продукт.
- Модулі Heroes на базі `wfrp`.
- Minor 13, M5, E3, нові механіки, зміни балансу, звірка чисел wfrp із книгою.

## 10. Питання до власника

1. **База для режиму «з нуля».** У E2 «з нуля» означає: база `d20` (або `wfrp`) + будь-який набір модулів + перемикачі секцій. Нейтральної бази без d20-кубика як продукту немає (є лише тестова `d6pool`). Чи достатньо цього для запуску, чи «з нуля» має включати режим без d20-ядра? Рекомендую: достатньо; порожня база — окремий епік після запуску.
2. **Зерно модулів.** Запропоновано шість: `morale`, `retaliation`, `heroscaling` (з архетипами), `skilltrees` (з головними навичками й вивченням заклинань), `artifactsets`, `unitstacks`; лідерство — частина `morale` (бонус до моралі), джерело — ефект навички. Чи потрібне дрібніше ділення (напр. архетипи окремо від масштабування) або окремий модуль лідерства?
3. **Перемикання модулів у кампанії з героями.** Рекомендую: дозволено ДМ поза боєм; `heroscaling` і `skilltrees` — з явним підтвердженням (змінюють HP і прогресію), дані не видаляються. Чи прийнятно, чи ці два модулі мають блокуватись після створення першого героя, як `system.key`?
