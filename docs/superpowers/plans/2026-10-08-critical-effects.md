# Критичні ефекти — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** усі 20 ефектів критичної удачі / невдачі реально впливають на бій, а результат подається атмосферною фразою в лозі й на оверлеї.

**Architecture:** ефекти лишаються активними ефектами (`ActiveEffect`) з `abilityEffects` (static flags, які читає `collectModifiers`) або legacy-маркерами, які вже читає `battle-turn.ts`. Нове поле `consumeOn` знімає ефект після першої відповідної атаки (`run-attack-phase.ts`). Провокація й нат.1 на відсічі — у `retaliation.ts`. Фрази — дані в `lib/constants/critical-effects.ts`, вибір детермінований від ідентифікаторів атаки (не з `rng`, щоб не зсувати послідовність кидків). UI читає `actionDetails.criticalEffect` з нового запису логу (як `retaliationOutcome`).

**Tech Stack:** TypeScript strict, Vitest (+ happy-dom для UI), React 19.

**Spec:** `docs/superpowers/specs/2026-10-08-artifact-sets-and-crits-design.md` (частина B).

## Global Constraints

- Номери ефектів — за даними `critical-effects.ts` (id 1–10): удача 3 = «Advantage на наступну атаку», 4 = −2 AC цілі, 6 = безкоштовна атака, 7 = блок бонусної дії, 8 = ігнор реакцій, 9 = мітка для переваги, 10 = комбо; невдача 2 = Prone, 3 = невигідність, 4 = втрата бонусної дії, 5 = **«Зброя вислизає»** (заміна «Урон ×0.5»), 6 = −2 AC собі, 7 = провокація, 8 = втрата реакції, 9 = мітка на собі, 10 = втрата дії. (У таблиці спеку «S4» = id 3.)
- Тривалість «до кінця наступного ходу X» = `duration: 2` на ефекті у X (`decreaseEffectDurations` у `processStartOfTurn` власника: 2 → 1 на початку наступного ходу, 0 — на початку ще наступного).
- Фрази — нейтральні щодо роду (теперішній час, без «він/вона», без дієслів минулого часу про `{attacker}`/`{target}`); той самий принцип для нових рядків логу.
- Не змінювати послідовність викликів `rng` в атаці (існуючі детерміновані тести на `seq(...)` мають лишитися зеленими).
- Мінімум коментарів; імпорти через `@/`; `pnpm lint --fix`.
- S7 і F4 уже працюють: `bonus-action-mutation.ts:41` і `spell-mutation.ts:61` перевіряють `hasUsedBonusAction`, а `battle-turn.ts` виставляє його з `no_bonus_action`. Серверну перевірку з спеку не додаємо — лише тести, що фіксують поведінку (Task 3).

## Review Focus

1. Ефект, накладений критом у цій же атаці, одразу ж «витрачається» нею (перевага S3 зникає, не дочекавшись наступної атаки). Знімати лише ефекти, що існували **до** атаки (Task 2, тест).
2. Мультицільова атака (лук на 2 цілі, «б'є всіх ворогів» Кха-Белеха): перевага S3 має витратитися на першій цілі, мітка S9 — лише на тій цілі, по якій били (Task 2, тест).
3. Провокація F7 на атакері, що вже вмер / ціль без зброї ближнього бою / ціль з `disable_melee_attacks` — відсічі немає, без падіння (Task 4, тест).
4. Нат.1 на відсічі з ефектом «Провокація» — не викликає відсіч на відсіч (Task 4, тест).
5. Старі записи логу без `flavor` (уже збережені бої) — лог і оверлей показують назву ефекту без фрази, без падіння (Task 5/6, тест).

---

### Task 1: Дані ефектів і фрази

**Files:**
- Modify: `lib/constants/critical-effects.ts`
- Test: `lib/constants/__tests__/critical-effects.test.ts` (створити)

**Interfaces:**
- Produces:
  ```ts
  export interface CriticalEffect { …; flavor: string[] }   // рівно 3 фрази з {attacker}/{target}
  export function critFlavor(effect: CriticalEffect, names: { attacker: string; target: string }, seed: string): string;
  ```
  `seed` — рядок `${battleId}:${round}:${attackerId}:${targetId}`; індекс = сума кодів символів `seed` mod `flavor.length`.
  Невдача id 5: `{ name: "Зброя вислизає", description: "Наступне влучання завдає ×0.5 шкоди", effect: { type: "weakened_next_hit", value: 0.5, duration: 2, target: "self" } }`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";

import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS, critFlavor, getCriticalEffect } from "@/lib/constants/critical-effects";

