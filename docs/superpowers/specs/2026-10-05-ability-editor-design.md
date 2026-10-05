# Система умінь, частина 3b: редактор умінь з реєстру

- **Дата:** 2026-10-05
- **Статус:** дизайн погоджено, очікує ревʼю спеки
- **Скоуп:** один редактор умінь у формах скіла, артефакту, сету, раси і юніта; вбудовані шаблони; «Скопіювати з…»; запис колонки `abilities` напряму і кінець подвійного запису; описи вмінь на картках; імунітети юнітів і персонажів як механіка бою.
- **Поза скоупом:** CSV-імпорт (3c), contract-міграція, `ResponsiveDialog` і bottom sheet (пункт 4 roadmap).
- **Основа:** `docs/superpowers/specs/2026-10-05-ability-system-core-design.md` (модель, реєстр, виконавець).

## 1. Контекст

Після 3a бій читає лише уміння `abilities`. Редагують їх чотири старі редактори, які пишуть старі поля: `skillTriggers`, `combatStats.effects`, `bonuses`, `passiveAbility`, `setBonus` і `specialAbilities`. Після кожного запису `legacy/sync.ts` перераховує `abilities` з цих полів. Наслідки:

- Ліміти, шанс, умови, аури та більшість видів ефектів DM задати не може: старі форми їх не мають.
- Якщо редактор почне писати `abilities` напряму, будь-який частковий PATCH затре зроблене. Приклади: зміна головного скіла з картки, `UnitQuickStatsEditor`.
- GET-запити для редагування не віддають `abilities`. Цього поля немає і в клієнтських типах.
- Імунітети юнітів і персонажів (та расові, витягнуті з опису) лише показуються, у бою вони нічого не роблять.
- У формі скіла поля мін./макс. цілей пишуться в `combatStats.min_targets`, тож бій і конвертер їх не бачать.
- У формі скіла порожні значення надсилаються як `undefined`, і прив'язку заклинання чи головного скіла неможливо зняти.

**Мета.** DM налаштовує будь-яке вміння, яке вміє рушій, у будь-якому власнику. Це має бути зручно на телефоні: типові вміння — за два тапи з шаблону. Гравець бачить зрозумілий опис.

**Критерії успіху:**
- У п'яти формах один `AbilityListEditor`. Старі редактори ефектів, тригерів, бонусів і спецздібностей видалені.
- Будь-яку валідну за `AbilitySchema` річ можна створити й відредагувати в UI.
- Кожен шаблон дає валідне вміння (тест).
- Помилки валідації видно біля конкретного поля, і збереження з помилками неможливе.
- `legacy/sync.ts` видалено. PATCH без `abilities` колонку не змінює (тест).
- Юніт з імунітетом «вогню» не отримує вогняної шкоди, на нього не накладається вогняний DOT, а з «контролю» на нього не діють стани (тести).

## 2. Інтерфейс

**Розміщення: акордеон у формі** (варіант A з брейншторму).
- Секція «Вміння (N)» з кнопкою «+ Вміння».
- Згорнуте вміння займає один рядок: назва і `describe` усіх ефектів.
- Розгорнуте вміння показує на місці, одна під одною, чотири секції: **Коли** (тригер), **Умова**, **Ліміти**, **Що робить** (ефекти).

**Ефект — картка з полями** (варіант A).
- Зверху вибір виду ефекту зі списку реєстру.
- Нижче — підписані поля з `fields` реєстру.
- Внизу підсумок `describeEffect`, у кутку кнопка ✕.
- Кнопка «+ ефект» додає новий ефект зі значеннями за замовчуванням для виду (за замовчуванням `modifyStat`).

**«+ Вміння» відкриває `Dialog` з шаблонами:**
- Пасивний бонус статів;
- Бонус шкоди;
- Ефект при влучанні;
- Опір / імунітет;
- Аура;
- Раз за бій: вижити з 1 HP;
- Бонусна дія;
- Слоти заклинань;
- Власне — порожнє вміння.

