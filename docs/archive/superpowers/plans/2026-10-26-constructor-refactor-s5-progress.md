# S5 — rules, defaults і константи механік

Дата: 2026-10-26. Поточний статус: S5 завершено; S5.4 integrated evidence — у фінальному розділі. Нижче збережено історію незалежної реалізації.

- Вихідний HEAD `feat/constructor`: `73c5de1a1425e90dd4f160c1305c8138f128e72f`.
- Worktree: `/Users/silentfox/.codex/worktrees/d300/dnd-tracker-constructor`.
- Гілка: `refactor/constructor-s5-rules`.
- HEAD коду: `95181e74deaf8d9e6767c8dbc2ab0814d20b81da` — `refactor(rules): reuse canonical section and hero HP defaults`.
- Цей checkpoint зберігається наступним окремим документаційним комітом; його точний SHA: `git log -1 --format=%H -- docs/archive/superpowers/plans/2026-10-26-constructor-refactor-s5-progress.md`.
- Roadmap прочитано з вихідної папки: на старті він untracked і відсутній у зафіксованому HEAD. До S5 не копіювався й не редагувався.
- Пряме доручення користувача дозволило незалежну S5 паралельно із S1; загальні залежності S1/S4 не оголошуються виконаними цією сесією.

## Виконаний план і зміни

Застосовано `superpowers:using-git-worktrees`; native tool створив окремий worktree від зафіксованого SHA, після чого створено власну гілку. Прочитано `CLAUDE.md`, roadmap, архітектуру battle/abilities та пов’язані частини characters/content-api. Робоча копія першої сесії не редагувалася й її гілка не перемикалася.

- [x] Зафіксовано HEAD, створено ізоляцію, знайдено consumers і отримано baseline.
- [x] Побудовано карту правил та класифіковано дублікати за власником і семантикою.
- [x] До extraction додано й виконано 12 characterization-тестів непокритих контрактів.
- [x] `lib/utils/rules/schema.ts`: 39 literal defaults замінено застосуванням `DEFAULT_RULES` до 15 секцій через приватний `withDefaults`. Constraints збережено в `sectionSchemas`; тип `Ruleset` виводиться з них до підстановки defaults, щоб уникнути циклу типів `DEFAULT_RULES → Ruleset → schema → DEFAULT_RULES`. Публічні schema input/output та JSON Schema збережено.
- [x] `lib/constants/hero-scaling.ts`: прибрано дублікати `HP_BASE_LEVELS = 3` і `HP_CON_COEFFICIENT = 1.5`; стандартний аргумент HP береться через чинний `heroHpFormula(DEFAULT_RULES.heroScaling)`. Формула, округлення, clamp, архетипи й розкладка не змінені.
- [x] `lib/utils/rules/__tests__/compatibility.test.ts`: fallback секцій, unknown keys, параметри disabled mechanics для 2014/2024, пустий patch, явний `undefined`, міжпольові обмеження та точні issue paths/messages.
- [x] Тести consumers, TypeScript, lint, diff/scope та окремий read-only review пройдено.

`defaults.ts`, `registry.ts`, `formulas.ts` і чотири інші дозволені constants-модулі залишилися без змін. `parseRules`, `mergeRules`, refinements, структура JSON, ідентифікатори механік і labels не змінювалися. Нових public exports немає.

## Карта mechanic → schema/default → engine → UI/API

У кожному рядку schema/default — відповідні поля `sectionSchemas.<mechanic>` і `DEFAULT_RULES.<mechanic>`. Усі значення `Ruleset` є campaign-editable; defaults є стандартною політикою для відсутніх/некоректних даних, а не примусовим значенням для кожної кампанії.

Спільний вхід усіх рядків: `components/rules/RulesForm.tsx` → `useRulesForm` → `PATCH /api/campaigns/[id]/rules` → `CONTENT_OPERATIONS["rules.update"].body = RulesetPatchSchema` → `updateCampaignRules` → `mergeRules`. REST, content/OpenAPI, MCP `get_rules` / `update_rules` та assistant preview використовують чинні контракти; їхній код не редагувався. У patch поле має шлях `<mechanic>.<field>` із таблиці.