describe("critical effect flavor", () => {
  it("every effect has 3 phrases using {attacker}", () => {
    for (const e of [...CRITICAL_SUCCESS_EFFECTS, ...CRITICAL_FAIL_EFFECTS]) {
      expect(e.flavor).toHaveLength(3);
      for (const f of e.flavor) expect(f).toContain("{attacker}");
    }
  });

  it("substitutes names and is deterministic for a seed", () => {
    const e = getCriticalEffect(6, "success")!;
    const a = critFlavor(e, { attacker: "Семгрун", target: "Бес" }, "b1:2:x:y");

    expect(a).toBe(critFlavor(e, { attacker: "Семгрун", target: "Бес" }, "b1:2:x:y"));
    expect(a).toContain("Семгрун");
    expect(a).not.toContain("{");
  });

  it("replaces half damage with a slipping weapon", () => {
    expect(getCriticalEffect(5, "fail")).toMatchObject({ name: "Зброя вислизає", effect: { type: "weakened_next_hit" } });
  });
});
```

- [ ] **Step 2: Run** `pnpm test:run lib/constants/__tests__/critical-effects.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Додати `flavor` в інтерфейс і в кожен ефект; `critFlavor` — `replaceAll("{attacker}", …)`/`"{target}"`. Фрази:

| Ефект | Фрази |
|---|---|
| Удача 1 Подвійний урон | «{attacker} вкладає в удар усю вагу тіла — {target} аж відкидає назад!» · «Сталь {attacker} проходить крізь захист {target}, мов крізь вологий папір!» · «Удар {attacker} лунає, як грім над Асханом, — {target} хитається від болю!» |
| Удача 2 Максимальний урон | «Ідеальний удар! {attacker} знаходить найвразливіше місце {target}.» · «Доля на боці {attacker}: кожна грань кубиків показує максимум.» · «{attacker} б'є з холодною точністю майстра — {target} нічим не пом'якшити удар.» |
| Удача 3 Advantage на наступну атаку | «{attacker} відчуває ритм бою — наступний удар буде ще влучнішим.» · «Очі {attacker} спалахують: тепер кожен рух {target} як на долоні.» · «Кров кипить, рука певна — {attacker} уже готує наступний удар.» |
| Удача 4 Ослаблення захисту | «Удар {attacker} розколює обладунок {target} — у броні зяє щілина!» · «Ремені лопаються, і щит {target} провисає на руці.» · «{attacker} вибиває {target} з рівноваги — захист розсипається.» |
| Удача 5 Додатковий урон | «Лезо {attacker} прокручується в рані — {target} кричить від болю!» · «{attacker} додає до удару ще й лікоть — підступно, але дієво.» · «Друга хвиля болю накриває {target}: удар {attacker} зачіпає кістку.» |
| Удача 6 Безкоштовна атака | «Клинок {attacker} ще не встиг зупинитися, а вже шукає нову щілину в обороні {target}!» · «{attacker} рухається швидше за думку — ще одна атака напоготові!» · «Вихор сталі: {attacker} одразу ж б'є знову.» |
| Удача 7 Блокування бонусної дії | «Удар {attacker} оглушує {target} — наступного ходу не до хитрощів.» · «{target} хапається за рану й забуває про все, крім неї.» · «У вухах {target} дзвенить — дрібні маневри доведеться відкласти.» |
| Удача 8 Ігнорування реакцій | «{attacker} б'є так раптово, що {target} навіть не встигає замахнутися у відповідь.» · «Удар зі сліпої зони — {target} не бачить, звідки прийшла смерть.» · «{attacker} прослизає під захистом {target}, не лишаючи шансу на відсіч.» |
| Удача 9 Mark для Advantage | «{target} розкривається після удару — союзники {attacker} бачать слабке місце!» · «Кров виказує рану {target} — по ній легко влучити ще раз.» · «{attacker} позначає ціль: тепер {target} — легка здобич.» |
| Удача 10 Комбо-удар | «{attacker} не зупиняється — розворот і ще один, відчайдушний удар!» · «Комбо! {attacker} продовжує атаку, хоч і втрачаючи рівновагу.» · «Інерція несе {attacker} далі — ще один удар, грубий, але небезпечний.» |
| Невдача 1 Простий промах | «{attacker} розсікає порожнечу — {target} навіть не ворухнувся з місця.» · «Удар {attacker} іде вбік. Буває й таке.» · «{attacker} промахується так, що аж соромно перед побратимами.» |
| Невдача 2 Падіння | «{attacker} послизається на закривавленій землі й гепається в багнюку!» · «Нога підвертається — і ось {attacker} уже на землі, дивлячись у небо.» · «Замах надто широкий: {attacker} падає, втрачаючи рівновагу.» |
| Невдача 3 Disadvantage | «Пил засліплює {attacker} — наступний удар буде наосліп.» · «Рука {attacker} тремтить після невдалого замаху.» · «Піт заливає очі {attacker}, і ціль розпливається.» |
| Невдача 4 Втрата бонусної дії | «{attacker} гарячково виправляє хват — на дрібниці часу вже немає.» · «Ремінь заплутується — {attacker} втрачає дорогоцінну мить.» · «Збентеження після промаху змушує {attacker} забути про задум.» |
| Невдача 5 Зброя вислизає | «Руків'я вислизає з пітної долоні {attacker} — наступний удар буде слабким.» · «Зброя ледь не випадає з рук {attacker}, і тепер хват незграбний.» · «Лезо {attacker} б'ється об каміння й тупиться.» |
| Невдача 6 Ослаблення захисту | «{attacker} надто розкривається після замаху — захист нікудишній.» · «Пряжка нагрудника {attacker} лопається, броня з'їжджає набік.» · «Інерція розвертає {attacker} спиною до ворогів.» |
| Невдача 7 Провокація | «{attacker} спотикається просто перед {target} — і такого подарунка не пропускають!» · «Невдалий випад відкриває {attacker} — {target} б'є у відповідь!» · «{target} бачить помилку {attacker} і карає миттєво.» |
| Невдача 8 Втрата реакції | «Після промаху {attacker} не встигне відповісти на удар.» · «Увага {attacker} розсіяна: ворог може бити без остраху відсічі.» · «{attacker} надто зосереджується на власній помилці, щоб стежити за ворогом.» |
| Невдача 9 Mark для ворога | «{attacker} розкривається — тепер кожен ворог бачить слабке місце.» · «Промах лишає {attacker} без захисту, і вороги це помічають.» · «{attacker} стоїть як мішень посеред поля бою.» |
| Невдача 10 Втрата дії | «Невдалий удар виснажує {attacker} — наступний хід піде на відновлення сил.» · «Зброя {attacker} застрягає — наступного ходу доведеться її виколупувати.» · «У голові {attacker} паморочиться — наступного ходу з бійця користі мало.» |

  Також у даних: удача 3 і невдача 3 — `duration: 2`; удача 9 — `duration: 2`; невдача 2, 9 — `duration: 2`; невдача 10 — `duration: 1`.
