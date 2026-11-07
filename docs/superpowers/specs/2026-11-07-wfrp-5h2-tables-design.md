# WFRP 5h-2: редаговані таблиці наслідків (spec)

Частина епіку WFRP (`feat/wfrp`, не мерджити в main). Попередні: [5h-1](2026-11-07-wfrp-5h1-design.md). Далі: 5h-3 Corruption/мутації, 5h-4 downtime/Character Events, 5g (шаблон, імпорт, sync).

## Мета

Таблиці критів, miscast і Wrath стають редагованим контентом кампанії. ДМ може змінити таблицю або виправити числа після звірки з книгою; офіційний шаблон «Grim d100» (5g) засіє їх власними рядками. Поведінка існуючих кампаній не змінюється. Критерій успіху: бій і каст на wfrp з порожньою секцією дають ті самі результати, що й зараз; з рядками кампанії — результати з її таблиці.

## Рішення (узгоджено з користувачем 2026-11-07)

- **Обсяг A:** крити за 4 локаціями, miscast minor/major, Wrath. `careerTable` профілю виду лишається як є (довідник посилань на кар'єри, не таблиця наслідків). Мутації й Character Events підключаться в 5h-3/5h-4 новими слотами.
- **Модель ефекту рядка — список з дискримінованим типом** (не `AbilityEffect` DSL і не плоскі поля).
- **Дефолти:** зашиті таблиці лишаються запасними; рядки кампанії перекривають слот. Без backfill.
- **Сховище — секція правил `rules.tables`**, не окремий вид контенту: `Ruleset` уже доходить до всіх споживачів (`MitigateCtx.rules`, `wfrpMiscast ctx.rules`, unit-library balance). Міграцій і нових таблиць БД немає.
- **Поза межами (5g):** імпорт CSV/JSON, шари й sync шаблонів для `tables` та `careers` — разом.

## Дані

`lib/utils/rules/tables-schema.ts`, секція `rules.tables` (за зразком `advancement-schema.ts`: `sectionSchemas`, `DEFAULT_RULES`, `patchSection`; поза `MECHANIC_REGISTRY`).

- Плоскі ключі слотів (`mergeRules` зливає секцію поверхнево): `critHead|critArm|critBody|critLeg|miscastMinor|miscastMajor|wrath`, кожен `Row[] | null | undefined`; `null`/відсутній = дефолт («Скинути» шле `null`). Дефолт секції `{}`.
- `Row = { max: 1..100, text?: string (≤200), effects: Effect[] (≤4) }`.
- `Effect` = `{type:"damage", amount}` | `{type:"wounds", amount}` | `{type:"condition", key, levels}` | `{type:"marker", key}`. `condition.key` — з каталогу станів wfrp, рівні 1–10; `marker` — відображувані крит-маркери без механіки (`winded|disarmed|crippled`), які не входять до каталогу.
- Валідація: `max` строго зростає, останній `max = 100`; ефекти за слотом: крити — `damage`, `condition`, `marker`; miscast і Wrath — `wounds`, `condition`.
- Нижня межа рядка не зберігається (обчислюється з попереднього `max`), тож прогалин і перетинів немає за побудовою.

## Рушій

- `resolveTable(rules, slot)` → рядки секції або зашиті дефолти в тому ж форматі (`CRIT_TABLE`, `MISCAST_TABLE`, `WRATH_TABLE` перетворюються на `Row[]`).
- `rollTable` не змінюється (`max`-формат). `rollCrit(location, rng, preset)` отримує `rules`; виклики в `combat/mitigate.ts` і `combat/on-zero-hp.ts` передають `ctx.rules`. `wfrpMiscast` читає через резолвер.
- Результат крита: `damage` → `bonusDamage`, `condition`/`marker` — списки через `applyWfrpCrit` (замість одного `markerKey`); `id` = `slot.index`.
- Журнал: зашиті рядки — i18n-ключі; рядок кампанії — звичайний рядок (`LogLine`/`TextArg` вже приймають рядок, нового `TextRef` не потрібно). Приховування miscast-рядків і `concealed`-станів для гравців не змінюється (ґрунтується на ключах `wfrpMagic.log.*`, не на тексті).
- Без правил кампанії (unit-library balance, чисті тести) — дефолти.

## Приховування від гравців

`readCampaignRules` для не-ДМ вирізає `tables`. Перевірити SSR/клієнтські копії правил (`useRuleSystem`, prefetch) — місце знайти в плані.

## Редактор

`components/rules/sections/TablesSection.tsx` (зразок `AdvancementSection`), лише ДМ і лише система wfrp: вибір слота; рядки з полем «до» й обчисленою нижньою межею; список ефектів (тип, значення); текст; додати/видалити рядок; «Скинути до дефолту» (видаляє слот із секції). Помилки схеми — біля рядка. Тексти — у DM-пакет поза `scope-size` (запас DM-пакета лише 0.4 KB).

## Помилки

Стандартні Zod-помилки через `parseBody` (`issues`); нових кодів `API_ERRORS` немає.

## Тести

- Схема: порядок `max`, останній 100, ефекти за слотом, межі полів.
- `resolveTable`: порожня секція → дефолт; перекриття слота.
- Рушій: crit/miscast/wrath з дефолтом ≡ поточна поведінка (регрес на зашитих даних); preset-кидок вибирає потрібний рядок кампанії; текст кампанії в журналі рядком.
- `readCampaignRules` вирізає `tables` для не-ДМ.
- Редактор: додавання/видалення рядків, скидання, помилки.
- Розмір `rules` із повними 7 слотами × ~20 рядків (малий, зафіксувати тестом).
- Гейт епіку (наприкінці): `battle-sweep` homm/dnd5e на prodcopy.

## Повторне використання

`rollTable`, `withDefaults`/`patchSection`, `AdvancementSection`, каталог станів wfrp, `dynamicTextRef`.

## Перше завдання плану

З'ясувати всі місця, де збирається/копіюється `Ruleset` для клієнта (SSR, prefetch, `useRuleSystem`), щоб вирізання `tables` для не-ДМ не мало дірок.

## Звірити з книгою

Числа зашитих таблиць крит/miscast/Wrath досі не звірені (див. єдиний список у `docs/architecture/rule-systems.md`); після 5h-2 ДМ може виправити їх у кампанії, а дефолти — окремою правкою.
