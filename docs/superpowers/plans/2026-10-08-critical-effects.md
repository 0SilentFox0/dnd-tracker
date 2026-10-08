# Критичні ефекти — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** усі 20 ефектів критичної удачі / невдачі реально впливають на бій, а результат подається атмосферною фразою в лозі й на оверлеї.

**Architecture:** ефекти лишаються активними ефектами (`ActiveEffect`) з `abilityEffects` (static flags, які читає `collectModifiers`) або legacy-маркерами, які вже читає `battle-turn.ts`. Нове поле `consumeOn` знімає ефект після першої відповідної атаки (`run-attack-phase.ts`). Провокація й нат.1 на відсічі — у `retaliation.ts`. Фрази — дані в `lib/constants/critical-effects.ts`, вибір детермінований від ідентифікаторів атаки (не з `rng`, щоб не зсувати послідовність кидків). UI читає `actionDetails.criticalEffect` з нового запису логу (як `retaliationOutcome`).

**Tech Stack:** TypeScript strict, Vitest (+ happy-dom для UI), React 19.

**Spec:** `docs/superpowers/specs/2026-10-08-artifact-sets-and-crits-design.md` (частина B).

## Global Constraints

- Номери ефектів — за даними `critical-effects.ts` (id 1–10): удача 3 = «Advantage на наступну атаку», 4 = −2 AC цілі, 6 = безкоштовна атака, 7 = блок бонусної дії, 8 = ігнор реакцій, 9 = мітка для переваги, 10 = комбо; невдача 2 = Prone, 3 = невигідність, 4 = втрата бонусної дії, 5 = **«Зброя вислизає»** (заміна «Урон ×0.5»), 6 = −2 AC собі, 7 = провокація, 8 = втрата реакції, 9 = мітка на собі, 10 = втрата дії. (У таблиці спеку «S4» = id 3.)
- Тривалість «до кінця наступного ходу X» = `duration: 2` + `expireAtTurnEnd: true` на ефекті у X. `decreaseEffectDurations` працює лише на початку ходу власника (`battle-turn.ts:81`): 2 → 1 на початку наступного ходу; Task 2 додає зняття ефектів з `expireAtTurnEnd && duration === 1` наприкінці ходу власника (`advance-turn.ts:~41`, де обробляється `turnEnd`). Ефект, накладений у власний хід (невдача), має `duration 2` і переживає кінець поточного ходу.
- Прийняте обмеження: додатковий хід від моралі (`advance-turn.ts:68-74`) скидає всі прапорці дій без `processStartOfTurn`, тож F8/S7 у такий хід не діють. Не виправляємо.
- Крити на відсічі: S6/S10 (додаткова дія) там — без ефекту (захисник поза своїм ходом), F4 на відсічі — фактично без ефекту (скидається на початку ходу захисника). Задокументувати в спеку (Task 7).
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
- Modify: `lib/utils/battle/attack/__tests__/critical.test.ts:9`, `lib/utils/battle/damage/__tests__/hero-damage.test.ts:23`, `lib/utils/battle/damage/__tests__/balance-multiplier.test.ts:104` — літерали `CriticalEffect` отримують `flavor: []` (інакше `pnpm build` впаде на type-check)
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
  it("every effect has 3 phrases naming a participant", () => {
    for (const e of [...CRITICAL_SUCCESS_EFFECTS, ...CRITICAL_FAIL_EFFECTS]) {
      expect(e.flavor).toHaveLength(3);
      for (const f of e.flavor) expect(f.includes("{attacker}") || f.includes("{target}")).toBe(true);
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
| Невдача 1 Простий промах | «{attacker} розсікає порожнечу — {target} навіть не здригається.» · «Удар {attacker} іде вбік. Буває й таке.» · «{attacker} промахується так, що аж соромно перед побратимами.» |
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

### Task 2: Ефекти, що витрачаються атакою або кінчаються в кінці ходу

**Files:**
- Modify: `types/battle.ts` (`ActiveEffect`)
- Create: `lib/utils/battle/attack/consume-effects.ts`
- Modify: `lib/utils/battle/attack/process/run.ts` (`processAttack`: знімок до атаки, споживання перед кожним `return`, крім гілки скасованої атаки L49–64)
- Modify: `lib/utils/battle/attack/retaliation.ts` (споживання після відсічі: атакер = захисник, ціль = атакер)
- Modify: `lib/utils/battle/turn/advance-turn.ts` (~L41, обробка `turnEnd` власника: зняти `expireAtTurnEnd && duration === 1`)
- Modify: `lib/utils/battle/attack/critical.ts` — id ефекту `critical-${spec.idPart}-${Date.now()}-${updated.battleData.activeEffects.length}` (щоб два однакові крити в одну мілісекунду мали різні id)
- Test: `lib/utils/battle/attack/__tests__/consume-effects.test.ts`, `lib/utils/battle/attack-phase/__tests__/multi-target-roll.test.ts` (або `run-attack-phase.test.ts`), `lib/utils/battle/attack/__tests__/retaliation.test.ts`, тест `advance-turn` (знайти наявний у `lib/utils/battle/turn/__tests__`)

**Interfaces:**
- Produces:
  ```ts
  // types/battle.ts, ActiveEffect
  consumeOn?: "ownAttack" | "ownHit" | "attackAgainst";
  expireAtTurnEnd?: boolean;
  // consume-effects.ts
  export function activeEffectIds(ps: BattleParticipant[]): Set<string>;
  export function consumeAttackEffects(
    ps: BattleParticipant[],
    a: { attackerId: string; targetId: string; hit: boolean; existedBefore: Set<string> },
  ): BattleParticipant[];
  export function expireTurnEndEffects(p: BattleParticipant): BattleParticipant;
  ```
  `consumeAttackEffects` знімає: в атакера — `ownAttack` завжди, `ownHit` якщо `hit`; у цілі — `attackAgainst`. Лише ефекти, чий `id` є в `existedBefore` (ефект, накладений цією ж атакою, лишається).
  Оскільки споживання живе в `processAttack`, воно працює для звичайних атак, мультицільових (кожна ціль — окремий `processAttack`), атак берсерка (`turn/berserk.ts:84`) і (окремим викликом) відсічі.

- [ ] **Step 1: Failing tests** — юніт:

```ts
import { describe, expect, it } from "vitest";

import { activeEffectIds, consumeAttackEffects, expireTurnEndEffects } from "../consume-effects";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const eff = (id: string, over: Partial<ActiveEffect> = {}): ActiveEffect =>
  ({ id, name: id, type: "buff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], ...over }) as ActiveEffect;
const withEffects = (id: string, effects: ActiveEffect[]): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id }, battleData: { ...p.battleData, activeEffects: effects } };
};
const ids = (p: BattleParticipant) => p.battleData.activeEffects.map((e) => e.id);

describe("consumeAttackEffects", () => {
  const a = withEffects("a", [eff("adv", { consumeOn: "ownAttack" }), eff("weak", { consumeOn: "ownHit" }), eff("keep")]);
  const t = withEffects("t", [eff("mark", { consumeOn: "attackAgainst" })]);

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

describe("expireTurnEndEffects", () => {
  it("drops turn-end effects only on their last turn", () => {
    const p = withEffects("a", [eff("fresh", { expireAtTurnEnd: true, duration: 2 }), eff("last", { expireAtTurnEnd: true, duration: 1 }), eff("plain", { duration: 1 })]);

    expect(ids(expireTurnEndEffects(p))).toEqual(["fresh", "plain"]);
  });
});
```

  Інтеграційні:
  - мультицільова дальня атака (шаблон — `lib/utils/battle/attack-phase/__tests__/multi-target-roll.test.ts`), атакер з ефектом `abilityEffects: [{ kind: "flag", flag: "advantage", attackKind: "all" }], consumeOn: "ownAttack"` → `allBattleActions[0].actionDetails.secondRoll.mode === "advantage"`, у `allBattleActions[1]` немає `secondRoll`, після атаки ефекту немає;
  - відсіч (`retaliation.test.ts`, білдери `unit`/`retaliate`): захисник з `consumeOn: "ownAttack"` ефектом → після відсічі ефекту немає; атакер з `attackAgainst` ефектом → знято;
  - `advance-turn`: учасник з `expireAtTurnEnd, duration: 1` після завершення свого ходу — без ефекту; з `duration: 2` — ефект лишається.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
  - `consume-effects.ts` за інтерфейсом.
  - `run.ts`: на початку `processAttack` (після `getP` атакера, ~L43) `const existedBefore = activeEffectIds(flow.ps);`; перед кожним `return` у гілках crit-fail / miss / hit: `flow.ps = consumeAttackEffects(flow.ps, { attackerId, targetId, hit: <true лише в гілці влучання>, existedBefore })` і оновити `attackerUpdated`/`targetUpdated` з `flow.ps`. Гілку скасованої атаки (L49–64) не чіпати.
  - `retaliation.ts`: після застосування результату відсічі — `consumeAttackEffects(ps, { attackerId: defenderId, targetId: attackerId, hit: isHit, existedBefore })`, знімок `existedBefore` — на вході в `resolveRetaliation`.
  - `advance-turn.ts`: там, де завершується хід поточного учасника (поруч з подією `turnEnd`), замінити учасника на `expireTurnEndEffects(p)`.
  - `critical.ts`: id з суфіксом довжини `activeEffects`.
- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle` — PASS.
- [ ] **Step 5: Commit** `feat(battle): active effects consumed by an attack or ending at turn end`.

---

### Task 3: Перемапити ефекти в `critical.ts`

**Files:**
- Modify: `lib/utils/battle/attack/critical.ts`
- Modify: `lib/utils/battle/attack/process/compute.ts` («Зброя вислизає» ×0.5)
- Modify: `lib/utils/battle/attack-phase/run-attack-phase.ts` (після циклу по цілях: безкоштовна атака на мультицільовій атаці)
- Modify: `lib/utils/battle/attack/retaliation.ts` (S6/S10 на відсічі — без додаткової дії)
- Test: `lib/utils/battle/attack/__tests__/critical.test.ts`, `lib/utils/battle/attack/process/__tests__/hit.test.ts`, `lib/utils/battle/attack-phase/__tests__/multi-target-roll.test.ts`

**Interfaces:**
- Consumes: `consumeOn` (Task 2), дані Task 1.
- Produces: `applyCriticalEffect(participant, effect, currentRound, target?, opts?: { offTurn?: boolean })` — `offTurn: true` (відсіч) вимикає додаткову дію S6/S10; `EffectSpec` отримує `consumeOn?`, `expireAtTurnEnd?`, `legacyValue?`.

Усі ефекти з `duration: 2` (перевага/невигідність на наступну атаку, мітки 9, Prone, «Зброя вислизає») отримують `expireAtTurnEnd: true` — так вони живуть рівно «до кінця наступного ходу» власника.

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
| `weakened_next_hit` | legacy `weakened_next_hit` (value 0.5), `consumeOn: "ownHit"`; ×0.5 лише для фізичної шкоди (списки додаткової шкоди не ріжемо — задокументувати в описі ефекту) |
| `lose_reaction` | без ефекту: `actionFlags.hasUsedReaction = true` |
| `lose_action` | legacy `skip_action` з `value: 100`, `duration: 1` |
| `lose_bonus_action` | як зараз (`hasUsedBonusAction = true`) |
| `stun` | прибрати гілку |

- [ ] **Step 1: Failing tests** у `critical.test.ts` (наявні хелпери `apply`, `crit`, `collectModifiers`). **Видалити** старі блоки, що фіксують мертву поведінку: `it.each` на L48–62 (legacy-маркери stun / free_attack / advantage_on_* / combo / prone / lose_reaction) і тест `lose_action` → `hasUsedAction` на L64–72; замінити новими:

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

  Інтеграційні тести:
  - `battle-turn` (`lib/utils/battle/__tests__/battle-turn*.test.ts` або новий): учасник після `lose_action` → `processStartOfTurn(p, 2, [p], () => 0.5)` дає `actionFlags.hasUsedAction === true`; після `lose_reaction` → наступний `processStartOfTurn` повертає `hasUsedReaction === false`; після `block_bonus_action` на цілі → її `processStartOfTurn` дає `hasUsedBonusAction === true`.
  - **S7/F4 на сервері:** уже покрито `app/api/__tests__/battles/bonus-action-mutation.test.ts:39-47` (`action_used`) — нового тесту не треба.
  - **Безкоштовна атака на мультицільовій атаці:** крит з ефектом 6 на першій з двох цілей (`multi-target-roll.test.ts`, `rng` підібрати так, щоб `getRandomCriticalEffect` дав id 6: `floor(r*10)+1 = 6` → `r = 0.55`) → після фази в атакера `actionFlags.hasUsedAction === false`.
  - **Крит на відсічі:** ефект 6 при `offTurn: true` → `pendingExtraActions` не змінюється.
  - **«Зброя вислизає»:** у `hit.test.ts` атакер з ефектом `effects: [{ type: "weakened_next_hit", value: 0.5 }], consumeOn: "ownHit"`, `damageRolls: [8]` → шкода вдвічі менша, ніж без ефекту (порівняти з контрольним викликом), у `damageSteps` є крок `kind: "multiplier", value: 0.5` з назвою ефекту.
- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/attack` — FAIL.
- [ ] **Step 3: Implement** мапінг у `critical.ts` (поля `consumeOn`, `expireAtTurnEnd`, `legacyValue` → `effects: [{ type: spec.legacy, value: spec.legacyValue ?? 1 }]`, гілки для `free_attack`/`combo_attack`/`lose_reaction` змінюють `battleData`/`actionFlags`; `opts.offTurn` пропускає `pendingExtraActions`). У `retaliation.ts` крит-ефект відсічі застосовується з `offTurn: true` (шлях `resolveHit` → `compute.ts:89-105` — прокинути прапорець через параметри `computeHitDamage`). У `run-attack-phase.ts` після циклу по цілях: якщо будь-який `attackResult.criticalEffectApplied?.effect.type` ∈ `free_attack | combo_attack` — `hasUsedAction = false` в атакера (бо `applyMainActionUsed` викликається на кожну ціль і з'їдає додаткову дію вже на наступній). У `compute.ts` після блоку `additional_damage` (~L133):

```ts
const weakened = attacker.battleData.activeEffects.find((e) => e.effects.some((d) => d.type === "weakened_next_hit"));

if (weakened) {
  physicalDamage = Math.floor(physicalDamage * 0.5);
  damageSteps.push({ label: weakened.name, side: "attacker", kind: "multiplier", value: 0.5, after: physicalDamage });
}
```

  (`attacker` тут — учасник до крит-ефекту цієї атаки, `hit.ts:30`; порядок до множника DM і балансу й `Math.floor` — як у `bonusPercent`, `compute.ts:161`. Ефект знімає Task 2 після влучання.)
- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle` — PASS.
- [ ] **Step 5: Commit** `fix(crits): every critical effect changes the fight`.

---

### Task 4: Провокація і нат.1 на відсічі

**Files:**
- Modify: `lib/utils/battle/attack/retaliation.ts`
- Modify: `lib/utils/battle/attack/process/actions.ts` (`buildRetaliationAction`, ~L295/L322)
- Modify: `lib/utils/battle/attack-phase/run-attack-phase.ts` (виклик відсічі, ~L257–280)
- Test: `lib/utils/battle/attack/__tests__/retaliation.test.ts`, `lib/utils/battle/attack-phase/__tests__/run-attack-phase.test.ts`

**Interfaces:**
- Produces: `RetaliationInput.provoked?: boolean` — пропускає перевірку `isCriticalFail` (L58) і `hasUsedReaction` (L64) та не витрачає реакцію, **але** відсічі немає, якщо в захисника активний маркер `no_reaction` (`activeEffects` з `effects[].type === "no_reaction"`). Решта умов (обидва живі, `weaponFor` знаходить зброю того ж типу, що й атака, `disable_*`) лишаються: «якщо може атакувати» = за тими ж правилами, що звичайна відсіч (дальній промах провокує відсіч лише в захисника з дальньою `counterAttack`).
  `buildRetaliationAction` бере `criticalEffect` як `attackRoll.isCriticalFail ? attackRoll.criticalEffect : crit`.

- [ ] **Step 1: Failing tests** (білдери `unit`, `retaliate`, `seq` з `@/lib/utils/abilities/__tests__/fixtures`):
  - нат.1 атакера, `criticalEffect` = невдача 7, `provoked: true` → результат не `null`; `hasUsedReaction` захисника лишається `false`;
  - те саме, захисник з `hasUsedReaction: true` → відсіч є;
  - `provoked: true`, у захисника активний `no_reaction` → `null`;
  - `provoked: true`, захисник без атаки ближнього бою → `null`; атакер мертвий → `null`;
  - нат.1 **на відсічі**: `rng: seq(0, 0.5, 0.15)` (перший d20 = 1, другий d20, d10 ефекту = 2 → Prone) → у захисника ефект Prone, `battleAction.actionDetails.criticalEffect.id === 2`, `type === "fail"`;
  - нат.1 на відсічі з ефектом 7 (`seq(0, 0.5, 0.65)`) → жодної нової відсічі (результат містить лише одну дію);
  - без `provoked` нат.1 атакера → `null` (як зараз);
  - `run-attack-phase.test.ts`: мультицільова атака, нат.1 з ефектом 7 на **другій** цілі → друга ціль відповідає (умова виклику `i === 0 || provoked`).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** `retaliation.ts`: умови з `input.provoked` і маркером `no_reaction`; якщо `provoked` — не ставити `hasUsedReaction = true` (L72). Після кидка відсічі: `if (roll.isCriticalFail && roll.criticalEffect) put(flow, applyCriticalEffect(getP(flow, defenderId), roll.criticalEffect, round, undefined, { offTurn: true }))` — саме `getP(flow, …)`, бо локальний `defender` застарів після `put` на L72; ефект 7 тут нічого не робить (`specFor` його не мапить). `actions.ts`: `criticalEffect` для нат.1. `run-attack-phase.ts`: `const provoked = attackResult.criticalEffectApplied?.effect.type === "provoke_opportunity_attack";`, умова виклику `if (i === 0 || provoked)`, у виклик — `provoked`.
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
  - влучання з критом: `` `${attacker} завдав ${dmg} урону ${target}. Критичне влучання — ${name}! ${flavor}` `` (той самий стиль, що й звичайне влучання; міняється лише перший елемент масиву тексту — `vampirismHeal`, `...messages` і суфікс «сервер кинув» з `run-attack-phase.ts:249` лишаються)
  - критична невдача: `` `${attacker}: критична невдача — ${name}. ${flavor}` ``
  - без криту — як зараз.

- [ ] **Step 1: Failing tests:**
  - `hit.test.ts`: `processAttack` з `d20Roll: 20` і `rng: seq(0.55)` (вибирає ефект 6) → `battleAction.actionDetails.criticalEffect.flavor` — один з `getCriticalEffect(6,"success").flavor` з підставленими іменами; `resultText` містить «Критичне влучання — Безкоштовна атака!» і фразу.
  - те саме для `d20Roll: 1` → `resultText` починається з `${attacker}: критична невдача — `.
  - `battle-log-format.test.ts`: запис з `criticalEffect` без `flavor` → рядок «Ефект [d10: N]: name — description» як зараз; з `flavor` → додатковий рядок з фразою.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** У `processAttack` після кидка: `const flavor = attackRoll.criticalEffect ? critFlavor(attackRoll.criticalEffect, { attacker: attacker.basicInfo.name, target: target.basicInfo.name }, \`${battleId}:${currentRound}:${attacker.basicInfo.id}:${target.basicInfo.id}\`) : undefined;` і передати новим останнім параметром `critFlavorText?: string` у `handleCriticalFail` → `buildBattleActionForCriticalFail` і в `buildBattleActionForHit`. У відсічі — те саме з `seed` `${battleId}:${round}:${defenderId}:${attackerId}:r`. `battle-log-format.ts:131–139`: якщо `d.criticalEffect.flavor` — додати рядок з фразою.
- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle` — PASS (тестів на старі рядки «КРИТИЧНЕ ПОПАДАННЯ» / «критично промахнувся» немає — вони лише в `actions.ts:56,223,298`; рядок відсічі на L298 теж перевести на новий формат).
- [ ] **Step 5: Commit** `feat(crits): atmospheric phrase in the battle log`.

---

### Task 6: Оверлей результату

**Files:**
- Create: `lib/utils/battle/view/crit-outcome.ts` (+ експорт з `lib/utils/battle/view/index.ts`)
- Modify: `lib/hooks/battle/useBattleScene.ts` (`ResultFx`, L32–35)
- Modify: `lib/hooks/battle/useAttackWizard.ts` (~L100–145)
- Modify: `components/battle/fx/ResultOverlay.tsx`
- Test: `lib/utils/battle/view/__tests__/crit-outcome.test.ts`, `components/battle/fx/__tests__/result-overlay.test.tsx`, `lib/hooks/battle/__tests__/useAttackWizard.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // crit-outcome.ts — за зразком retaliationOutcome (view/retaliation.ts:8)
  export function critOutcome(
    log: BattleAction[], seen: Set<number>, attackerId: string, targetId: string,
  ): { name: string; flavor?: string; type: "success" | "fail" } | undefined;
  // запис атаки: actorId === attackerId && targets[0].participantId === targetId (поля взяти з типу BattleAction)
  // ResultFx
  { kind: "hit" | "crit"; …; critEffect?: { name: string; flavor?: string } }
  { kind: "miss"; …; critFail?: { name: string; flavor?: string } }
  ```

- [ ] **Step 1: Failing tests:**
  - `crit-outcome.test.ts`: новий лог з атакою по цілі 1 без криту, атакою по цілі 2 з критом і відсіччю з іншим ефектом → для `targetId` цілі 1 — `undefined`, для цілі 2 — ефект атаки (не відсічі); записи з `seen` ігноруються.
  - `result-overlay.test.tsx` (`it.each` з наявним `fakeScene`):
    - `{ kind: "crit", …, critEffect: { name: "Безкоштовна атака", flavor: "Вихор сталі: Айвен одразу ж б'є знову." } }` → «Критичне влучання», «Безкоштовна атака», фраза;
    - `{ kind: "miss", …, critFail: { name: "Падіння", flavor: "…" } }` → «Критична невдача», «Падіння», фраза; немає «Промах»;
    - `{ kind: "crit", … }` без `critEffect` → лише «Критичне влучання» (старі записи без `flavor`).
  - `useAttackWizard.test.tsx` (шаблон — кейс відсічі біля L106): після атаки, у лозі якої запис з `criticalEffect.type === "fail"`, `showResult` отримує `{ kind: "miss", critFail: { name, flavor } }` — навіть якщо клієнтський прогноз не бачив нат.1.
- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/view components/battle/fx lib/hooks/battle` — FAIL.
- [ ] **Step 3: Implement.** `critOutcome`. У `useAttackWizard` поруч з `retaliationOutcome(...)` (той самий `seen`) викликати `critOutcome(log, seen, attackerId, first.targetId)`: `type === "success"` → `critEffect` у `crit`-результаті; `type === "fail"` → `critFail` у `miss`-результаті (рішення з серверного логу, а не з клієнтського `strike.outcome`). `ResultOverlay`: у гілці `miss` за наявності `result.critFail` — заголовок «Критична невдача», нижче назва ефекту й фраза курсивом; у гілці `crit` — назва ефекту й фраза під шкодою. Кольори — ті самі захардкоджені, що вже в оверлеї (`#a89c88`, `ResultOverlay.tsx:78,95`).
- [ ] **Step 4: Run** ті самі тести — PASS.
- [ ] **Step 5: Commit** `feat(crits): show the effect and phrase on the result overlay`.

Відоме обмеження (не виправляємо): клієнтський прогноз переваги для другої цілі не знає, що S3 витратиться на першій — бачить «перевага», сервер кидає без неї.

---

### Task 7: Фінальна перевірка

- [ ] `pnpm lint`, `pnpm test:run`, `pnpm build` — чисто.
- [ ] Локальний бій (`pnpm dev`, локальна БД): DM-кидком виставити d20 = 20 і d20 = 1 кілька разів; переконатися, що оверлей і лог показують ефект і фразу, а ефекти (перевага, Prone, втрата дії) видно в списку активних ефектів учасника.
- [ ] Оновити `docs/superpowers/specs/2026-10-08-artifact-sets-and-crits-design.md` §B2: S7/F4 — серверна перевірка вже існувала; вибір фрази — детермінований від ідентифікаторів атаки, не `rng`; «до кінця наступного ходу» = `duration 2 + expireAtTurnEnd`; додатковий хід моралі скидає F8/S7; S6/S10/F4 на відсічі без ефекту; ×0.5 лише для фізичної шкоди; провокація — за правилами звичайної відсічі, крім `hasUsedReaction`. Commit `docs(spec): crit plan rulings`.