- [ ] **Step 4: Run** — PASS; `pnpm test:run lib/utils/battle/attack` — без нових падінь (якщо тест чекає «Зменшений урон» — оновити).
- [ ] **Step 5: Commit** `feat(crits): flavor phrases, slipping weapon replaces half damage`.

---

### Task 2: Ефекти, що витрачаються атакою

**Files:**
- Modify: `types/battle.ts` (`ActiveEffect`)
- Create: `lib/utils/battle/attack/consume-effects.ts`
- Modify: `lib/utils/battle/attack-phase/run-attack-phase.ts` (цикл по цілях, ~L191–283)
- Test: `lib/utils/battle/attack/__tests__/consume-effects.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types/battle.ts, ActiveEffect
  consumeOn?: "ownAttack" | "ownHit" | "attackAgainst";
  // consume-effects.ts
  export function activeEffectIds(ps: BattleParticipant[]): Set<string>;
  export function consumeAttackEffects(
    ps: BattleParticipant[],
    a: { attackerId: string; targetId: string; hit: boolean; existedBefore: Set<string> },
  ): BattleParticipant[];
  ```
  Знімає: в атакера — `ownAttack` завжди, `ownHit` якщо `hit`; у цілі — `attackAgainst`. Лише ефекти, чий `id` є в `existedBefore`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";