Останній пункт — **«Скопіювати з…»**. Він відкриває пошук серед скілів, артефактів, сетів, рас і юнітів кампанії. Назви беруться зі списків, бо там `abilities` не віддається. Уміння вибраної сутності довантажуються окремим запитом, отримують нові `id` і додаються до поточних.

**Плашка «Перенесено зі старого формату».** Показується, якщо колонка була `NULL` і вміння отримано конвертером. Містить список issues конвертера, наприклад «текстова умова не автоматизована». Плашка зникає після збереження.

**Поведінка при помилках.**
- Початкові дані можуть бути невалідними, наприклад після конвертації. Редактор однаково їх показує, а помилки ставить біля полів за `path` помилок Zod.
- Кнопка збереження форми вимкнена, доки є помилки, і показує їхню кількість.
- Невідомий вид (якого немає в реєстрі) показується карткою «Невідомий ефект» з JSON лише для читання і кнопкою ✕.

**Що лишається у формах поза редактором:**

| Форма | Лишається | Замінено редактором |
|---|---|---|
| Скіл | назва, опис, іконка, головний скіл, прив'язка заклинання, покращення заклинань | `SkillEffectsEditor`, `SkillDamageAffinity`, `SkillTriggersEditor`, мін./макс. цілей |
| Артефакт | назва, опис, рідкість, слот, іконка, сет | сітка бонусів, модифікатори, пасивні ефекти, аудиторія, імунітет до заклинань |
| Сет | назва, опис, іконка, учасники | `ArtifactSetBonusEditor`: бонуси, модифікатори, слоти, пасивки, аудиторія, імунітети |
| Раса | назва, доступні скіли, правила характеристик, прогресія слотів, опис | нова секція «Вміння в бою» |
| Юніт | усе, крім спецздібностей | `UnitSpecialAbilities` |

Картки та покази (`SkillCard`, `SkillCardEffectsList` / `TriggersList`, друк скілів, `ArtifactSetBonusDisplay`, `UnitCard`) рендерять уміння через `describeEffect` і підпис тригера з реєстру.

## 3. Компоненти

```
components/abilities/
  AbilityListEditor.tsx        value: Ability[], onChange, issues?: ConversionIssue[], onValidityChange?(ok), serverErrors?
  AbilityRow.tsx               акордеон одного вміння
  sections/{Trigger,Condition,Limits,Effects}Section.tsx
  EffectCard.tsx               вид ▾ + поля + підсумок + ✕
  effect-renderers/{Flag,RandomOf}Editor.tsx   власні рендерери (підвид прапорця, вкладені варіанти)
  fields/FieldRenderer.tsx     за FieldMeta.input → один з інпутів нижче
  fields/{Number,Text,Select,Toggle,Amount,Flat,Target,Duration,NumberList,SpellPicker}Field.tsx
  AbilityTemplatePicker.tsx    Dialog: шаблони + «Скопіювати з…»
  AbilityCopySourcePicker.tsx  пошук по сутностях кампанії
  AbilitySummary.tsx           describe-рядки для карток (read-only)

lib/utils/abilities/
  templates.ts                 ABILITY_TEMPLATES: { id, label, hint, build(): Ability }
  editor.ts                    newEffect(kind), newTrigger(event), changeEffectKind(e, kind), changeTriggerEvent(t, event),
                               setAtPath(obj, "filter.kind", v), validateAbilities(list) → { ok, errorsByPath }, withFreshIds(list)
  registry/fields.ts           FieldInput += "toggle" | "numberList" | "spells"; FieldMeta.name підтримує шлях "a.b"
```

