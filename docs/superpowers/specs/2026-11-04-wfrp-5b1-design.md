# WFRP 5b-1: рушій бою (spec)

Дата: 2026-11-04. Гілка `feat/wfrp`. Частина епіку WFRP; декомпозиція та рішення — [research](../research/2026-11-03-wfrp-rule-system.md) (§4.2, §6, §8), реєстр систем — [rule-systems.md](../../architecture/rule-systems.md), попередня частина — [5a](2026-11-03-wfrp-5a-design.md).

5b поділено: **5b-1 — серверний рушій бою** (цей spec), **5b-2 — Momentum на сцені й хвости рушія**, **5b-3 — UI** (AttackWizard-варіант, HUD, підписи одиниць yd на карті, live-run).

## Мета й успіх

Бій у кампанії `rules.system.key = wfrp` стартує й проходить на сервері до кінця: атаки, шкода, Wounds, крити, ініціатива, раунд Move+Action. Критерії: `battle.supported = true`; тести рушія (чисті утиліти + мутації); d20-системи (homm, dnd5e) не змінюють поведінку — `battle-sweep` на prodcopy та наявні тести без змін. UI 5b-3 може бути мінімальним (бій відкривається й керується наявним інтерфейсом, d20-специфічні елементи ховаються прапорцями).

Припущення правил (звірити з книгою 5e, як `DIFFICULTY_SL`): тай-брейк opposed, Momentum, формула шкоди з SL, виграш outnumbering. Усе — константи в одному файлі `wfrp/combat/constants.ts`, правка не чіпає логіку.

## Reuse (CLAUDE.md «Reuse before writing»)

| Є | Використовуємо |
|---|---|
| `wfrp/percentile/{roll,resolve,difficulty}` | `rollPercentile`, `resolvePercentileTest` (SL, авто успіх/провал, дублі, advantage) — основа тестів атаки |
| `wfrp/characteristics/{keys,derive}` | `readCharacteristics`, бонуси, `woundsMax` |
| `characterBaseHp` → `progression.maxHp` | Wounds уже в `resources.hp`/`maxHp` снапшота |
| `runBattleMutation`, `runAttackPhase`, `processAttack`, `computeHitDamage`, `applyDamageToTarget`, `applyDamageConsequences` | конвеєр лишається; системні гілки через хуки |
| `rules.initiative.mode`, `compareInitiative`, `actionFlags`, `movementUsed`/`movementBudget` | ініціатива й економіка дій |
| `ClientBattleDelta`, `snapshotHash` (`split-participant`) | відповіді-дельти; нове поле снапшота пишеться разом із хешем автоматично |
| `balance.kind`, `computeFairScaling`, `heroMember/unitMember` | баланс; додається системна оцінка |
| `rollModeReasons`, `ActiveEffect`/`removeEffects` | outnumbering як причина, стан-маркери крита |

Нове потрібне, бо немає аналога: opposed-хелпер (порівняння SL), хуки `resolveAttack/mitigateDamage/onZeroHp/initiative`, таблиця локацій і мінікрити, SL-оцінка для балансу.

## Дизайн

### 1. Хуки (`RuleSystemDefinition`)

Нові поля: `resolveAttack(ctx)`, `mitigateDamage(ctx)`, `onZeroHp(ctx)`, `initiative(p, ctx)`, `combat` (економіка дій: `bonusAction: false`, `reaction: false`). Хуки необов'язкові й живуть у `combat`: у d20 їх немає, місця виклику роблять `if (hook) … else <наявний код>` — d20-шлях не змінюється взагалі (замість обгорток). Виклик — лише через `ruleSystemOf(flow.ctx.rules)`.

Точки підключення: `attack/process/run.ts:72-93` і `server-attack.ts:48-62` (замість `calculateAttackRoll`/`judgeHit`); `damage/compute.ts` між `applyResistance` і `totalFinalDamage`; `damage/consequences.ts` поруч із `heroGoesDown`/`unitDiesAtZero`, плюс `settleStatusChange`; `turn/initiative.ts`, `turn/roll-initiative.ts`; `actions/availability.ts`.

`AttackRollResult` лишається, отримує необов'язкове поле `percentile?: {roll, target, sl, location, defender?:{kind, roll, sl}, momentumUsed?}` (замість union — менший радіус змін). `strikeD20` (відкидає >20) і `rollStrike` отримують розмір кубика від системи.

### 2. Учасник

`BattleParticipant.abilities.characteristics?` (опційне, лише wfrp) + похідні `sb`, `tb`, `ap{head,body,arms,legs}`, `moveYd`. Заповнюється в `createBattleParticipantFromCharacter` і `unitAbilities` через `readCharacteristics`; `refresh-from-source` копіює поле. `importUnitsIntoCampaign` перевіряє систему кампанії (хвіст 5a). У d20 поле відсутнє.