import { activeEffectIds, consumeAttackEffects } from "../consume-effects";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const eff = (id: string, consumeOn?: ActiveEffect["consumeOn"]): ActiveEffect =>
  ({ id, name: id, type: "buff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], consumeOn }) as ActiveEffect;
const withEffects = (id: string, effects: ActiveEffect[]): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id }, battleData: { ...p.battleData, activeEffects: effects } };
};
const ids = (p: BattleParticipant) => p.battleData.activeEffects.map((e) => e.id);

describe("consumeAttackEffects", () => {
  const a = withEffects("a", [eff("adv", "ownAttack"), eff("weak", "ownHit"), eff("keep")]);
  const t = withEffects("t", [eff("mark", "attackAgainst")]);

  it("consumes attacker ownAttack and target attackAgainst on a miss, keeps ownHit", () => {
    const ps = consumeAttackEffects([a, t], { attackerId: "a", targetId: "t", hit: false, existedBefore: activeEffectIds([a, t]) });

    expect(ids(ps[0])).toEqual(["weak", "keep"]);
    expect(ids(ps[1])).toEqual([]);
  });

  it("consumes ownHit on a hit", () => {
    const ps = consumeAttackEffects([a, t], { attackerId: "a", targetId: "t", hit: true, existedBefore: activeEffectIds([a, t]) });

    expect(ids(ps[0])).toEqual(["keep"]);
  });

  it("keeps effects applied during this attack", () => {
    const ps = consumeAttackEffects([a, t], { attackerId: "a", targetId: "t", hit: true, existedBefore: new Set(["keep"]) });

    expect(ids(ps[0])).toEqual(["adv", "weak", "keep"]);
  });
});
```

  Плюс інтеграційний тест у `lib/utils/battle/attack-phase/__tests__/run-attack-phase.test.ts` (використати його `makeInput`/`armed`): атакер з ефектом `abilityEffects: [{ kind: "flag", flag: "advantage", attackKind: "all" }], consumeOn: "ownAttack"`, атака по двох цілях (дальня, `combatStats.maxTargets: 2`) → у підсумку ефекту немає, а лог першої цілі має `advantageUsed` (або подвійний d20 — як тест-файл уже перевіряє перевагу).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `consume-effects.ts`; у `run-attack-phase.ts` перед `processAttack` у циклі: `const before = activeEffectIds(currentInitiativeOrder);`, після write-back (L243–246):

```ts
currentInitiativeOrder = consumeAttackEffects(currentInitiativeOrder, {
  attackerId: attacker.basicInfo.id,
  targetId: target.basicInfo.id,
  hit: !!attackResult.success,
  existedBefore: before,
});
currentAttacker = currentInitiativeOrder.find((p) => p.basicInfo.id === attacker.basicInfo.id) ?? currentAttacker;
```

  (`success` — поле `ProcessAttackResult`, яке означає влучання; перевірити в `process/run.ts`.)
- [ ] **Step 4: Run** обидва тест-файли + `pnpm test:run lib/utils/battle` — PASS.
- [ ] **Step 5: Commit** `feat(battle): active effects consumed by an attack`.

---

### Task 3: Перемапити ефекти в `critical.ts`

**Files:**
- Modify: `lib/utils/battle/attack/critical.ts`
- Modify: `lib/utils/battle/attack/process/compute.ts` («Зброя вислизає» ×0.5)
- Test: `lib/utils/battle/attack/__tests__/critical.test.ts`, `lib/utils/battle/attack/process/__tests__/hit.test.ts`

**Interfaces:**
- Consumes: `consumeOn` (Task 2), дані Task 1.
- Produces: `applyCriticalEffect(participant, effect, currentRound, target?)` — та сама сигнатура; `EffectSpec` отримує `consumeOn?`, `legacyValue?`, `actionFlags?`, `extraActions?`.

Мапінг `specFor` (усе з `duration` з даних):

| `effect.type` | Що кладеться |
|---|---|
| `advantage_next_attack` | `abilityEffects: [flag advantage all]`, `consumeOn: "ownAttack"` |
| `disadvantage_next_attack` | `abilityEffects: [flag disadvantage]`, `consumeOn: "ownAttack"` |
| `ac_debuff` | як зараз |
| `free_attack` | без активного ефекту: `battleData.pendingExtraActions += 1` |
| `combo_attack` | `pendingExtraActions += 1` + ефект `abilityEffects: [flag disadvantage]`, `consumeOn: "ownAttack"` |
| `block_bonus_action` | як зараз (legacy `no_bonus_action`) |
| `advantage_on_target`, `advantage_on_self` | `abilityEffects: [flag advantageForAttackers]`, `consumeOn: "attackAgainst"` |
| `prone` | `type: "condition"`, `abilityEffects: [flag advantageForAttackers, flag disadvantage]` (без `consumeOn`) |
| `weakened_next_hit` | legacy `weakened_next_hit` (value 0.5), `consumeOn: "ownHit"` |
| `lose_reaction` | без ефекту: `actionFlags.hasUsedReaction = true` |
| `lose_action` | legacy `skip_action` з `value: 100`, `duration: 1` |
| `lose_bonus_action` | як зараз (`hasUsedBonusAction = true`) |
| `stun` | прибрати гілку |

- [ ] **Step 1: Failing tests** у `critical.test.ts` (наявні хелпери `apply`, `crit`, `collectModifiers`):

```ts
it("advantage for the next attack is consumable", () => {
  const p = apply("advantage_next_attack", { duration: 2 });

  expect(p.battleData.activeEffects[0]).toMatchObject({ duration: 2, consumeOn: "ownAttack" });
  expect(collectModifiers([p], "p1", { flag: "advantage" }).flags.length).toBeGreaterThan(0);
});
it("free attack grants an extra action", () => {
  expect(apply("free_attack").battleData.pendingExtraActions).toBe(1);
});
it("combo grants an extra action with a consumable disadvantage", () => {
  const p = apply("combo_attack");

  expect(p.battleData.pendingExtraActions).toBe(1);
  expect(p.battleData.activeEffects[0]).toMatchObject({ consumeOn: "ownAttack" });
});
it("marks on target and self make attackers roll with advantage", () => {
  for (const type of ["advantage_on_target", "advantage_on_self"]) {
    expect(collectModifiers([apply(type)], "p1", { flag: "advantageForAttackers" }).flags.length).toBeGreaterThan(0);
  }
});
it("prone gives attackers advantage and the owner disadvantage", () => {
  const p = apply("prone", { duration: 2 });

  expect(collectModifiers([p], "p1", { flag: "advantageForAttackers" }).flags.length).toBeGreaterThan(0);
  expect(collectModifiers([p], "p1", { flag: "disadvantage" }).flags.length).toBeGreaterThan(0);
});
it("losing the reaction is immediate", () => {
  const p = apply("lose_reaction");

  expect(p.actionFlags.hasUsedReaction).toBe(true);
  expect(p.battleData.activeEffects).toHaveLength(0);
});
it("losing the action skips the next turn's action", () => {
  const p = apply("lose_action");

  expect(effectTypes(p)).toEqual(["skip_action"]);
  expect(p.battleData.activeEffects[0].effects[0].value).toBe(100);
});
```

  (Підлаштувати форму запиту `collectModifiers(..., { flag })` під ту, що вже використовує цей тест-файл.)
  Інтеграційні тести:
  - `battle-turn` (`lib/utils/battle/__tests__/battle-turn*.test.ts` або новий): учасник після `lose_action` → `processStartOfTurn(p, 2, [p], () => 0.5)` дає `actionFlags.hasUsedAction === true`; після `lose_reaction` → наступний `processStartOfTurn` повертає `hasUsedReaction === false`; після `block_bonus_action` на цілі → її `processStartOfTurn` дає `hasUsedBonusAction === true`.
  - **S7/F4 на сервері:** у тест бонусної дії (`app/api/__tests__` або тест `bonus-action-mutation.ts`, якщо є; інакше — юніт на функцію mutate з `bonus-action-mutation.ts`) учасник з `hasUsedBonusAction: true` → помилка `action_used`.
  - **«Зброя вислизає»:** у `hit.test.ts` атакер з ефектом `effects: [{ type: "weakened_next_hit", value: 0.5 }], consumeOn: "ownHit"`, `damageRolls: [8]` → шкода вдвічі менша, ніж без ефекту (порівняти з контрольним викликом), у `damageSteps` є крок `kind: "multiplier", value: 0.5` з назвою ефекту.
- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/attack` — FAIL.
- [ ] **Step 3: Implement** мапінг у `critical.ts` (поля `consumeOn`, `legacyValue` → `effects: [{ type: spec.legacy, value: spec.legacyValue ?? 1 }]`, гілки для `free_attack`/`combo_attack`/`lose_reaction` змінюють `battleData`/`actionFlags`). У `compute.ts` після блоку `additional_damage` (~L133):

