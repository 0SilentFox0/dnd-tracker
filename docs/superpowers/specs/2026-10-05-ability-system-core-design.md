# Система умінь, частина 3a: модель, реєстр, виконавець, міграція

- **Дата:** 2026-10-05
- **Статус:** дизайн погоджено, очікує ревʼю спеки
- **Скоуп:** одна модель уміння для скілів, рас, артефактів (+ сет-бонусів) і юнітів; реєстр видів; один виконавець подій;
  `collectModifiers` для постійних модифікаторів; конвертер старих даних; переведення рушія бою на нову модель.
- **Поза скоупом:** UI-редактор і шаблони (3b), CSV-імпорт і `run-skills-testing` (3c), contract-міграція.

## 1. Контекст

Зараз уміння живуть у чотирьох джерелах з різними правилами, і жодне з них не має одного виконавця:

- **`Skill`.** Тригери лежать у `skillTriggers` (23 прості та «complex»). Ефекти лежать у `combatStats.effects`, а запасний варіант — у `bonuses`. Додатково є мертві колонки `damage/armor/speed/...` і дубльовані дані покращень спелів.
- **`Race.passiveAbility`.** У бою з нього беруться лише резисти та імунітети, через пошук рядків «імунітет»/«fire» в `resistance/helpers.ts`.
- **`Artifact.passiveAbility` + `effectScope`, `ArtifactSet.setBonus`.**
- **`Unit.specialAbilities`.** Ці вміння в бій не потрапляють узагалі.
- **Таблиця `RacialAbility`.** Код її не читає.

Ключові проблеми:

- **Шкода від скіла рахується 5 різними шляхами.**
  - `damage/skill.ts` сумує ефекти без урахування тригера. Через це скіл на `onHit`/`bonusAction`/`onBattleStart` дає бонус завжди, а разом із баффом від тригера рахується двічі.
  - `counter_damage` діє без тригера.
  - `Skill.damage` записується, але ніде не читається.
  - Калькулятор у профілі рахує інакше, ніж бій.
- **Ліміти.** Лічильник один на скіл. `oncePerBattle` перевіряють лише 4 шляхи з ~10. `twicePerBattle` перевіряють ще рідше. `maxTriggers`, `stackable` і текстовий `condition` не перевіряються взагалі. В UI ліміти не редагуються.
- **Мертві тригери.** `onAttack`, `onAllyDeath`, `onCast` і `onFirstRangedAttack` оголошені, але ніде не спрацьовують. Уся система `PassiveAbility` (`on_hit`, `start_of_turn`, ...) теж мертва: `passiveAbilities` завжди `[]`, хоча їх перевіряють у 5 місцях.
- **Семантика.** `before/afterEnemyAttack` насправді означає «моя атака, і я на боці ворогів». Скіли цілі ніколи не спрацьовують.
- **Виконавець.** Загальний виконавець реально змінює лише баффи та DOT, решта ефектів дає тільки рядок у лозі. Кожен тригер має свій switch: on-hit ~15 статів, bonus-action ~16, battle-start 6, on-kill 1.
- **Імпорт.** У complex-умовах `allyHP <= 0.15` порівнюється з 0.15% замість 15%.

**Мета:** одна модель «тригер → умова → ліміти → ефекти». Кожне поле вміння реально впливає на бій і покрите тестами. Є один шлях для кожного виду ефекту. Профіль і бій рахують однаково. Наявні дані переносяться без мовчазних втрат.

**Критерії успіху:**

- У рушії бою немає жодного switch по статах поза реєстром. `lib/utils/skills/execution/*`, `lib/utils/skills/triggers/*` і `PassiveAbility` видалені.
- Скіл з подійним тригером не впливає на шкоду поза своєю подією (тест).
- Ліміти `perBattle`/`perRound`/`perTurn` і `chance` перевіряються для кожної події (тести по кожній).
- Скіли цілі спрацьовують на атаки по ній (`role: target`).
- `Unit` і раси отримують робочі вміння в бою.
- Конвертер має dry-run зі звітом. Для кожної сутності звіт показує «точно» / «з втратами (що саме)» / «не вдалося».
- Бій, розпочатий до деплою, продовжується після нього (тест зі старим snapshot).
- Калькулятор шкоди в профілі = розрахунок у бою (тест).

## 2. Модель (`lib/abilities/schema.ts`, Zod)

