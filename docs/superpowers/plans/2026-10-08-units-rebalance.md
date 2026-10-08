# Ребаланс юнітів — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 152 збалансовані юніти HOMM5 у `data/library/units.ts` з робочими механіками, засіяні через `seed-library`, з точковими розширеннями рушія.

**Architecture:**
- Юніти — дані бібліотеки, як скіли й артефакти: тип `LibraryUnit`, перевірка в `build.ts`, upsert за назвою в `seed-library`.
- Здібності юнітів — фабрики з `data/library/unit-abilities.ts`, що повертають звичайні `Ability` зі схеми `lib/utils/abilities/schema`.
- Рушій отримує 7 точкових розширень (§5 специфікації), кожне з тестом.
- Баланс перевіряємо `pnpm balance-library`.

**Tech Stack:** TypeScript strict, Zod, Prisma 6 (PostgreSQL), Vitest, tsx-скрипти.

**Spec:** `docs/superpowers/specs/2026-10-08-units-rebalance-design.md` — таблиці юнітів §4 є джерелом даних для задач 10–17.

## Global Constraints

- Бюджет базового юніта (spec §2.2): T1 12/4.5/11/+3 · T2 22/7/12/+4 · T3 36/10/13/+5 · T4 58/14/14/+6 · T5 90/20/15/+7 · T6 140/28/16/+8 · T7 220/40/18/+10 (HP / середня шкода / КД / атака). Допуск ±20 % з урахуванням ролі.
- На юнітів діє лише расова пасивка (`race.abilities` у БД), не вміння дерева.
- «Атака по кількох цілях» = `maxTargets: N` на атаці + здібність-прапор `multiTargetFalloff` 50: основна ціль отримує 100 %, кожна додаткова — 50 %. `damageDistribution` (частки, сума 100) не використовуємо. Ланцюг 100/50/25 у Демониці реалізуємо як 100/50/50 (зафіксоване відхилення).
- Додаткова стихійна шкода (наприклад, «+1d4 вогнем») — здібність `hit` (role attacker) → `dealDamage { amount: "1d4", damageType: "fire", target: "target" }`.
- `note` лише для антуражу. Шанси кидає сервер.
- Коментарі мінімальні (глобальний CLAUDE.md). Тексти інтерфейсу й опису — українською. Ідентифікатори англійською.
- Імпорти через `@/…`. Порядок імпортів — `pnpm lint --fix`. Порожній рядок навколо `const`/`if`/`return` (ESLint).
- Міграції лише розширювальні (expand-only). Нова колонка без `CREATE TABLE` не потребує RLS.
- Без ревʼю після кожної задачі (пам'ять `feedback-review-cadence`): одне фінальне ревʼю всієї гілки (opus).

## Review Focus

1. **Кілька юнітів Людей в одному бою.** «Вишкіл війська» має дати +1 моралі один раз на сторону, а не +N. Тест — у задачі 7.
2. **Юніт з `levelScaling`, доданий DM вручну** (не прикликаний). Має лишитися з базовими HP і шкодою, без падінь на `casterLevel` = undefined. Тест — у задачі 6.
3. **«Без відповіді» проти цілі з «Безмежною відсіччю».** Перемагає «Без відповіді»: відповіді немає. Тест — у задачі 1.
4. **`drainSpellSlot` по цілі без слотів** (юніт-воїн або герой без магії). Нічого не відбувається і немає помилки; повідомлення лише при знятому слоті. Тест — у задачі 3.
5. **Повторний `seed-library` на кампанії, де юніти вже є і DM правив їхні аватари.** Без дублікатів: оновлення за назвою, `avatar` не перезаписується. Тест — у задачі 9.

---

### Task 1: Прапори `noRetaliation` і `unlimitedRetaliation`

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (FlagSchema)
- Modify: `lib/utils/battle/attack/retaliation.ts` (`resolveRetaliation`)
- Modify: місце, де генеруються підписи прапорів для UI/редактора, якщо є вичерпний `switch` по `flag` (знайти: `grep -rn '"lifesteal"' lib components`). Додати підписи «Без відповіді» / «Безмежна відсіч».
- Test: `lib/utils/battle/attack/__tests__/retaliation-flags.test.ts`

**Interfaces:**
- Produces: прапори `{ kind: "flag", flag: "noRetaliation" }` (на атакувальнику) і `{ kind: "flag", flag: "unlimitedRetaliation" }` (на захиснику).

- [ ] **Step 1: Тест.** Подивитися наявні тести `resolveRetaliation` (`grep -rln resolveRetaliation lib/utils/battle/attack/__tests__`) і перевикористати їхні фабрики учасників. Три кейси:

```ts
it("без відповіді: атакувальник з noRetaliation не отримує відсічі", () => {
  const attacker = withAbilities(melee("a"), [{ id: "nr", name: "Без відповіді", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "noRetaliation" }] }]);
  expect(resolveRetaliation(input(attacker, melee("d")))).toBeNull();
});

it("безмежна відсіч: відповідає вдруге за раунд", () => {
  const defender = withAbilities({ ...melee("d"), actionFlags: { ...melee("d").actionFlags, hasUsedReaction: true } }, [{ id: "ur", name: "Безмежна відсіч", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "unlimitedRetaliation" }] }]);
  expect(resolveRetaliation(input(melee("a"), defender))).not.toBeNull();
});

it("без відповіді перемагає безмежну відсіч", () => { /* attacker noRetaliation + defender unlimitedRetaliation → null */ });
```

- [ ] **Step 2:** `pnpm test:run lib/utils/battle/attack/__tests__/retaliation-flags.test.ts` — має впасти (невідомий flag у схемі або не null).
- [ ] **Step 3: Реалізація.**
  - У `FlagSchema` додати `z.object({ ...flagBase, flag: z.literal("noRetaliation") })` і `z.object({ ...flagBase, flag: z.literal("unlimitedRetaliation") })`.
  - У `resolveRetaliation`, після отримання `attacker`:

```ts
if (findFlags(withSelf(participants, attacker), attacker.basicInfo.id, "noRetaliation").length > 0) return null;

const unlimited = findFlags(withSelf(participants, defender), defender.basicInfo.id, "unlimitedRetaliation").length > 0;

if (provoked ? hasEffectMarker(defender, "no_reaction") : defender.actionFlags.hasUsedReaction && !unlimited) return null;
```

  - Не ставити `hasUsedReaction: true` повторно, коли `unlimited` (поведінка незмінна, але без зайвого запису).
  - Додати типи в TS-юніон прапорів, якщо він окремий (`grep -rn "multiTargetFalloff" lib/utils/abilities` покаже всі місця).
- [ ] **Step 4:** тест і `pnpm exec tsc --noEmit` проходять.
- [ ] **Step 5:** `git commit -m "feat(abilities): noRetaliation and unlimitedRetaliation flags"`

### Task 2: Умова `targetRace`

**Files:**
- Modify: `lib/utils/abilities/schema/conditions.ts` (тип `Condition` + `ConditionSchema`)
- Modify: обчислювач умов (`grep -rln '"targetDead"' lib/utils/abilities/engine`)
- Modify: підписи умов у редакторі здібностей, якщо є вичерпний `switch` (`grep -rn '"targetDead"' components lib`)
- Test: `lib/utils/abilities/engine/__tests__/condition-target-race.test.ts`

**Interfaces:**
- Produces: `{ type: "targetRace"; races: string[] }` — порівнюються назви рас без урахування регістру з `target.abilities.race`.

- [ ] **Step 1: Тест.** Здібність `attack before` з `damageBonus` 25 % і `condition: { type: "targetRace", races: ["Некроманти"] }` спрацьовує проти цілі з `abilities.race = "некроманти"` і не спрацьовує проти `"Люди"`. Шаблон взяти з наявного тесту `targetHasCondition`.
- [ ] **Step 2:** запустити — FAIL.
- [ ] **Step 3: Реалізація.**
  - Тип: `| { type: "targetRace"; races: string[] }`.
  - Схема: `z.object({ type: z.literal("targetRace"), races: z.array(z.string().min(1)).min(1) })`.
  - Обчислення: `races.some((r) => r.trim().toLowerCase() === (target?.abilities.race ?? "").trim().toLowerCase())`; немає цілі → `false`.
- [ ] **Step 4:** PASS + tsc.
- [ ] **Step 5:** `git commit -m "feat(abilities): targetRace condition"`

### Task 3: Ефект `drainSpellSlot`

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (новий `DrainSpellSlotSchema` поруч із `RestoreSpellSlotSchema`, у юніон ефектів)
- Modify: виконавець ефектів (`grep -rln '"restoreSpellSlot"' lib/utils/abilities/engine`) — нова гілка
- Modify: підписи ефектів у редакторі, якщо є вичерпний `switch`
- Test: `lib/utils/abilities/engine/__tests__/drain-spell-slot.test.ts`

**Interfaces:**
- Produces: `{ kind: "drainSpellSlot", count: number, target?: AbilityTarget }`. Знімає `count` слотів у цілі, найвищий рівень із `current > 0` першим. Повідомлення: `🔮 ${ціль} втрачає слот ${рівень}-го рівня`.

- [ ] **Step 1: Тест.** Два кейси:
  - ціль зі слотами `{ "1": {max 2, current 2}, "3": {max 1, current 1} }` після `hit` з `drainSpellSlot` має `"3".current === 0`, а `"1"` без змін;
  - ціль без слотів — учасник не змінився, повідомлень немає (Review Focus 4).

  Структуру `spellcasting.spellSlots` подивитися в тесті `restoreSpellSlot`. Слоти юнітів — `universal`; якщо ключ не числовий, зняти з `universal`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Реалізація дзеркально до `restoreSpellSlot`, але зменшує `current`, не нижче 0.
- [ ] **Step 4:** PASS + tsc.
- [ ] **Step 5:** `git commit -m "feat(abilities): drainSpellSlot effect"`

### Task 4: Вразливість (від'ємний опір) і повний імунітет до магії

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts`:
  - `resistance.percent`: `z.number().min(-100).max(100).refine((n) => n !== 0)`;
  - `spellImmunity.spellIds` → `.optional()` (відсутність = усі закляття).
- Modify: місце, де застосовується опір (`grep -rn '"resistance"' lib/utils/battle/damage lib/utils/abilities/engine`). Переконатися, що множник `1 - percent/100` не обрізається знизу нулем для від'ємних і не стає меншим за 0 для >100. Сума опорів клампиться в [-100, 100].
- Modify: перевірка `spellImmunity` (`grep -rn '"spellImmunity"' lib`) — `!flag.spellIds || flag.spellIds.includes(spellId)`.
- Modify: `remapRefs` у `scripts/seed-library-lib.ts` уже пропускає відсутні `spellIds`; перевірити.
- Test: `lib/utils/battle/damage/__tests__/vulnerability.test.ts`, `lib/utils/battle/spell/__tests__/spell-immunity-all.test.ts`

**Interfaces:**
- Produces: `{ flag: "resistance", damageType: "cold", percent: -100 }` = шкода ×2; `{ flag: "spellImmunity" }` без `spellIds` = імунітет до будь-якого закляття.

- [ ] **Step 1: Тести.**
  - 10 шкоди холодом по цілі з `percent: -100` → 20.
  - Опір 50 і вразливість −100 разом → сума −50 → 15.
  - Закляття по цілі з `spellImmunity` без `spellIds` не діє: ціль у результаті без змін, у повідомленні «імунітет». Шаблон — наявний тест `spellImmunity` (`grep -rln spellImmunity lib/**/__tests__`).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** PASS + `pnpm test:run lib/utils/abilities` (схема не зламала старі записи) + tsc.
- [ ] **Step 5:** `git commit -m "feat(abilities): vulnerability via negative resistance, spell immunity to all spells"`

### Task 5: `summon` на тригері `kill`

**Files:**
- Modify: `lib/utils/abilities/schema/ability.ts:41` — дозволити `summon` також на `trigger.event === "kill"`.
- Modify: потік атаки — протягнути `summons` з `runAbilities` (тригер `kill`) у результат атаки:
  - перевірити `lib/utils/battle/attack/process/ability-flow.ts`, `lib/utils/battle/attack-phase/run-attack-phase.ts` і те, що повертає `attack-mutation`;
  - зробити так, як уже зроблено в `app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts:118`: `applyAbilitySummons(result.summons, …)` з тими ж `deps`.
- Modify: `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts` (і `createAttackMutation`/deps, якщо deps інжектуються як у spell).
- Test: `lib/utils/battle/attack/__tests__/kill-summon.test.ts` (рівень рушія: результат атаки містить `summons`) + оновлення тесту `attack-mutation`, якщо він є.

**Interfaces:**
- Consumes: `applyAbilitySummons(requests, order, { campaignId, battleId, rng, deps })` з `lib/utils/battle/summon/ability-summons.ts`.
- Produces: результат атакової фази має поле `summons: SummonRequest[]` (порожнє за замовчуванням).

- [ ] **Step 1: Тест.**
  - Атакувальник зі здібністю `{ trigger: { event: "kill", killer: true }, limits: { perRound: 1 }, effects: [{ kind: "summon", unitId: "skeleton" }] }` вбиває ціль → `result.summons` дорівнює `[{ ownerId: attacker.id, unitId: "skeleton", count: 1 }]`.
  - Форму тригера `kill` звірити зі `schema/triggers.ts`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** PASS. Прогнати також `pnpm test:run app/api lib/utils/battle/attack`.
- [ ] **Step 5:** `git commit -m "feat(battle): summon on kill trigger"`

### Task 6: `levelScaling` для прикликаних юнітів

**Files:**
- Modify: `prisma/schema.prisma` (`Unit`): `levelScaling Json?`.
- Create: міграція `pnpm exec prisma migrate dev --name unit_level_scaling` (локальна Docker БД `pnpm db:local`). SQL лише `ALTER TABLE "units" ADD COLUMN "levelScaling" JSONB;`.
- Create: `lib/utils/units/level-scaling.ts`.
- Modify: `lib/utils/abilities/engine/types.ts` — `SummonRequest.casterLevel?: number`.
- Modify: місця, де створюються `SummonRequest` (`grep -rn "summons.push\|kind === \"summon\"" lib/utils/abilities/engine lib/utils/battle/spell`) — підставити `casterLevel: owner.abilities.level`.
- Modify: `lib/utils/battle/summon/ability-summons.ts` — після `createBattleParticipantFromUnit` застосувати `scaleSummon(built, unit.levelScaling, req.casterLevel)`.
- Modify: `types/units.ts`, `UnitFromPrisma`, якщо поля перелічені вручну. Додати `levelScaling` у `select` пулу summon (`loadPool`).
- Test: `lib/utils/units/__tests__/level-scaling.test.ts`

**Interfaces:**
- Produces:

```ts
export interface LevelScaling { hpPerLevel: number; damagePerLevel: number; attackPerTwoLevels: number }
export const LevelScalingSchema: z.ZodType<LevelScaling>;
export function scaleSummon(p: BattleParticipant, scaling: unknown, casterLevel: number | undefined): BattleParticipant;
```

  `scaleSummon` повертає `p` без змін, якщо `scaling` не проходить схему або `casterLevel` не число (Review Focus 2). Інакше:
  - `maxHp` і `currentHp` += `hpPerLevel × L`;
  - кожна атака отримує `damageDice` з доданим `+${damagePerLevel × L}` (через наявний парсер кубиків — `parseDiceLenient`/форматер у `lib/utils/common/dice`);
  - `attackBonus` += `floor(L / 2) × attackPerTwoLevels`.

  Поля HP звірити в `types/battle.ts` (`combatStats.maxHp`, `combatStats.currentHp`).

- [ ] **Step 1: Тести.**
  - База 15 HP / `2d6` / +3 / scaling `{6, 1, 1}` / L = 10 → 75 HP / `2d6+10` / +8.
  - `casterLevel` undefined → без змін.
  - `scaling` null → без змін.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Реалізація + міграція. `pnpm exec prisma generate`.
- [ ] **Step 4:** PASS. `pnpm test:run prisma` (RLS-тест міграцій) + tsc.
- [ ] **Step 5:** `git commit -m "feat(units): levelScaling for summoned units"`

### Task 7: «Вишкіл війська» — один раз на сторону

**Files:**
- Test: `lib/utils/abilities/engine/__tests__/army-drill-once.test.ts`
- Modify (лише якщо тест падає): механізм стекування timed-модифікаторів. У схемі здібності є `stackable` — подивитися, як `modifyStat` з `duration` і `target: "allAllies"` дедуплікується за `ability.id`.
  - Найменша правка: таймовий ефект з тим самим `sourceAbilityId` на тій самій цілі не накопичується, якщо `ability.stackable !== true` (оновлює тривалість).
  - Якщо дедуплікація зачіпає наявну поведінку скілів, обмежити її через `stackable: false` явно в `data/library/race-passives.ts` (humans).

- [ ] **Step 1: Тест.**
  - Три учасники-союзники з расовою пасивкою `RACE_PASSIVES.humans.trait` (через `racePassiveAbilities`). Після `battleStart` ефективна мораль кожного = база + 1, не + 3 (`collectModifiers(..., { stat: "morale" })`).
  - Взяти фікстури з наявних тестів `battleStart`.
- [ ] **Step 2:** запустити. Якщо PASS одразу — зафіксувати тест, правки не потрібні.
- [ ] **Step 3:** Якщо FAIL — правка, як описано вище.
- [ ] **Step 4:** PASS + `pnpm test:run lib/utils/abilities lib/utils/battle`.
- [ ] **Step 5:** `git commit -m "fix(abilities): army drill morale applies once per side"`

### Task 8: Каталог здібностей юнітів і тип `LibraryUnit`

**Files:**
- Create: `data/library/unit-abilities.ts`
- Modify: `data/library/types.ts` (`LibraryUnit`, `LibraryUnitAttack`, `LibrarySource.units`, `Library.unitByKey`)
- Create: `data/library/unit-stats.ts` (хелпер характеристик)
- Test: `data/library/__tests__/unit-abilities.test.ts`

**Interfaces:**
- Produces (`types.ts`):

```ts
export type UnitRole = "base" | "upgrade" | "alt";

export interface LibraryUnitAttack {
  name: string;
  type: "melee" | "ranged";
  dice: string;
  damageType: string;
  targets?: number;
}

export interface LibraryUnit {
  key: string;
  name: string;
  raceKey: string | null;
  tier: number;
  role: UnitRole;
  hp: number;
  ac: number;
  attackBonus: number;
  initiative: number;
  attacks: LibraryUnitAttack[];
  abilities: Ability[];
  spellKeys?: string[];
  flying?: boolean;
  levelScaling?: LevelScaling;
}
```

  `targets > 1` означає, що сід ставить атаці `maxTargets = targets`, а `abilities` мають містити `falloff()`; build перевіряє це.

- Produces (`unit-abilities.ts`): усі фабрики повертають `Ability` (id `unit-<slug>`, назва українською, `description` українською — коротко, що робить). Обов'язковий набір з точними сигнатурами:

```ts
noRetaliation(): Ability
unlimitedRetaliation(): Ability
falloff(name: string): Ability
doubleStrike(name: string, chance: number): Ability
firstStrike(name: string, percent?: number): Ability
deathBlow(name: string, chance: number): Ability
armorBreak(name: string, flat?: number): Ability
rage(percent?: number): Ability
hatred(name: string, races: string[], percent?: number): Ability
stun(name: string, chance: number): Ability
dot(name: string, dice: string, damageType: string, rounds: number, chance?: number): Ability
debuff(name: string, stat: "attackBonus" | "initiative" | "armor" | "morale", flat: number, rounds: number, chance?: number): Ability
fearAura(name?: string, flat?: number): Ability
disable(name: string, condition: "disable_ranged_attacks" | "disable_spell_casting", chance: number): Ability
charmOnHit(name: string, chance: number): Ability
undead(): Ability
construct(): Ability
elemental(element: "fire" | "cold" | "lightning" | null, vulnerableTo?: string): Ability
magicResist(percent: number): Ability
magicImmunity(): Ability
elementResist(types: string[], percent: number, name: string): Ability
physicalResist(percent: number, types?: string[], name?: string): Ability
incorporeal(): Ability
regeneration(percent: number): Ability
lifeDrain(percent?: number): Ability
retaliateAura(name: string, percent?: number, damageType?: string): Ability
guardian(percent?: number): Ability
bigShield(percent?: number): Ability
bravery(): Ability
undyingOnce(): Ability
healAlly(name: string, amount: Amount, opts?: { bonus?: boolean; perBattle?: number; cleanse?: boolean; targetRaceNote?: string }): Ability
resurrect(): Ability
buffAlly(name: string, effects: Array<{ stat: "attackBonus" | "initiative" | "morale" | "armor"; flat: number }>, rounds: number, opts?: { bonus?: boolean; self?: boolean }): Ability
restoreSlotOnce(name: string): Ability
drainMana(): Ability
summonGroupOnce(name: string, group: string, tier: number): Ability
raiseOnKill(unitKey: string): Ability
extraDamage(name: string, dice: string, damageType: string): Ability
finisher(name: string, condition: Condition, bonus: { percent?: number; advantage?: boolean }): Ability
alliesAura(name: string, effect: Effect): Ability
enemiesRoundDamage(name: string, percentOfAttack: number): Ability
oncePerBattleAoe(name: string, opts: { percentOfAttack: number; targets: "all" | number; stunChance?: number; damageType?: string }): Ability
wheelOfFortune(): Ability
critRange(threshold: number): Ability
flavor(text: string): Ability
```

  Механіки кожної фабрики — за таблицею spec §3 (колонка «Рушій»).
  - Тригери: `hit { role: "attacker" }` для «на влучання», `passive` для аур і опорів, `bonusAction`/`action` з `limits.perBattle` для «раз за бій».
  - `percentOf: "ownerAttack"` для шкоди здібностей.
  - `elemental(null)` = лише ігнор моралі + імунітет до страху.

- Produces (`unit-stats.ts`): `abilityScores(unit: Pick<LibraryUnit, "tier" | "attackBonus" | "hp" | "attacks">): Record<AbilityScoreKey, number>` і `proficiencyForTier(tier: number): number` (T1–2 → 2, T3–4 → 3, T5–6 → 4, T7 → 5).
  - Основна характеристика (СИЛ для melee, ЛОВ для ranged) = `10 + 2 × (attackBonus − proficiency)`, мінімум 8.
  - ТІЛ = `10 + 2 × min(5, floor(hp / 40))`.
  - Решта = 10.

- [ ] **Step 1: Тест.** Кожна фабрика з типовими параметрами дає `AbilitySchema.safeParse(...).success === true`. Перелічити всі фабрики масивом викликів і перевірити в циклі. Плюс `abilityScores({ tier: 1, attackBonus: 3, hp: 12, attacks: [{ type: "melee", … }] }).strength === 12`.
- [ ] **Step 2:** FAIL (файлів немає).
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** PASS + tsc.
- [ ] **Step 5:** `git commit -m "feat(library): unit ability catalog and LibraryUnit type"`

### Task 9: Перевірка бібліотеки та сід юнітів

**Files:**
- Create: `data/library/units.ts` — експорт `UNITS: LibraryUnit[]`, спершу порожній масив; задачі 10–17 його наповнюють, кожна раса в окремому файлі `data/library/units/<race-key>.ts`, а `units.ts` їх склеює.
- Modify: `data/library/build.ts` — `LIBRARY_SOURCE.units = UNITS`. Перевірки:
  - унікальні `key`/`name`;
  - `raceKey` існує або null;
  - `tier` 1–7;
  - `spellKeys` існують;
  - `checkAbilities` + `checkRefs`;
  - `targets > 1` ⇒ є здібність з прапором `multiTargetFalloff`;
  - для раси з юнітами їх рівно 21, по 3 на тір з ролями base/upgrade/alt;
  - `Library.unitByKey`.
- Modify: `scripts/seed-library-lib.ts` — `unitRow(unit, maps, raceIds)` повертає дані для Prisma:
  - `name`, `raceId`, `level: tier`, характеристики з `abilityScores`, `armorClass`, `initiative`, `speed: 30`, `maxHp`, `proficiencyBonus`;
  - `attacks` (`{ name, type, attackBonus, damageDice: dice, damageType, maxTargets: targets }`);
  - `knownSpells` (ids);
  - `abilities` (через `remapRefs`), плюс `flavor("Літає")` для `flying`;
  - `morale: 1`;
  - `maxTargets: max(targets)`;
  - `levelScaling`.
- Modify: `scripts/seed-library.ts`:
  - таллі `юніти`; upsert юнітів за назвою після рас і заклять;
  - при оновленні не чіпати `avatar`;
  - друга фаза: закляття, чиї бібліотечні `effects` містять `summon` з `unitId`, що є ключем юніта бібліотеки, — замінити `unitId` на id юніта в БД і записати `spellEffects` (перезаписуючи `keepEffects` для таких заклять).
- Test: `data/library/__tests__/library.test.ts` (розширити), `scripts/__tests__/seed-library-lib.test.ts` (розширити: `unitRow`).

**Interfaces:**
- Consumes: `LibraryUnit`, `abilityScores`, `proficiencyForTier` (задача 8), `LevelScaling` (задача 6).
- Produces: `unitRow(unit: LibraryUnit, maps: Pick<IdMaps, "groups" | "spells">, races: ReadonlyMap<string, string>): Omit<Prisma.UnitUncheckedCreateInput, "campaignId">`; `UNITS`; `Library.unitByKey: Map<string, LibraryUnit>`.

- [ ] **Step 1: Тести.**
  - `unitRow` для тестового юніта T2 з `targets: 3` і `spellKeys` → `attacks[0].maxTargets === 3`, `knownSpells` — id з мапи, `level === 2`, `strength` за формулою, без `avatar` у даних (Review Focus 5).
  - `buildLibrary` падає на юніті з невідомою расою і на `targets: 2` без `falloff`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Реалізація.
- [ ] **Step 4:** PASS. Потім на локальній БД: `pnpm seed-library <local campaign id> --dry-run` (проходить, юніти 0).
- [ ] **Step 5:** `git commit -m "feat(library): validate and seed library units"`

### Tasks 10–16: Юніти рас (одна задача на расу)

Кожна задача створює `data/library/units/<race-key>.ts` з `export const <RACE>_UNITS: LibraryUnit[]` і додає його в `data/library/units.ts`.

| Задача | Файл | Раса (`raceKey`) | Дані |
|---|---|---|---|
| 10 | `units/humans.ts` | Люди (`humans`) | spec §4.1 |
| 11 | `units/dark-elves.ts` | Темні ельфи (`dark-elves`) | spec §4.2 |
| 12 | `units/mages.ts` | Маги (`mages`) | spec §4.3 |
| 13 | `units/demons.ts` | Демони (`demons`) | spec §4.4 |
| 14 | `units/elves.ts` | Ельфи (`elves`) | spec §4.5 |
| 15 | `units/dwarves.ts` | Гноми (`dwarves`) | spec §4.6 |
| 16 | `units/necromancers.ts` | Некроманти (`necromancers`) | spec §4.7 |

`raceKey` звірити з `data/library/races.ts`.

**Interfaces:**
- Consumes: фабрики задачі 8, `LibraryUnit`.
- Правила перенесення таблиці:
  - кожен рядок — один `LibraryUnit`; `key` — латиницею, kebab-case (`humans-peasant`); `role` за позицією в тірі;
  - «Шкода» — це `dice`; кілька цілей → `targets` + `falloff(...)`;
  - «+1d4 вогнем» → `extraDamage`;
  - «N закляття Школи» → `spellKeys` з N заклять цієї школи бібліотеки рівнів 1–3 для T4–T5 і 2–4 для T6–T7. Вибір мотивувати в коментарі задачі, не в коді.
- Приклад (задача 10, перші рядки):

```ts
export const HUMAN_UNITS: LibraryUnit[] = [
  { key: "humans-peasant", name: "Селянин", raceKey: "humans", tier: 1, role: "base", hp: 12, ac: 10, attackBonus: 3, initiative: 8, attacks: [{ name: "Вила", type: "melee", dice: "1d6+1", damageType: "piercing" }], abilities: [] },
  { key: "humans-militia", name: "Ополченець", raceKey: "humans", tier: 1, role: "upgrade", hp: 14, ac: 12, attackBonus: 4, initiative: 8, attacks: [{ name: "Кистень", type: "melee", dice: "1d6+2", damageType: "bludgeoning" }], abilities: [stun("Оглушення", 20)] },
  { key: "humans-archer", name: "Лучник", raceKey: "humans", tier: 2, role: "base", hp: 18, ac: 12, attackBonus: 4, initiative: 8, attacks: [{ name: "Лук", type: "ranged", dice: "1d8+1", damageType: "piercing" }], abilities: [] },
  { key: "humans-marksman", name: "Стрілець", raceKey: "humans", tier: 2, role: "alt", hp: 20, ac: 12, attackBonus: 5, initiative: 8, attacks: [{ name: "Залп", type: "ranged", dice: "1d8+2", damageType: "piercing", targets: 3 }], abilities: [falloff("Залп")] },
];
```

- [ ] **Step 1:** Лише в задачі 10: створити `data/library/__tests__/unit-budget.test.ts` (задачі 11–16 його тільки проганяють):
  - для кожного юніта з `UNITS` без `levelScaling` HP і середня шкода одного влучання лежать у межах ±25 % від `BUDGET[tier] × roleFactor`;
  - середня шкода = середнє кубиків першої атаки плюс середнє кубиків `extraDamage`-здібностей, рахувати наявним хелпером середнього з `lib/utils/common/dice` (знайти: `grep -n "export function" lib/utils/common/dice.ts`);
  - кількість цілей не враховується;
  - `roleFactor`: base 1.0; upgrade/alt 1.12; ×0.85, якщо перша атака ranged або є `spellKeys`;
  - винятки дозволені лише через явний `BUDGET_EXCEPTIONS: Record<key, string>` з причиною: Енти «товсті й повільні», Берсерк «КД вшитий у шкоду», Зомбі «КД 9», Чорний дракон «повний імунітет до магії».

  Задачі 11–16 цей тест лише проганяють.
- [ ] **Step 2:** Перенести таблицю раси.
- [ ] **Step 3:** `pnpm test:run data/library` — PASS (валідація + бюджет).
- [ ] **Step 4:** `git commit -m "feat(library): <race> units"`

### Task 17: Нейтрали та закляття прикликання елементалів

**Files:**
- Create: `data/library/units/neutrals.ts` — 4 елементалі (`raceKey: null`, `tier: 4`, `levelScaling`) та Аватар Смерті (`tier: 7`) за spec §4.8.
- Modify: `data/library/spells.ts` — 4 закляття школи Природи 3-го рівня: «Прикликання елементаля: Вогонь / Вода / Повітря / Земля».
  - `definition: def(0, SELF, [{ kind: "summon", unitId: "neutral-fire-elemental" }])` (ключ юніта бібліотеки, задача 9 перетворює його на id);
  - `limits` раз за бій — так само, як «Поклик звіра», якщо він має ліміт; інакше `cost` за рівнем;
  - `iconKey` — з `SPELL_ICONS` (наявна іконка призиву Природи; `grep -n "Поклик звіра" data/skill-icons.ts data/spell-icons-map.ts`);
  - `appearanceDescription` ≥ 80 символів, українською.
- Modify: `data/library/build.ts` — посилання `summon.unitId` у заклятті, якщо воно не схоже на cuid, має бути ключем юніта бібліотеки.
- Modify: `data/library/spells.ts` «Аватар» лишається DM-вибором (note); в описі Аватара Смерті записати «для закляття Маркела "Аватар"».

- [ ] **Step 1: Тест.** `library.test.ts`: 4 закляття елементалів існують, кожне з `summon.unitId`, що є ключем нейтрала з `levelScaling`. `scaleSummon` для Елементаля землі при L = 6 дає 73 HP.
- [ ] **Step 2–3:** Реалізація; `pnpm test:run data/library scripts`.
- [ ] **Step 4:** Локально: `pnpm seed-library <local id>` двічі. Другий прогін: юніти 0 створено, 152 оновлено. Закляття елементалів мають у БД `unitId` реального юніта (`psql … select "spellEffects" from spells where name like 'Прикликання%'`).
- [ ] **Step 5:** `git commit -m "feat(library): neutral units and elemental summon spells"`

### Task 18: Інструменти балансу на бібліотечних юнітах

**Files:**
- Modify: `scripts/balance-library.ts` — замість `import-units imports/units-import.csv` юніти вже є після `seed-library` у кампанії «SIM: баланс бібліотеки».
  - Додати `--races=humans,demons,…` (за замовчуванням усі 7): для кожної раси свій ростер ворогів того тіру.
  - Рядок звіту отримує колонку раси ворогів.
  - Автоплей юнітів: використати дальні атаки з `maxTargets` (уже вміє); бонусні дії/дії здібностей «раз за бій» (`ability-action`) — якщо автоплей їх не вміє, викликати першу доступну на першому ході юніта (`abilityActionMutation`, як у `bonus-action`).
- Modify: `scripts/simulate-battle-scenario.ts` — `UNITS`/`FAIR_UNITS`/`DEMON_UNIT` брати з `LIBRARY_SOURCE.units` (Демони T1/T4/T7) через `unitRow`.
- Modify: `imports/README.md` — розділ юнітів: «джерело — `data/library/units`, сідиться `pnpm seed-library`». `import-units` лишається як ручний інструмент для DM-CSV, але не для бібліотеки.
- Test: `pnpm simulate-battle` проходить.

- [ ] **Step 1:** Правки.
- [ ] **Step 2:** `pnpm simulate-battle` → без помилок; `pnpm balance-library --runs=2 --levels=3 --races=humans` → таблиця друкується.
- [ ] **Step 3:** `git commit -m "chore(balance): balance tooling on library units"`

### Task 19: Прогони балансу й підгонка

**Files:**
- Modify: `data/library/units/*.ts` (числа), за потреби — бюджет у `unit-budget.test.ts`.
- Create: `docs/reports/2026-10-08-units-balance.md` (українською, формат як `2026-10-08-artifact-sets-balance.md`).

- [ ] **Step 1:** `pnpm balance-library --runs=12 --levels=3,6,10` (усі раси, партії mixed/martial/caster/leader).
- [ ] **Step 2:** Ціль: множники hp/дмг 0.8–1.25 і 70–90 % перемог героїв.
  - Якщо всі раси зсунуті однаково — правити `BUDGET` і масштабувати HP/кубики глобально скриптом.
  - Якщо одна раса — правити її кубики/HP на ±10 %.
  - Не більше 3 ітерацій; що лишилось поза ціллю — у звіт з поясненням.
- [ ] **Step 3:** Звіт: таблиці до/після, висновки по расах, відхилення від spec (ланцюг Демониці, винятки бюджету).
- [ ] **Step 4:** `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit && pnpm simulate-battle`.
- [ ] **Step 5:** `git commit -m "balance(units): tune numbers, balance report"`

### Task 20: Фінальне ревʼю, мердж, прод

- [ ] **Step 1:** Ревʼю всієї гілки (opus, `superpowers:requesting-code-review`), одна хвиля правок.
- [ ] **Step 2:** Повний ланцюг: `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm simulate-battle`.
- [ ] **Step 3:** **Спитати користувача** перед мерджем у `main` і пушем (міграція `unit_level_scaling` піде в прод-білд).
- [ ] **Step 4:** Після деплою — **спитати користувача** і засіяти прод:

```bash
set -a; source .env.production-db.local; set +a
pnpm seed-library cmuylhk0c0001ia06lg5eommv --dry-run --allow-remote
pnpm seed-library cmuylhk0c0001ia06lg5eommv --allow-remote
```

- [ ] **Step 5:** Оновити пам'ять проєкту (`project-units-rebalance.md` + рядок у `MEMORY.md`).