```ts
const weakened = attacker.battleData.activeEffects.find((e) => e.effects.some((d) => d.type === "weakened_next_hit"));

if (weakened) {
  physicalDamage = Math.floor(physicalDamage * 0.5);
  damageSteps.push({ label: weakened.name, side: "attacker", kind: "multiplier", value: 0.5, after: physicalDamage });
}
```

  (Тут `attacker` — учасник до застосування крит-ефекту цієї атаки; якщо в `compute.ts` змінна вже перезаписана — брати копію з початку функції. Ефект знімає Task 2 після влучання.)
- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle` — PASS.
- [ ] **Step 5: Commit** `fix(crits): every critical effect changes the fight`.

---

### Task 4: Провокація і нат.1 на відсічі

**Files:**
- Modify: `lib/utils/battle/attack/retaliation.ts`
- Modify: `lib/utils/battle/attack-phase/run-attack-phase.ts` (виклик відсічі, ~L257–280)
- Test: `lib/utils/battle/attack/__tests__/retaliation.test.ts`

**Interfaces:**
- Produces: `RetaliationInput.provoked?: boolean` — пропускає перевірки `isCriticalFail` і `hasUsedReaction` (L58, L64), не витрачає реакцію; решта умов (живі обидва, є зброя потрібного типу, `disable_*`) лишаються.
  У `RetaliationResult.battleAction.actionDetails.criticalEffect` — ефект невдачі відсічі, якщо нат.1.

- [ ] **Step 1: Failing tests** (білдери `unit`, `retaliate` з цього файла):
  - атака з `attackRoll: { isCriticalFail: true }`, `criticalEffect` = невдача 7, `provoked: true` → результат не `null`, у логу відсіч; `defender.actionFlags.hasUsedReaction` не змінюється на `true`.
  - те саме, але захисник з `hasUsedReaction: true` → відсіч усе одно є.
  - `provoked: true`, захисник без атаки ближнього бою → `null`.
  - `provoked: true`, атакер уже мертвий → `null`.
  - нат.1 на відсічі (rng так, щоб `rollD20` дав 1: `seq(0)`; другий кидок — теж з `seq`) і `getRandomCriticalEffect("fail", rng)` → невдача 2 (Prone): у захисника з'являється ефект Prone, `battleAction.actionDetails.criticalEffect.id === 2`. Якщо випала невдача 7 — **жодної** нової відсічі.
  - без `provoked` нат.1 атакера, як і раніше, → `null`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** `retaliation.ts`: умови з `input.provoked`; після кидка відсічі `if (roll.isCriticalFail && roll.criticalEffect) defender = applyCriticalEffect(defender, roll.criticalEffect, input.round);` (ефект `provoke_opportunity_attack` тут нічого не робить — `specFor` його не мапить); `criticalEffect` у `actionDetails`. `run-attack-phase.ts`: у виклик `resolveRetaliation` додати `provoked: attackResult.criticalEffectApplied?.effect.type === "provoke_opportunity_attack"`.
- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle` — PASS.
- [ ] **Step 5: Commit** `fix(crits): provoked retaliation and fumbles on retaliation`.