**Реєстр** доповнюється так, щоб `fields` описували **всі** поля схеми:
- `modifyStat`: додаються `attackKind` (лише коли `stat === "attackBonus"`) і `spellLevels` (лише для `spellSlots`). `FieldMeta.visibleWhen?: (effect) => boolean`.
- `heal.revive` стає `toggle`.
- Прапорець: поле підвиду і поля кожного підвиду (`attackKind`, `damageType` + `percent`, `spellIds`, `attackKinds` + `bonusPercent`) — у `FlagEditor`.
- `conditionImmunity` (новий підвид прапорця, §5): поле `conditions: "all" | Array<CONDITION_KEYS | "fear">`.

Тест-контракт реєстру перевіряє, що кожен ключ кожного Zod-об'єкта ефекту, тригера й умови (крім `kind`, `event`, `type`) має `FieldMeta` або власний рендерер.

**Стан і зміни.**
- `AbilityListEditor` — контрольований компонент.
- Зміни поля йдуть через `setAtPath`.
- При зміні виду ефекту чи події тригера `changeEffectKind` / `changeTriggerEvent` переносять сумісні поля (`target`, `duration`) і заповнюють значення за замовчуванням.
- `validateAbilities` викликає `AbilitiesSchema.safeParse` і повертає `errorsByPath` за ключем `"3.effects.1.amount"`.
- Форми зберігають `abilities` у власному `useState`, як і решту полів.

## 4. API і дані

**Читання для редагування.** Ці точки віддають `abilities` (колонка або конвертер) і `abilityIssues` (лише якщо колонка `NULL`):
- `GET /skills/:id` через `format-skill-response`;
- `GET /artifacts/:id`, `GET /units/:id`;
- сторінки редагування раси (`dm/races/[raceId]`) і сету (`dm/artifact-sets/[setId]`).

Списки не змінюються, `abilities` у них не віддається. У типи `GroupedSkill`, `Unit`, `Race`, а також у типи артефакту й сету в `lib/api` додаються `abilities?: Ability[]` і `abilityIssues?: ConversionIssue[]`.

**Запис.**
- POST і PATCH для skills, races, artifacts, artifact-sets і units приймають `abilities: AbilitiesSchema` (опційне).
- Помилка дає 400 з `issues: [{ path, message }]`. Форма мапить їх на поля так само, як локальну валідацію.
- Старі поля вмінь прибираються зі схем створення й оновлення: `skillTriggers`, `combatStats.effects / affectsDamage / damageType / min_targets / max_targets`, `bonuses`, `passiveAbility` (крім опису раси), `setBonus` (крім назви й опису сету), `specialAbilities`.
- Роути більше не пишуть плоскі legacy-колонки скіла (`damage`, `armor`, …).
- `legacy/sync.ts` і всі виклики `sync*Abilities` видаляються.
- Дублювання скіла копіює `abilities`.
- `units/import` і `scripts/import-skills-library.ts` і далі пишуть `abilities` через конвертер (до 3c).

**Опис раси й сету.** `Race.passiveAbility.description`, `statModifiers` і `statImprovements` та `ArtifactSet.setBonus.name / description` лишаються в старих колонках. Це не вміння, а текст і правила для створення персонажа.

**Конвертер** (доповнення до 3a). `convertLegacySkill` переносить `combatStats.min_targets` і `max_targets` як окреме пасивне вміння з `modifyStat minTargets/maxTargets` і пише issue типу behavior: «раніше не діяло».

**Форма скіла.** Порожні значення прив'язок (заклинання, `grantedSpell`, головний скіл) надсилаються як `null`, а PATCH від'єднує зв'язок.

## 5. Імунітети як механіка бою

При побудові учасника береться список ефективних імунітетів:
- для юніта — `getUnitImmunities(unit, race)`;
- для персонажа — `getCharacterImmunities(character, race)`. Обидві функції об'єднують власний список і расовий з опису.

Список перетворюється на одне пасивне вміння з джерелом `{ type: "unit" | "character", id, name: "Імунітети" }`:

| Імунітет (нормалізований: нижній регістр, без пробілів довкола) | Ефект |
|---|---|
| вогню, вогня, вогонь, fire | `flag resistance { damageType: "fire", percent: 100 }` |
| отруєння, отрути, отрута, poison | `flag resistance { damageType: "poison", percent: 100 }` |
| магії, чарівництва, magic, spell | `flag resistance { damageType: "spell", percent: 100 }` |
| контролю, control | `flag conditionImmunity { conditions: "all" }` |
| страху, fear | `flag conditionImmunity { conditions: ["fear"] }` — блокує від'ємний `changeMorale` від умінь |
| сповільнення та інші | `note` «Імунітет: <текст>» |

`AbilitySource.type` отримує значення `"character"`.

**Нові правила рушія:**
- `flag conditionImmunity { conditions: "all" | Array<CONDITION_KEYS | "fear"> }`. `applyCondition` пропускає ціль з відповідним імунітетом і пише в лог «⛔ … імунітет». `changeMorale` з `delta < 0` пропускає ціль з `fear` або `all`.
- `dot` не накладається на ціль, у якої `getCombinedResistancePercent(target, damageType) >= 100`. Лог: «⛔ … імунітет до <тип>».
- Імунітет до шкоди від заклинань уже працює через `resistance spell` + `fromSpell`.

## 6. Тести

- **`templates.ts`:** кожен шаблон проходить `AbilitySchema`, а `describe` не порожній.
- **`editor.ts`:**
  - `changeEffectKind` і `changeTriggerEvent` для кожної пари дають валідний результат;
  - `setAtPath` працює з вкладеними шляхами;
  - `validateAbilities` повертає правильні шляхи;
  - `withFreshIds` дає унікальні `id`.
- **Контракт реєстру:** кожне поле схеми має `FieldMeta` або власний рендерер.
- **Компоненти** (`// @vitest-environment happy-dom`, Testing Library):
  - `AbilityListEditor`: додати з шаблону → рядок з describe; розгорнути → змінити поле → describe оновився; ✕ ефекту і вміння; невалідне значення → помилка біля поля і `onValidityChange(false)`; плашка issues;
  - `AbilityTemplatePicker`: «Скопіювати з…» з моком `lib/api`.
- **Роути** (`app/api/__tests__`):
  - POST/PATCH з `abilities` пишуть колонку;
  - PATCH без `abilities` колонку не чіпає;
  - невалідні `abilities` дають 400 з path;
  - GET детальки з колонкою `NULL` повертає сконвертовані `abilities` і `abilityIssues`.
- **Бій:** юніт з «вогню» не отримує вогняної шкоди від атаки й заклинання, на нього не накладається вогняний DOT; юніт з «контролю» не отримує станів; юніт зі «страху» не втрачає мораль від умінь.
- **Конвертер:** `combatStats.min_targets` переноситься.
- **Форма скіла:** зняття прив'язки заклинання шле `null`.

## 7. Видаляється

- **Компоненти й хуки скіла:** `components/skills/form/{effects,triggers}/**`, `SkillDamageAffinity`, частини `useSkillForm*`, що стосуються ефектів, тригерів і цілей.
- **Артефакти й сети:** `components/artifacts/ArtifactCombatBonusFields.tsx`, `ArtifactEffectScopeFields.tsx`, `artifact-combat-draft.ts`; `components/artifact-sets/` — редактор бонусу (`ArtifactSetBonusEditor`, `ExtraBonusesField`, `ModifiersField`, `PassiveEffectsField`, `SpellSlotsField`) і `artifact-set-bonus-form.ts`.
- **Юніти:** `components/units/form/UnitSpecialAbilit{y,ies}.tsx`.
- **Інше:** `lib/constants/skill-triggers.ts` і невикористані частини `lib/constants/skill-effects.ts`, `lib/utils/abilities/legacy/sync.ts`, `skillCardFormatters.ts`, а також тести видалених компонентів.