| Mechanic | Editable schema/default | Engine / server consumer | UI / контентний вхід |
| --- | --- | --- | --- |
| `morale` | `enabled=true`, `cap=3` | `moraleCapFromRules`; participant/from-character, from-unit; battle/morale, turn | `MoraleSection`, patch `morale` |
| `criticals` | `critOn=20`, `fumbleOn=1`, `effects=true`, `doubleDice=false`, два порожні disabled-списки | battle/attack/roll, crit-dice, attack-phase; ефекти критів | `CriticalsSection`, patch `criticals` |
| `formulas` | `saveDcBase=8`, `proficiencyBase=2`, `proficiencyEvery=4` | `proficiencyForLevel`, common/calculations `spellcastingDerived`, participant/from-character, from-unit | `FormulasSection` використовує той самий proficiency helper; patch `formulas` |
| `heroScaling` | дві nullable таблиці; `hpBaseLevels=3`, `hpConCoefficient=1.5` | `heroDiceTable`, `heroHpFormula`; constants/hero-scaling; characters/hero-hp; participant і damage | `HeroScalingSection`, `DiceTableEditor`, character cards/sheet; patch `heroScaling` |
| `initiative` | `heroMin=10`, `heroMax=16` | server/characters/operations/create, patch перевіряють campaign bounds; `clampHeroInitiative` | `InitiativeSection`, `CharacterCombatParams`; patch `initiative` |
| `defaultAttacks` | `meleeName="Звичайний удар"`, `rangedName="Звичайний постріл"` | participant/extract-attacks, from-character | `DefaultAttacksSection`, patch `defaultAttacks`; це редаговані назви, не immutable labels |
| `saves` | `proficiency=false` | battle/saves/roll-save; майстерність із персонажа/abilities | `SavesSection`, patch `saves` |
| `deathSaves` | `enabled=false`, `unitsDieAtZero=true` | battle/damage/consequences, death-saves, turn/start-end | `DeathSavesSection`, battle participant/view; patch `deathSaves` |
| `concentration` | `enabled=false`, `dcCap=null` | battle/concentration, damage/consequences; DC = min(cap, max(10, floor(damage/2))) | `ConcentrationSection`, spell/concentration UI; patch `concentration` |
| `conditions` | `enabled=false`, `exhaustion="2014"` | battle/conditions/apply/registry; варіант фіксується на ефекті; engine обробляє наявні стани незалежно від меню | `ConditionsSection`, DM ConditionsDialog, ability editor; patch `conditions` |
| `actions` | `enabled=false`, `opportunityAttacks=true`, `variant="2014"` | battle/actions availability/run/grapple/opportunity/movement; спільні availability helpers | `ActionsSection`, CoreActionsDialog; patch `actions` |
| `classes` | `enabled=false` | server/characters/apply-classes, class-level-up; characters/classes, spells/class-slots, participant/from-character | `ClassesSection`, ClassBasicsTab, CharacterClassesField; rules patch плюс classes content schema |
| `outOfCombat` | `persistResources=false`, `longRestHitDice="half"`, `xp=false`, `inspiration=false` | characters/resources, rest; battle/store/persist-resources, attack/inspiration | `OutOfCombatSection`, sheet/rest/resources UI; patch `outOfCombat` |
| `encounters` | `balance="fair"`, `edition="2014"`, `autoXp=false` | battle balance/XP, turn/battle-xp, store/persist-xp | `EncountersSection`, battle setup balance hooks; patch `encounters` |
| `items` | `enabled=false`, `attunementLimit=3` | participant/extract-artifacts/extract-attacks, server/characters/operations/stash-update, sheet-handler | `ItemsSection`, stash/attunement/resources; patch `items` плюс artifacts content schema |

`MECHANIC_REGISTRY` володіє переліком механік і незмінними UI `label`/`description`; він типізований через `MechanicKey = keyof Ruleset`. Templates/sync/hash і classify використовують цей реєстр для section hashes/labels. Повторний список механік чи name-based dispatch не додавався.

## Власники constants і перевірка семантичної тотожності