```ts
Ability = {
  id: string,                 // стабільний у межах власника
  name: string,
  description?: string,
  trigger: Trigger,           // discriminated union за `event`
  condition?: Condition,      // discriminated union за `type`
  limits?: { perBattle?: int≥1, perRound?: int≥1, perTurn?: int≥1, chance?: 1..100 },
  effects: Effect[],          // ≥1, discriminated union за `kind`
  stackable?: boolean,        // лише для таймових ефектів, див. §4
}
```

`source: { type: "skill" | "race" | "artifact" | "artifactSet" | "unit", id, name }` додається під час побудови учасника
(§5). У БД цього поля немає.

### 2.1 Тригери (`Trigger.event`)

| event | параметри | коли |
|---|---|---|
| `passive` | — | ніколи не «спрацьовує»; читається через `collectModifiers` (§4) |
| `battleStart` | — | старт бою або вхід нового учасника |
| `roundStart` / `roundEnd` | — | межа раунду |
| `turnStart` / `turnEnd` | — | початок/кінець ходу власника |
| `attack` | `phase: before\|after`, `role: attacker\|target`, `kind?: melee\|ranged\|magic` | фізична атака |
| `hit` | `role: attacker\|target`, `kind?` | влучання фізичною атакою |
| `kill` | `role: killer\|ally` | власник когось убив / загинув союзник власника |
| `lethalDamage` | — | власник отримав би летальну шкоду |
| `spellCast` | `phase: before\|after`, `role: caster\|target` | заклинання |
| `moraleCheck` | `result: success\|fail`, `whose: self\|ally` | перевірка моралі |
| `bonusAction` | — | єдиний ручний тригер: кнопка гравця |

Усі інші тригери спрацьовують автоматично: сервер сам перевіряє умову, ліміти та кидає `chance`, а результат пише в лог.
Запиту «використати зараз?» немає.

### 2.2 Умови (`Condition.type`)

- `hpBelow` / `hpAbove { who: self | eventTarget | eventActor | anyAlly, percent: 1..100 }`
- `attackKind { kind: melee | ranged | magic }` — для подій з атакою або заклинанням.
- `targetHasCondition { condition: string }`
- `all { conditions: Condition[] }` / `any { conditions: Condition[] }`

### 2.3 Ефекти (`Effect.kind`)

Кожен ефект має `target: self | eventTarget | eventActor | allAllies | allEnemies` (за замовчуванням `self`) і
`duration?: { rounds: int≥1 }`.

| kind | параметри | статичний (для `passive`) |
|---|---|---|
| `modifyStat` | `stat` (armor, speed, initiative, morale, maxHp, spellSlots, minTargets, maxTargets, critThreshold, ...), `flat?`, `percent?` | так |
| `damageBonus` | `filter { kind?: melee\|ranged\|magic\|all, school?: string }`, `flat?`, `percent?`, `dice?` | так |
| `flag` | `flag` (advantage, disadvantageForAttackers, guaranteedHit, attackFirst, resistance, ...), `params?` (наприклад, `{ damageType, level: resist\|immune }`) | так |
| `grantAction` | `actions?`, `bonusActions?`, `reactions?`, `extraTurn?` | так |
| `note` | `text` | так (лише відображення) |
| `dealDamage` | `amount` (число або кубики), `damageType?` | ні |
| `heal` | `amount`, `percentOfMax?` | ні |
| `dot` | `damagePerRound` (число або кубики), `damageType` | ні, потрібна `duration` |
| `applyCondition` | `condition` (stunned, no_bonus_action, no_reaction, ...) | ні, потрібна `duration` |
| `resource` | `restoreSpellSlot { level }` \| `morale { delta }` | ні |

**Правила, які перевіряє Zod-схема:**

- `passive` не може мати `limits` і дозволяє лише статичні види ефектів.
- `modifyStat` для `maxHp`, `spellSlots` і `initiative` застосовується один раз при побудові учасника. Тому для цих статів `condition` заборонено, а ефект можливий лише в `passive`.
- `dot` і `applyCondition` потребують `duration`.

Набір значень `stat`, `flag`, `condition` і `damageType` задається в реєстрі як `z.enum`. Повний перелік і мапінг старих 46 статів
зафіксуються в плані з посиланням на `lib/constants/skill-effects.ts`.

### 2.4 Ефекти поточної дії

Ефекти **без `duration`** у фазі `before` (`attack/before`, `spellCast/before`) застосовуються лише до поточної атаки чи
заклинання. Це стосується `damageBonus`, `flag` (перевага, гарантоване влучання) і `modifyStat` (`critThreshold`). Цим способом
виражаються «+10% шкоди при атаці» та «перевага на першу дальню атаку». Такі ефекти не потрапляють в `activeEffects`.

