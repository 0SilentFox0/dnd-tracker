# WFRP 5f — спорядження (design)

Частина епіку WFRP (`feat/wfrp`, не мерджити в main). Попередня частина: 5e-3. Дослідження: `docs/superpowers/research/2026-11-03-wfrp-rule-system.md` §4.7, §8.

## Мета

Бій і лист wfrp враховують спорядження: AP броні по локаціях, щит, якості й вади зброї, reach, боєприпаси/Reload, гроші 12/20, вага. Зараз AP = 0 (`wfrpAbilitiesOf(..., armorAp)` без аргументу), щит не моделюється, штраф броні касту завжди 0.

## Рішення (затверджені)

- Предмет = існуючий `Artifact` (шари шаблонів, слоти, стеш, лог). WFRP-стати — нова колонка `artifacts.system_stats Json?` (default `null`, expand-only міграція; `ENABLE ROW LEVEL SECURITY` не потрібен, таблиця існує). d20/homm колонку не використовують.
- Схему стат задає `RuleSystemDefinition.equipment?` (як `creation?`): ядро не знає про wfrp, жодних `key === "wfrp"`.
- Усі числа, ціни, вага — стаби з `// verify against 5e book`.
- Новий текст: namespace `wfrpEquipment` у `WFRP_DM_EXTRA` (поза бюджетом scope-size: uk campaign+battle = 105.0/105 KB). Бойові рядки шкоди/щита — `battleWfrp.damage.steps.*`; `battleLog.json` без wfrp-ключів.
- Зношення — поза обсягом. Обтяження — лише радник на листі, без впливу на бій.

## Частини плану

### 5f-1 — дані, броня, щит, M11

- Міграція `artifacts.system_stats`; `lib/schemas/artifacts.ts` приймає `systemStats` і валідує його через `ruleSystemOf(rules).equipment.statsSchema` (тип d20 → поле відхиляється 400).
- `RuleSystemEquipment = { statsSchema, armourAp(equipped), weaponProfile, qualities }`; реалізація `WFRP_EQUIPMENT` у `lib/utils/rules/systems/wfrp/equipment/` (чисті модулі + тести). Схеми імпортуються через `.../systems/schemas` (не головний barrel: zod).
- `ArmourStats`: `locations {head, arms, body, legs}` (AP 0..8), `kind` (soft/mail/plate), `qualities[]`, `weight`, `price`. `WeaponStats`: див. 5f-2 (схема визначається тут цілком, поведінка — у 5f-2).
- `from-character` передає `armourAp(equippedArtifacts)` у `wfrpAbilitiesOf`; AP складається по шарах (сума по локації, кап у константі). `armourSl` (штраф броні касту) стає ненульовим; якість Flexible його скасовує.
- Щит (ruling): реакцій у wfrp-рушії немає, тож предмет із якістю Shield(X) додає +X AP на голову, руку й тулуб проти всіх атак. Стаб.
- DM-форма артефакта: слот `SystemUi.ArtifactStatsEditor` (ліниво через `next/dynamic`, щоб zod не потрапив у клієнтські entry-чанки; `client-entry-imports` тест має лишатися зеленим).
- Лист/інвентар показує AP по локаціях екіпірованого (read-only).
- M11: прапорець системи (напр. `identity.alignments: false`) ховає D&D-вирівнювання у wfrp-візарді.

### 5f-2 — зброя

- Підмножина якостей з ефектом у рушії: Damaging, Impale, Penetrating, Hack, Pummel, Precise, Accurate, Imprecise, Undamaging, Unreliable, Dangerous, Slow, Fast, Blast, Pistol, Shield, Defensive, Reload. Решта (Distract, Entangle, Wrap, Spread, Trap Blade, Unbreakable, Inflict, Repeater) — зберігаються й показуються, `implemented: false` у реєстрі.
- `WeaponStats`: `group` (enum), `reach` (melee) або `range` у футах (ranged), `damage {addSb, flat}`, `qualities[]`/`flaws[]` (`{key, value?}`), `twoHanded`, `ammoCapacity?`, `weight`, `price`.
- `extractAttacksFromCharacter` будує wfrp-атаки з `weaponProfile`; reach → клітинки через `cellFeetOf` (6 ft) → `range` атаки. `combat.mitigateDamage` отримує якості (Penetrating ігнорує AP, Damaging/Impale — крит/шкода, Undamaging мінімум шкоди, Hack/Pummel за дублетами тощо — точні правила у плані).
- Боєприпаси (ruling): запас з `ammoCapacity` при створенні учасника → `battleData.ammo[artifactId]`; між боями не зберігається. Reload X → `battleData.reload[attackId]`, зменшується діями. Це перший такий механізм (d20 його не має); атака без набоїв/під reload → 400 з ключем у `lib/constants/api-errors.ts` + `messages/*/errors.json`. Усі зміни `battleData` через `runBattleMutation` (дельти, не повні сцени).

### 5f-3 — гроші і вага

- Гроші 12/20: хук `RuleSystemDefinition.currency` (`coins`/`value`: GC=20 ss, ss=12 d; колонки `gold`/`silver`/`copper` як GC/ss/d). `lib/utils/inventory/money.ts` і UI беруть `COIN_VALUE` із системи; d20/homm — як зараз.
- Вага: сума `weight` носимого (екіпіроване + рюкзак) проти ліміту SB+TB на листі; радник, без бою, без стану Burdened.

## Тестування

Чисті модулі `wfrp/equipment/` (схеми, складання AP, якості, ammo/reload) — юніт; `from-character` + `mitigate` — інтеграційні; роут артефакта — d20 відхиляє `systemStats`, wfrp приймає; `client-entry-imports`, `scope-size`, i18n-паритет, assistant coverage (нові маршрути, якщо з'являться) — зелені. Live-run Sonnet-агентом: DM створює зброю/броню/щит, герой екіпірує, бій показує AP/якості, ammo/Reload, гроші 12/20, 375 px; регрес dnd5e (артефакти) — PASS.

## Відкриті межі (фіксуються в «Межі 5f»)

Щит без реакцій; нереалізовані якості; без зношення й ремонту; числа не звірені з книгою; trappings кар'єр лишаються рядками без зв'язку з предметами; захист від видалення кар'єри/таланту, що стоїть у профілі виду при синхронізації шаблонів (5e-3 M3), і мапінг кодів `WFRP_DRAFT_INVALID` у UI (M6) — окремо від 5f.