| Кандидат / власник | Consumers / висновок |
| --- | --- |
| Literal defaults у schema та `DEFAULT_RULES` | Підтверджений дубль однакової політики для всіх 39 полів. Власник значень — `DEFAULT_RULES`, власник допустимих значень і помилок — schema. Усунуто. |
| Коефіцієнти HP у hero-scaling та `DEFAULT_RULES.heroScaling` | Підтверджений дубль: обидва задавали стандартні 3 і 1.5. Використано наявний `heroHpFormula`, custom аргументи збережено. |
| `classes.ts`: `CLASS_CASTERS`, `HIT_DICE`, `MAX_CLASS_LEVEL`, `MAX_CLASS_COLUMNS`, `CLASS_COLUMN_KEY_RE`; `CLASS_CASTER_LABELS` | Immutable vocabulary/структурні межі та labels; конкретні класи, features, columns, caster й hit die — редаговані campaign content. Constants уже читають schema/classes, row parser, editor і class-slots. Є реальний дубль hit-dice union у `lib/schemas/classes.ts:71` і типі `types/classes.ts`; обидва поза S5, залишено на інтеграційну задачу з перевіркою error/JSON-schema compatibility. |
| `choices.ts`: `CHOICE_KINDS`, `FEAT_TYPES`, `CHOICE_ID_RE`, `CHOICE_LIMITS`, labels | Уже спільні для schema/choices/feats, reader та ChoiceListEditor/FeatBasicsTab. Опції, кількість виборів, вимоги й ASI — дані контенту; немає нового підтвердженого runtime-дубля в дозволених файлах. Однакові числа для `picks`, `count`, `max`, `characterFeats` мають різний зміст. |
| `spells.ts`: labels/helpers, `SPELL_NAME_MAX`, `SPELL_IDS_QUERY_MAX`, `DEFAULT_SPELL_SLOT_PROGRESSION` | Labels спільні для model/labels і form; query/name limits спільні для API/schema/UI. Порожня HOMM-прогресія рас 1–5 не тотожна 5e слотам/колам 0–9: не об’єднувати. Persisted spell definition enum-и належать spells/model/schema, labels не є схемою валідації. |
| `weapon-traits.ts`: `WEAPON_TRAITS`, `WeaponTrait`, `parseWeaponTraits`, labels | Спільні для units schema, weapon-stats, item composition, extract-attacks, UI. Array max=7 у schemas — дубль поточної cardinality поза S5; перетворення union/type або validation representation в цій сесії не робилося. |
| `hero-scaling.ts`: fallback dice table 1–20 | Immutable HOMM-прогресія, яку campaign може частково перевизначити; відсутній рівень добирається зі стандартної таблиці. Її межа 20 не об’єднувалася з `MAX_CLASS_LEVEL`: це різні доменні власники. |
| Межі полів rules у schema та `components/rules/sections/*` | Підтверджені повтори UI ranges, наприклад morale 1–10, initiative 0–50, attunement 1–10. Власник допустимості — rules schema; UI поза дозволеною областю, extraction спільних ranges залишено до задачі з UI consumers. Не додано невикористаних constants. |
| `getProficiencyBonus` і `proficiencyForLevel` | Тотожні на цілих рівнях 1–20 зі стандартними параметрами; не тотожні для нульових/від’ємних/дробових значень, rules helper також підтримує campaign overrides. Common calculations поза S5, не замінювалися. |
| `saveDcBase=8`, initiative fallback 10–16 та інші fallbacks поза scope | Повтори є в common/calculations, battle/balance/stats, characters constants/UI. Потребують окремого review їхніх вхідних контрактів та дозволу на файли; у S5 не змінювалися. |
| `2014` / `2024` у conditions/actions/encounters | Однаковий набір рядків описує різні незалежно редаговані аспекти правил. Не створено нового глобального enum усіх варіантів і не нав’язано синхронізації між полями. |

## Сумісність і перевірки

У новому worktree використано symlink `node_modules` на вже встановлені залежності вихідного checkout. Env-файли не копіювалися. DB/integration, browser, provider та зовнішні сервіси не запускалися; реальна БД не входить до цих доказів.