Ефекти з `duration` стають таймовими й записуються в `state.activeEffects`.

## 3. Реєстр (`lib/abilities/registry/`)

Один файл на вид ефекту, тригера чи умови:

```ts
defineEffect({
  kind: "dot",
  schema,                                  // Zod; збирається в EffectSchema
  static: false,                           // чи дозволений у passive / collectModifiers
  label, fields,                           // метадані для UI-редактора (3b)
  apply(ctx, effect, targetIds) => { patches, log },   // для нестатичних
  describe(effect) => string,              // «Кровотеча 1d4 × 3 раунди»
})
```

- `defineTrigger` описує `{ event, schema, label, fields, matches(event, ownerId, trigger) }`.
- `defineCondition` описує `{ type, schema, label, fields, evaluate(ctx, condition) }`.
- `AbilitySchema`, `TriggerSchema`, `ConditionSchema` і `EffectSchema` збираються з реєстру. Нове значення `kind` поза реєстром неможливе.
- Тест-контракт перевіряє, що кожен запис має `schema`, `describe` і `fields`. Нестатичні записи мають мати `apply`, статичні — підтримку в `collectModifiers`.

## 4. Виконання

### 4.1 `runAbilities(battle, event, rng) → { battle, log }`

Функція чиста, а `rng` передається ззовні, тож у тестах він детермінований. `event` — це типізований об'єкт, наприклад
`{ type: "hit", actorId, targetId, kind, damage }`.

1. **Кандидати.** Беруться учасники, яких стосується подія, у порядку ініціативи. Для `kill/ally` кандидатами є союзники загиблого. Мертві учасники не беруться, за одним винятком: для `lethalDamage` кандидатом є сам власник.
2. Для кожного вміння перевірки йдуть так: `trigger.matches` (подія, роль, `kind`) → `condition` → ліміти → кидок `chance`. Після цього кожен ефект виконується через `registry.apply` для своїх цілей, а потім збільшується `abilityUsage`.
3. Лог отримує записи з `source` і `describe(effect)`.

**Ліміти.** Лічильники зберігаються в `ParticipantState.abilityUsage[abilityKey] = { battle, round, turn }`, де
`abilityKey = source.type:source.id:ability.id`. Лічильник `round` скидається на `roundStart`, `turn` — на `turnStart` власника.
`chance` кидається лише після того, як пройшли інші перевірки. Невдалий кидок ліміт не витрачає.

**Каскадів немає.** Ефекти вміння не породжують нових подій `hit`/`attack`/`spellCast`. Є одне виключення: після
`runAbilities` рушій сам перевіряє смерть, і ця перевірка дає `kill`. Подія `kill` інших `kill` уже не породжує. Глибина
обмежена 1 рівнем.

**Таймові ефекти.** Повторне спрацювання того самого вміння оновлює `duration` наявного ефекту і не додає новий. Якщо в
вмінні `stackable: true`, додається новий ефект.

### 4.2 `collectModifiers(battle, participantId, query) → { total, breakdown[] }`

`query` може бути `{ stat }`, `{ damage: { kind, school? } }` або `{ flag }`. Функція підсумовує три джерела:

1. `passive`-вміння самого учасника з `target: self`. Їхній `condition` перевіряється в момент запиту, тож умовні пасивки працюють.
2. `passive`-вміння інших учасників з `target: allAllies` або `allEnemies`. Так працюють аури та скоуп артефактів.
3. Таймові ефекти з `state.activeEffects`.

Окремо від цих трьох джерел ефекти поточної дії (§2.4) передаються в розрахунок атаки чи заклинання явно.

`breakdown` повертає список `{ source, value }`, з якого будуються лог і розбивка в профілі. Ефекти з подійних тригерів
потрапляють у `collectModifiers` **тільки** через `activeEffects`, тому подвійного рахунку немає.

Користувачі `collectModifiers`:

- `damage/*`, `spell/calculations`, розрахунок AC, швидкості, резистів, переваги;
- скидання дій на початку ходу (`grantAction`);
- калькулятор шкоди в профілі (`lib/hooks/characters/useDamageCalculator-skills.ts`).

### 4.3 Точки подій у рушії