### 3. Атака й шкода (wfrp)

- **Melee (opposed).** Сервер кидає d100 атакувального (ціль WS) і захисника (автовибір кращої цілі з WS / Dodge-навичка / щит). Більший SL виграє; нічия — за атакувальним. Виграш = влучання; чистий SL (різниця) додається до шкоди. `rollModeReasons` додає outnumbering (+бонус до цілі атакувального за константою).
- **Ranged.** Простий тест BS проти складності; опційно `DIFFICULTY_SL` за відстанню.
- **Локація.** Реверс кидка → голова/рука/тіло/нога (таблиця в `wfrp/combat/location.ts`). Щит додає AP на локації прикриття.
- **Шкода.** `max(1, зброя(SB+X) + нетто-SL − TB − AP[loc])` у `mitigateDamage`; рядки в `DamageStep`/breakdown. Wounds = `resources.hp`.
- **Крит.** Дубль на кидку атаки (`doubles:true`) → крит за локацією; 0 Wounds → Unconscious + крит. Вбудована міні-таблиця `wfrp/combat/crit-table.ts` (d100, 4 локації, власний grimdark-текст, механіка: бонус шкоди, стан-маркер, запис у лог). Content kind `tables` і редактор — 5c/5g. Вибір ДМ через `pendingCritChoice` у 5b-1 не чіпаємо.
- `applyFlowDamage` розширюється: ранній вихід не діє, коли в системи є `onZeroHp`.

### 4. Momentum

`battleData.momentum: { [side]: boolean }`. Виграш opposed (атакувальний або захисник) забирає жетон, витрата дає +SL до наступного тесту цієї сторони; скидається на кінець бою. Точні правила — константа + позначка «звірити з книгою».

### 5. Хід

- Ініціатива: `characteristics.i` (статична) або `i + d10` за `rules.initiative.mode`; тай-брейк за Ag (розширення `compareInitiative`); `InitiativeRollEntry` отримує поле розміру кубика (замість жорсткого `d20`).
- Раунд = Move + Action: бонусна дія й реакція не пропонуються (`availability.ts`), off-hand не витрачає бонус-дію. Бюджет руху: `moveYd / distance.perCell` клітин.
- **Масштаб клітинки.** Хелпер `cellFeet(rules)` (з `distance.perCell`; d20 → 5) замінює `CELL_FEET` у `attack/bonus.ts`, `grid/{path,template,attack-reach}.ts`, `spell/{anchored-zone,cast/effects,auto-reaction}.ts`, `summon/objects-near.ts`, `abilities/registry/effects/push.ts`, `useAbilityMapAim.ts`; дальність, досяжність і рух узгоджені в рушії. wfrp: 1 клітинка = 2 ярди (рішення 5a). Тест паритету: для d20 `cellFeet` = 5 скрізь.

### 6. Баланс і шлюз

- `WFRP_SYSTEM.balance.kind = "fair"`; системна оцінка: таблиця 100×100 `P(атакувальний виграє opposed)` + очікувана шкода `P(hit)·max(1, SB+X−TB−AP)`, через узагальнені `offense/defense` у `heroMember/unitMember`; `hitChance` лишається d20-функцією для d20.
- `battle.supported = true`; `start-mutation` більше не кидає `SYSTEM_BATTLE_UNSUPPORTED` для wfrp.

## Поза межами 5b-1

UI-варіанти (AttackWizard, HUD, `useRuleSystem` під час вантаження — хвіст 5a), підписи одиниць і відображення масштабу на карті (5b-3); стани, психологія, травми, Fate/Fortune у бою (5c); магія (5d); content kind `tables` (5c/5g); якості зброї/reach (5f); бестіарій/Traits (5h). `DIFFICULTY_SL` і формули шкоди — окрема звірка з книгою.

## Тестування

- Чисті утиліти (`wfrp/combat/*`): opposed (тай-брейк, авто успіх/провал, дублі), локація, шкода (мін. 1, AP, TB), оцінка балансу — табличні тести.
- Мутації: атака wfrp end-to-end (дельта, Wounds, крит при 0), ініціатива, відсутність bonus/reaction.
- Паритет: d20-тести без змін; `battle-sweep` homm/dnd5e на prodcopy.
- Інваріанти CLAUDE.md: усе, що пише `battle_participants.snapshot`, пише `snapshotHash`; шкода → `applyDamageConsequences` одразу після примітива; відповіді — дельти.

## Ризики

- Хуки торкаються гарячого d20-шляху: обгортки без зміни виразів, паритет перевіряється.
- Розмір: 4 хуки + opposed + баланс; план ділиться на задачі «хуки+d20-обгортки», «cellFeet», «учасник», «атака/шкода», «крит/Wounds», «хід», «баланс/шлюз».