| Перевірка | Результат |
| --- | --- |
| Baseline: `pnpm exec vitest run lib/utils/rules/__tests__ lib/constants/__tests__ lib/schemas/__tests__/constructor-fields.test.ts components/rules/__tests__` | exit 0; 25 файлів, 83 тести passed, skipped 0 |
| Baseline: `pnpm exec tsc --noEmit --incremental false` | exit 0 |
| Нові characterization-тести до extraction: `pnpm exec vitest run lib/utils/rules/__tests__/compatibility.test.ts` | exit 0; 12/12 passed; чинна поведінка зафіксована до змін |
| Фінальний цільовий прогін: baseline команда плюс `lib/utils/characters/__tests__/hero-hp.test.ts lib/utils/characters/__tests__/hero-hp-rules.test.ts` | exit 0; 28 файлів, 101 тест passed, skipped 0; лог `/tmp/constructor-s5-final-targeted.log` |
| `pnpm test:related lib/utils/rules/schema.ts lib/constants/hero-scaling.ts` | exit 0; 665 файлів, 4682 тести passed, skipped 0; лог `/tmp/constructor-s5-related.log` |
| Фінальний `pnpm exec tsc --noEmit --incremental false` | exit 0; проміжний цикл типів під час extraction усунуто в приватному helper, кінцевих TS помилок немає |
| `pnpm exec eslint lib/utils/rules/schema.ts lib/constants/hero-scaling.ts lib/utils/rules/__tests__/compatibility.test.ts` | exit 0, errors/warnings 0 |
| `git diff --check` | exit 0 |
| Окремий read-only review (`superpowers:requesting-code-review`) | Critical/Important/Minor: 0; declined-to-judge: порожньо |

Пов’язаний suite включав чинні перевірки `load-battle-rules`, `from-character-*`, morale/crit/hero-dice/formulas, conditions 2014/2024, grapple, death-saves, concentration, schemas, content/OpenAPI, character/UI consumers. Він підтвердив frozen rules: prepared бере campaign rules, active читає копію бою, старий active без копії — defaults.

У broad related suite були stderr-повідомлення тестових негативних сценаріїв, Radix accessibility/Node punycode warnings та заблокована мережева спроба до localhost:3000 (`EPERM`); suite завершився exit 0 без failed/skipped. Мережевий доступ не розширювався: це unit-перевірка, а не доказ роботи live server. Цільовий S5 suite цих повідомлень не мав.

Reviewer незалежно порівняв baseline і поточний schema: inline Node script завантажував `git show 73c5de1a:lib/utils/rules/schema.ts` і поточний файл через `typescript.transpileModule` / `vm.runInNewContext` зі спільними Zod/default dependencies. Збіглися 1939 випадків `parseRules`, full/patch validation outputs/issues та допустимих `mergeRules`; `z.toJSONSchema` для full/patch в input/output modes збігся byte-for-byte. Це разовий read-only експеримент, не новий tracked runner.

Контракти: fallback діє на всю невалідну секцію, решта секцій зберігаються; unknown top-level keys ігноруються читачем, вкладені ключі strict; patch не додає defaults пропущеним полям; явний `undefined` у полі при merge використовує default, як і раніше; disabled механіки зберігають параметри та валідуються. Часткові initiative/criticals patches перевіряються на злитому об’єкті, messages і paths незмінні. Формули й defaults не переналаштовувалися.

Продуктивність не вимірювалася: extraction усуває дублювання значень; прискорення, p50/p95 чи зменшення SQL не заявляються. Повний suite, production build та DB/browser перевірки не запускалися; це цільова незалежна S5, загальна регресія серії залишається S10.

## Public exports

Імена та структурні контракти збережено:

- `rules/defaults`: `DEFAULT_RULES`.
- `rules/formulas`: `proficiencyForLevel`, `heroDiceTable`, `heroHpFormula`, `moraleCapFromRules`.
- `rules/registry`: `MECHANIC_REGISTRY`; типи `MechanicKey`.
- `rules/schema`: `RulesetSchema`, `RulesetPatchSchema`, `parseRules`, `mergeRules`; типи `Ruleset`, `RulesetPatch`, `MergeRulesResult`.
- `rules/index`: чинні reexports defaults/formulas/registry та type-only `Ruleset`, `RulesetPatch`.
- `constants/classes`: `HIT_DICE`, `CLASS_CASTERS`, `CLASS_CASTER_LABELS`, `MAX_CLASS_LEVEL`, `CLASS_COLUMN_KEY_RE`, `MAX_CLASS_COLUMNS`; тип `ClassCaster`.
- `constants/choices`: `CHOICE_KINDS`, `FEAT_TYPES`, `CHOICE_KIND_LABELS`, `FEAT_TYPE_LABELS`, `CHOICE_ID_RE`, `CHOICE_LIMITS`.
- `constants/spells`: `DEFAULT_SPELL_SLOT_PROGRESSION`, `SPELL_IDS_QUERY_MAX`, `ROMAN_NUMERALS`, `spellLevelName`, `spellLevelFromName`, `spellLevelRoman`, `spellSchoolColor`, `SPELL_COST_LABELS`, `SPELL_TARGETING_LABELS`, `TEMPLATE_SHAPE_LABELS`, `SPELL_SAVE_ON_SUCCESS_LABELS`, `labelOptions`, `SPELL_NAME_MAX`.
- `constants/weapon-traits`: `WEAPON_TRAITS`, `WEAPON_TRAIT_LABELS`, `parseWeaponTraits`; тип `WeaponTrait`.
- `constants/hero-scaling`: `getHeroMaxHpBreakdown`, `getHeroDamageDiceForLevel`; типи `HeroScalingOptions`, `HeroHpFormula`.

`sectionSchemas` і `withDefaults` приватні. Нові imports hero-scaling ведуть прямо до чистих rules/defaults і rules/formulas. У rules немає runtime imports із server/DB/React; defaults/formulas/registry мають лише type imports schema. Нового runtime import cycle немає.

## Залишки й інтеграція

Для майбутньої інтеграції код і тести S5 повністю містяться в коміті `95181e74deaf8d9e6767c8dbc2ab0814d20b81da`, поверх вихідного `73c5de1a1425e90dd4f160c1305c8138f128e72f`. Файли коду: лише `lib/utils/rules/schema.ts`, `lib/constants/hero-scaling.ts`, `lib/utils/rules/__tests__/compatibility.test.ts`. Наступний коміт додає тільки цей checkpoint.

Наступна задача після S1 та узгодження загальної серії: інтегрувати S5 у вибраному порядку й повторити related/TypeScript на сумарному HEAD перед S6/S7. Дублікати поза scope наведені в таблиці власників; вони не є підтвердженими дефектами гри. Стабільність assistant adapters, security findings S1 і працездатність live БД/браузера ця сесія не перевіряє.

Заборонені користувачем файли, спільні docs, roadmap, README, STATUS, package/lockfile і Prisma не редагувалися. Merge/push/deploy не виконувалися. Worktree та гілка залишені для review/інтеграції.

## S5.4 — закриття на integrated HEAD (2026-10-27)

Поточне доручення: послідовно виконати всі залишки серії. Worktree уже isolated, branch `feat/constructor`, combined code HEAD `7c7dfb4a905a3c387f54b4d0b8bf5ccbc9fde7f1`. S1 `5c2d7e7d` і S5 `95181e74` — ancestors (exit 0); повторного merge немає.

- [x] S5.4: named consumer команда плану — 16 suites, 99 passed, 0 failed/skipped, exit 0.
- Додатковий `load-battle-rules.test.ts` — 4 passed, exit 0: prepared бере campaign rules; active бере frozen rules; legacy active без копії — defaults.
- `pnpm exec tsc --noEmit --incremental false` — exit 0; ESLint трьох S5 TS files із `--max-warnings=0` — exit 0; `git diff --check` — exit 0.
- Raw logs: `.superpowers/sdd/2026-10-26-constructor-refactor-s10-final-review/{s5-4,s5-frozen,initial-tsc}.log`.
- Downstream duplicates із таблиці власників передано S6/S7/S8: domain limits/labels і default fallbacks не є автоматично тотожними; змін payload/defaults не робимо. S6/S7 вже зберегли відповідних owners, UI ranges — окремий backlog без gameplay змін.

S5 завершено після перевірки об’єднаного стану. Історичний запис про очікування інтеграції вище більше не є current status. Наступне — S6.4; full suite/build залишаються S10.