Ці точки замінюють нинішні виклики `executeSkillsByTrigger`, `on-hit.ts`, `battle-start.ts`, `on-kill.ts`, `bonus-action.ts` і `morale.ts`, а також `checkSurviveLethal`, `counter_damage` і `processStartOfTurn`-пасивки.

| Місце | Подія |
|---|---|
| `start/start-battle-handler`, вхід нового учасника | `battleStart`, `roundStart` |
| `turn/advanceTurn`, `run-advance-turn-loop` | `turnEnd`, `roundEnd`, `roundStart`, `turnStart` |
| `attack/process/run` (+ `miss`, `critical-fail`) | `attack before/after`, для атакувальника і цілі |
| `attack/process/hit-effects` | `hit`, для атакувальника і цілі |
| `attack/process/damage` | `lethalDamage` |
| перевірка смерті після атаки, заклинання чи `runAbilities` | `kill` (killer + ally) |
| `spell/process`, `process-branches` | `spellCast before/after` |
| `turn/apply-pending-morale` | `moraleCheck` |
| `bonus-action-mutation` | `bonusAction` (лише обране вміння, з перевіркою лімітів) |
| `attack/reaction` | контратака як `hit/target` з `perRound: 1` |

**Що видаляється:**

- `lib/utils/skills/execution/*`, `lib/utils/skills/triggers/*`, `lib/utils/battle/triggers/*` (PassiveAbility);
- поля snapshot `activeSkills`, `racialAbilities`, `passiveAbilities`;
- пошук рядків у `resistance/helpers.ts`;
- дублікати типів `lib/types/skill-triggers.ts` і `lib/types/skills.ts`.

## 5. Звідки беруться вміння в бою

`collectAbilities(source)` при побудові учасника (`lib/utils/battle/participant/*`):

- **персонаж** — скіли з `skillTreeProgress`, разом з резолвом рівнів, як у `extract-skills.ts`, плюс раса, екіпіровані артефакти та активні сет-бонуси;
- **юніт** — `Unit.abilities` плюс раса юніта.

Кожне вміння отримує `source`. Snapshot учасника зберігає `abilities: ResolvedAbility[]`. Ефекти `passive` для `maxHp`,
`spellSlots` та `initiative` застосовуються тут, один раз.

## 6. Схема БД і міграція даних

**Migration (expand-only):** до таблиць `skills`, `races`, `artifacts`, `artifact_sets` і `units` додається колонка
`abilities JSONB NULL`. `NULL` означає «ще не сконвертовано». Нових таблиць немає, тож RLS не змінюється.

**Конвертер** — чисті функції `convertLegacySkill/Race/Artifact/ArtifactSet/Unit(row) → { abilities, issues[] }` у
`lib/abilities/legacy/`. Їх використовують три місця:

1. **Скрипт `pnpm convert-abilities`.** За замовчуванням це dry-run. Він пише звіт у `docs/reports/abilities-conversion-<дата>.md` з групуванням «точно» / «з втратами» / «не вдалося» і причинами. Прапорець `--apply` записує `abilities`, лише якщо значення ще `NULL`, а `--force` перезаписує. На prod скрипт запускає користувач після злиття.
2. **Запасний варіант на час читання.** `row.abilities ?? convertLegacy(row).abilities` при побудові учасника. Між деплоєм і backfill бій не ламається.
3. **Подвійний запис до 3b.** Роути збереження скілів, рас, артефактів, сетів і юнітів пишуть старі поля і `abilities = convertLegacy(merged).abilities`. Старі форми та старий `import-skills-library` продовжують працювати.

**Бої, що йдуть під час деплою.** Якщо `loadBattle` знаходить snapshot без `abilities`, вміння виводяться з `activeSkills` /
`racialAbilities` / `equippedArtifacts` тим самим конвертером. `battle_snapshots`, тобто rollback, проходять той самий шлях.
`skillUsageCounts` переноситься в `abilityUsage.battle` за `skillId` для всіх вмінь скіла.

**Мапінг старих даних:**