---

### Task 5: Фраза в лозі

**Files:**
- Modify: `types/battle.ts` (`actionDetails.criticalEffect.flavor?: string`)
- Modify: `lib/utils/battle/attack/process/actions.ts` (`buildBattleActionForCriticalFail`, `buildBattleActionForHit`, відсіч ~L295/L322)
- Modify: `lib/utils/battle/attack/process/run.ts`, `process/critical-fail.ts`, `attack/retaliation.ts` (передати фразу)
- Modify: `lib/utils/battle/battle-log-format.ts`
- Test: `lib/utils/battle/attack/process/__tests__/hit.test.ts`, `lib/utils/battle/__tests__/battle-log-format.test.ts`

**Interfaces:**
- Consumes: `critFlavor(effect, names, seed)` (Task 1).
- Produces: `actionDetails.criticalEffect = { id, name, description, type, flavor? }`. Тексти `resultText`:
  - влучання з критом: `` `${attacker} → ${target}: ${dmg} шкоди. Критичне влучання — ${name}! ${flavor}` ``
  - критична невдача: `` `${attacker}: критична невдача — ${name}. ${flavor}` ``
  - без криту — як зараз.

- [ ] **Step 1: Failing tests:**
  - `hit.test.ts`: `processAttack` з `d20Roll: 20` і `rng: seq(0.55)` (вибирає ефект 6) → `battleAction.actionDetails.criticalEffect.flavor` — один з `getCriticalEffect(6,"success").flavor` з підставленими іменами; `resultText` містить «Критичне влучання — Безкоштовна атака!» і фразу.
  - те саме для `d20Roll: 1` → `resultText` починається з `${attacker}: критична невдача — `.
  - `battle-log-format.test.ts`: запис з `criticalEffect` без `flavor` → рядок «Ефект [d10: N]: name — description» як зараз; з `flavor` → додатковий рядок з фразою.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** У `processAttack` після кидка: `const flavor = attackRoll.criticalEffect ? critFlavor(attackRoll.criticalEffect, { attacker: attacker.basicInfo.name, target: target.basicInfo.name }, \`${battleId}:${currentRound}:${attacker.basicInfo.id}:${target.basicInfo.id}\`) : undefined;` і передати новим останнім параметром `critFlavorText?: string` у `handleCriticalFail` → `buildBattleActionForCriticalFail` і в `buildBattleActionForHit`. У відсічі — те саме з `seed` `${battleId}:${round}:${defenderId}:${attackerId}:r`. `battle-log-format.ts:131–139`: якщо `d.criticalEffect.flavor` — додати рядок з фразою.
- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle` — PASS (оновити старі очікування `resultText`, що містили «(КРИТИЧНЕ ПОПАДАННЯ!)» / «критично промахнувся!»).
- [ ] **Step 5: Commit** `feat(crits): atmospheric phrase in the battle log`.

---

### Task 6: Оверлей результату

**Files:**
- Create: `lib/utils/battle/view/crit-outcome.ts`
- Modify: `lib/hooks/battle/useBattleScene.ts` (`ResultFx`)
- Modify: `lib/hooks/battle/useAttackWizard.ts` (~L100–145)
- Modify: `components/battle/fx/ResultOverlay.tsx`
- Test: `lib/utils/battle/view/__tests__/crit-outcome.test.ts`, `components/battle/fx/__tests__/result-overlay.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // crit-outcome.ts — як retaliationOutcome (view/retaliation.ts:8)
  export function critOutcome(log: BattleAction[], seen: Set<number>, attackerId: string): { name: string; flavor?: string; type: "success" | "fail" } | undefined;
  // ResultFx
  { kind: "hit" | "crit"; …; critEffect?: { name: string; flavor?: string } }
  { kind: "miss"; …; critFail?: { name: string; flavor?: string } }
  ```

- [ ] **Step 1: Failing tests:**
  - `crit-outcome.test.ts`: лог з двома новими записами (атака з `criticalEffect`, потім відсіч з іншим `criticalEffect`) → повертає ефект атаки (запис, де `actorId`/`attacker` = `attackerId`); старі (`seen`) ігнорує; без ефекту → `undefined`.
  - `result-overlay.test.tsx` (`it.each` з наявним `fakeScene`):
    - `{ kind: "crit", …, critEffect: { name: "Безкоштовна атака", flavor: "Вихор сталі: Айвен одразу ж б'є знову." } }` → видно «Критичне влучання», «Безкоштовна атака», фразу;
    - `{ kind: "miss", …, critFail: { name: "Падіння", flavor: "…" } }` → «Критична невдача», «Падіння», фраза; немає «Промах»;
    - `{ kind: "crit", … }` без `critEffect` → лише «Критичне влучання» (старі записи).
- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/view components/battle/fx` — FAIL.
- [ ] **Step 3: Implement.** `critOutcome` — за зразком `retaliationOutcome`. У `useAttackWizard` поруч з `retaliationOutcome(...)` викликати `critOutcome(scene.readBattle()?.battleLog ?? [], seen, attackerId)` і класти в `critEffect` (для `crit`) або `critFail` (коли `outcome === "critFail"`, що зараз мапиться в `miss`). `ResultOverlay`: у гілці `miss` — якщо `result.critFail`, заголовок «Критична невдача», під ним назва ефекту й фраза (курсив, `--hud-muted`); у гілці `crit` — назва ефекту й фраза під шкодою. Стилі — як сусідні рядки оверлею.
- [ ] **Step 4: Run** ті самі тести + `pnpm test:run lib/hooks/battle` — PASS.
- [ ] **Step 5: Commit** `feat(crits): show the effect and phrase on the result overlay`.

---

### Task 7: Фінальна перевірка

- [ ] `pnpm lint`, `pnpm test:run`, `pnpm build` — чисто.
- [ ] Локальний бій (`pnpm dev`, локальна БД): DM-кидком виставити d20 = 20 і d20 = 1 кілька разів; переконатися, що оверлей і лог показують ефект і фразу, а ефекти (перевага, Prone, втрата дії) видно в списку активних ефектів учасника.
- [ ] Оновити `docs/superpowers/specs/2026-10-08-artifact-sets-and-crits-design.md` §B2: S7/F4 — серверна перевірка вже існувала, додано лише тести; вибір фрази — детермінований від ідентифікаторів атаки, не `rng`. Commit `docs(spec): crit plan rulings`.