| Було | Стає |
|---|---|
| `passive` | `passive` |
| `onBattleStart` | `battleStart` |
| `startRound` / `endRound` | `roundStart` / `roundEnd` |
| `beforeOwnerAttack` / `afterOwnerAttack`, `onAttack` | `attack before/after`, `role: attacker` |
| `beforeEnemyAttack` / `afterEnemyAttack` | `attack before/after`, `role: target` (**зміна поведінки**, issue) |
| `beforeOwnerSpellCast` / `afterOwnerSpellCast`, `onCast` | `spellCast`, `role: caster` |
| `before/afterEnemySpellCast` | `spellCast`, `role: target` (**зміна поведінки**, issue) |
| `onHit` | `hit/attacker` (`modifiers.attackId` → issue, якщо не мапиться в `kind`) |
| `onFirstHitTakenPerRound` + `responseType` | `hit/target`, `kind`, `perRound: 1` |
| `onFirstRangedAttack` | `attack/before/attacker`, `kind: ranged`, `perBattle: 1` |
| `onKill` / `onAllyDeath` | `kill/killer` / `kill/ally` |
| `onLethalDamage` | `lethalDamage` |
| `onMoraleSuccess` / `allyMoraleCheck` | `moraleCheck` (`success/self`) / (`*/ally`) |
| `bonusAction` | `bonusAction` |
| complex `target/stat/operator/value` | `condition` (`hpBelow`/`hpAbove`; відсотки `< 1` × 100; інші стати → issue) |
| `probability` | `limits.chance` |
| `oncePerBattle` / `twicePerBattle` | `limits.perBattle` = 1 / 2 |
| `stackable` | `stackable` |
| текстовий `condition`, `maxTriggers` | ефект `note` + issue |
| ефекти `combatStats.effects`, запасний варіант — `bonuses` | ~10 видів за таблицею статів у плані; невідомий стат → `note` + issue |
| `Race.passiveAbility` | `passive` з `flag resistance` і `modifyStat` |
| `Artifact.passiveAbility` + `effectScope` | `passive`, `target` з `effectScope` |
| `ArtifactSet.setBonus` (`passiveEffects`, `bonuses`, `modifiers`, `spellSlotBonus`, `immuneSpellIds`) | `passive` вміння сету |
| `Unit.specialAbilities` | `note`; `actionType: bonus` + `spellId` → `bonusAction` з `note` (issue) |

Скіл, у якого тригер не `passive`, а ефект — бонус шкоди без `duration`, конвертується в ефект поточної дії (§2.4) на події
свого тригера. Окремий випадок — `onHit` з бонусом шкоди: для нього ефект переходить на `attack/before/attacker`, щоб
бонус діяв на ту атаку, якою влучили. Нині такий бонус діє завжди, тому в звіті це позначається як зміна поведінки.

## 7. Тести

- **Контракт реєстру:** у кожного виду є `schema`, `describe`, `fields` і `apply` (або статична підтримка). Перевіряється також відмова Zod на заборонені комбінації (§2.3).
- **`runAbilities` для кожної події:**
  - ролі `attacker` / `target`;
  - `kind`, `condition`;
  - `perBattle` / `perRound` / `perTurn` і їх скидання;
  - `chance` з детермінованим `rng` (невдалий кидок не витрачає ліміт);
  - відсутність каскадів;
  - оновлення та стакання таймових ефектів.
- **`collectModifiers`:**
  - умовна пасивка вмикається й вимикається зі зміною HP;
  - аура від союзника та ворожа аура;
  - подійний скіл не дає бонусу поза подією;
  - `breakdown`.
- **Конвертер:** golden-тести на фікстурах у формі реальних даних для кожного джерела, з перевіркою `issues`.
- **Інтеграція через `runBattleMutation`:**
  - атака з DOT на влучання;
  - контратака цілі;
  - `lethalDamage` (виживання);
  - `kill/ally` (мораль);
  - бонусна дія з лімітом;
  - бій зі старим snapshot до деплою.
- **Профіль = бій:** калькулятор шкоди і `damage/*` дають однаковий результат для однакового персонажа.
- **Старі тести** `lib/utils/skills/__tests__` і `execution/__tests__`: сценарії, що мають сенс, переписуються на нову модель, тести видалених модулів видаляються.

## 8. Поза скоупом і наступні кроки

- **3b:** UI-редактор, що будується з `fields` реєстру; шаблони; редагування лімітів і шансу; форми рас і юнітів.
- **3c:** CSV-імпорт у новий формат після перегляду CSV; переписати `run-skills-testing*` на `runAbilities`.
- **Contract-міграція (після 3b/3c і backfill на prod):**
  - видалити старі колонки скілів (`skillTriggers`, `combatStats`, `bonuses`, `damage`, ...), `Race.passiveAbility`, `Artifact.passiveAbility`, `Unit.specialAbilities`;
  - видалити таблицю `racial_abilities`;
  - прибрати запасний варіант конвертера на час читання і в `loadBattle`;
  - зробити `abilities` NOT NULL.
