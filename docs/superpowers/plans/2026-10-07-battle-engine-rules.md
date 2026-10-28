# Ядро бою, частина C — правила движка і перевірка кубиків: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Виправити підтверджені баги правил бою (черговість, тривалості ефектів, екстра-хід, видалення поточного учасника, відродження, `hpChanges` перемоги), прибрати дубльовані хелпери і не дати клієнту надсилати неможливі кидки.

**Architecture:** Точкові виправлення в існуючих модулях движка (`lib/utils/battle/battle-turn.ts`, `turn/*`, `battle-victory.ts`) і в мутаціях роутів; кожне з тестом, що відтворює баг. Перевірка кубиків — окремий модуль `lib/utils/battle/validation/dice-checks.ts` поверх `lib/utils/common/dice.ts`, викликається в мутаціях атаки й заклинання. Екстра-хід лишається слотом в ініціативі (UI і таймлайн його показують), але слот синхронізує стан з оригіналом, цілі перенаправляються на оригінал, а перевірка перемоги слоти ігнорує.

**Tech Stack:** TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-battle-storage-redesign-design.md` (§9, §10)

## Global Constraints

- Схема БД не змінюється.
- Поза скоупом (переходять у під-проєкт «система умінь», бо шлях `PassiveAbility` мертвий — `passiveAbilities` завжди `[]`): застосування start-of-turn пасивок і on_hit ефектів (`attack/process/run.ts` TODO).
- DoT уже доводить до `unconscious` при 0 HP; смерть лише при HP < 0 — це правило D&D 5e, не змінюється.
- Перевірка кубиків блокує неможливі значення (поза межами кубика, нецілі, від'ємні, надто багато кубиків), але не вимагає точної кількості — кількість кидків залежить від криту й розподілу на кілька цілей, які рахує сервер.
- Помилки перевірок — `BattleRuleError("invalid_dice" | "action_used", …)` → 422.
- Імпорти через `@/…`; мінімальні коментарі.

## Review Focus

1. **Атака по кількох цілях дальньою зброєю з кидками для кожної цілі** — кількість кидків = кубики × цілі; перевірка не має її відхиляти (тест у Task 7).
2. **Критична атака з подвоєними кубиками** — удвічі більше кидків проходить перевірку (тест у Task 7).
3. **Слот екстра-ходу отримує шкоду від реакції під час свого ходу** — після завершення ходу шкода записана оригіналу (тест у Task 4).
4. **Видалення останнього учасника черги, коли хід саме на ньому** — хід переходить на перший живий нового раунду з обробкою початку раунду (тест у Task 5).
5. **Повторна перевірка моралі тим самим учасником у тому самому ході** — 422 `action_used`, перший результат зберігається (тест у Task 7).

---

## File Structure

| Файл | Дія | Відповідальність |
|---|---|---|
| `lib/utils/common/calculations.ts` | Modify | `getAttackAbilityModifier` |
| `lib/utils/battle/attack/{reaction.ts,process/compute.ts}`, `damage/breakdown.ts`, `lib/hooks/battle/useAttackFlow-handlers.ts`, `components/battle/dialogs/AttackRollDialog.tsx`, `app/api/campaigns/[id]/characters/[characterId]/damage-preview/route.ts` | Modify | використати хелпер |
| `app/api/campaigns/[id]/battles/balance/balance-helpers.ts` | Modify | реекспорт `getModifierValue` з `participant/artifact-utils.ts` |
| `lib/utils/battle/turn/run-advance-turn-loop.ts` | Modify | новий раунд починається з індексу 0 пересортованого порядку |
| `lib/utils/battle/battle-turn.ts` | Modify | обмеження ходу рахуються до зменшення тривалостей |
| `lib/utils/battle/turn/extra-turn.ts` | Create | `syncSlotFromOriginal`, `syncOriginalFromSlot`, `resolveTargetId` |
| `types/battle.ts` | Modify | `BattleParticipantBasicInfo.extraTurnOf?: string` |
| `lib/utils/battle/battle-victory.ts` | Modify | ігнор слотів; `hpChanges` до відродження |
| `app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-mutation.ts` | Modify | видалення поточного → `advanceTurn`; відродження при HP > 0 |
| `lib/utils/battle/validation/dice-checks.ts` | Create | `assertRollsWithinFormula`, `assertAttackRolls`, `assertSpellRolls` |
| `app/api/campaigns/[id]/battles/[battleId]/{attack/attack-mutation.ts,spell/spell-mutation.ts,morale-check/morale-check-mutation.ts}` | Modify | перевірки і перенаправлення цілей |

---

### Task 1: Дублікати хелперів

**Files:** див. таблицю (перші три рядки). Test: `lib/utils/common/__tests__/calculations.test.ts` (дописати).

**Interfaces:**
- Produces: `getAttackAbilityModifier(abilities: { strength: number; dexterity: number }, attackType: AttackType | string): number` — `AttackType.MELEE` → модифікатор Сили, інше → Спритності.

- [ ] **Step 1: Тест** (дописати в `calculations.test.ts`):
```ts
describe("getAttackAbilityModifier", () => {
  it("ближня — Сила, дальня — Спритність", () => {
    const abilities = { strength: 16, dexterity: 12 };

    expect(getAttackAbilityModifier(abilities, AttackType.MELEE)).toBe(3);
    expect(getAttackAbilityModifier(abilities, AttackType.RANGED)).toBe(1);
  });
});
```
(імпорт `getAttackAbilityModifier` з `../calculations`, `AttackType` з `@/lib/constants/battle`).
- [ ] **Step 2:** `pnpm test:run lib/utils/common/__tests__/calculations.test.ts` → FAIL (функції немає).
- [ ] **Step 3: Реалізація** у `calculations.ts`:
```ts
export function getAttackAbilityModifier(
  abilities: { strength: number; dexterity: number },
  attackType: AttackType | string,
): number {
  return getAbilityModifier(attackType === AttackType.MELEE ? abilities.strength : abilities.dexterity);
}
```
Замінити інлайн-формули: `reaction.ts:133-136` → `getAttackAbilityModifier(defender.abilities, reactionAttack.type)`; `process/compute.ts:66-70` → `getAttackAbilityModifier(updatedAttacker.abilities, attack.type)`; `damage/breakdown.ts:57-59` → `getAttackAbilityModifier(attacker.abilities, isMelee ? AttackType.MELEE : AttackType.RANGED)`; `useAttackFlow-handlers.ts:87-90` і `:140-143` → `getAttackAbilityModifier(participant.abilities, selectedAttack.type)` (друге — з відповідною атакою в тому місці); `AttackRollDialog.tsx:46-49` → `getAttackAbilityModifier(attacker.abilities, attack.type)`; `damage-preview/route.ts:137-139` → `getAbilityModifier(participant.abilities.strength)` / `getAbilityModifier(participant.abilities.dexterity)`.
`balance-helpers.ts`: видалити власну `getModifierValue` і тип `ArtifactModifier`, реекспортувати `export { getModifierValue, type ArtifactModifier } from "@/lib/utils/battle/participant/artifact-utils";` (перевірити, що сигнатури сумісні; різниця лише для `value: ""`).
- [ ] **Step 4:** `pnpm test:run && npx tsc --noEmit -p . && pnpm lint` → зелене; `grep -rn "\- 10) / 2" lib app components | grep -v __tests__` → лише `calculations.ts`.
- [ ] **Step 5:** коміт `refactor(battle): single attack ability modifier and artifact modifier helpers`.

---

### Task 2: Черговість після початку нового раунду

**Files:** Modify `lib/utils/battle/turn/run-advance-turn-loop.ts`; Test `lib/utils/battle/turn/__tests__/advance-turn.test.ts` (дописати).

- [ ] **Step 1: Тест** — саммон з найвищою ініціативою не пропускає перший хід, коли перший у старому порядку мертвий:
```ts
  it("новий раунд починається з першого в пересортованому порядку (саммон не пропускає хід)", () => {
    const deadFirst = { ...hero, abilities: { ...hero.abilities, initiative: 20, baseInitiative: 20 }, combatStats: { ...hero.combatStats, currentHp: 0, status: "unconscious" as const } };

    const mid = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "mid" }, abilities: { ...base.abilities, initiative: 10, baseInitiative: 10 } });

    const enemy = { ...goblin, abilities: { ...goblin.abilities, initiative: 5, baseInitiative: 5 } };

    const wolf = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "wolf" }, abilities: { ...base.abilities, initiative: 30, baseInitiative: 30, dexterity: 30 } });

    const out = advanceTurn({ participants: [deadFirst, mid, enemy], pending: [wolf], scene: { ...scene, turnIndex: 2 } });

    expect(out.scene.round).toBe(2);
    expect(out.participants[out.scene.turnIndex!].basicInfo.id).toBe("wolf");
  });
```
(Ініціатива перераховується `calculateInitiative`; якщо фікстурі для цього потрібна висока Спритність — `dexterity: 30` дає найвищу. Якщо `calculateInitiative` не дає `wolf` першим, підняти йому `dexterity` до значення, за якого він гарантовано перший, — мета тесту: саммон першим у новому порядку.)
- [ ] **Step 2:** FAIL (`turnIndex` вказує не на `wolf`).
- [ ] **Step 3: Реалізація** — у `runAdvanceTurnLoop` після `updatedInitiativeOrder = roundResult.updatedInitiativeOrder;` додати:
```ts
      // processEndOfTurn обрав індекс за старим порядком; після пересортування раунд починається з початку
      nextTurnIndex = 0;
```
Мертвих на індексі 0 цикл пропускає далі сам (наступна ітерація `processEndOfTurn` від цього індексу).
- [ ] **Step 4:** `pnpm test:run lib/utils/battle` → зелене.
- [ ] **Step 5:** коміт `fix(battle-turn): new round starts from the top of the re-sorted initiative`.

---

### Task 3: Обмеження ходу до зменшення тривалостей

**Files:** Modify `lib/utils/battle/battle-turn.ts` (`processStartOfTurn`); Test `lib/utils/battle/__tests__/battle-turn.test.ts` (створити).

- [ ] **Step 1: Тест**
```ts
import { describe, expect, it } from "vitest";

import { processStartOfTurn } from "@/lib/utils/battle/battle-turn";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";
import type { ActiveEffect } from "@/types/battle";

const debuff = (type: string, duration: number) =>
  ({ id: `e-${type}`, name: type, type: "debuff", duration, appliedAt: { round: 1 }, effects: [{ type }] }) as unknown as ActiveEffect;

describe("processStartOfTurn", () => {
  it("дебаф на 1 раунд діє в цей хід і лише потім спливає", () => {
    const p = createMockParticipant({
      battleData: { ...createMockParticipant().battleData, activeEffects: [debuff("no_bonus_action", 1), debuff("no_reaction", 1)] },
    });

    const out = processStartOfTurn(p, 2, [p]);

    expect(out.participant.actionFlags.hasUsedBonusAction).toBe(true);
    expect(out.participant.actionFlags.hasUsedReaction).toBe(true);
    expect(out.expiredEffects).toEqual(expect.arrayContaining(["no_bonus_action", "no_reaction"]));
  });

  it("без обмежень — дії доступні", () => {
    const p = createMockParticipant();

    const out = processStartOfTurn(p, 2, [p]);

    expect(out.participant.actionFlags).toMatchObject({ hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false });
  });
});
```
(Якщо фактична форма `ActiveEffect`/імена в `expiredEffects` інші — підлаштувати фікстуру під `types/battle.ts` і `decreaseEffectDurations`, зберігши суть перевірки.)
- [ ] **Step 2:** FAIL (перший тест: флаги `false`).
- [ ] **Step 3: Реалізація** — у `processStartOfTurn` обчислити обмеження з ефектів **до** блоку DoT/тривалостей і використати їх у кінці:
```ts
  const restrictedBy = (type: string) =>
    participant.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === type));

  const hasNoBonusAction = restrictedBy("no_bonus_action");

  const hasNoReaction = restrictedBy("no_reaction");
```
і видалити пізніше обчислення тих самих змінних з `updatedParticipant`.
- [ ] **Step 4:** `pnpm test:run lib/utils/battle` → зелене.
- [ ] **Step 5:** коміт `fix(battle-turn): one-round restrictions apply before their duration expires`.

---

### Task 4: Екстра-хід без розсинхрону зі справжнім учасником

**Files:** Create `lib/utils/battle/turn/extra-turn.ts`, `lib/utils/battle/turn/__tests__/extra-turn.test.ts`; Modify `types/battle.ts`, `lib/utils/battle/turn/apply-pending-morale.ts`, `run-advance-turn-loop.ts`, `advance-turn.ts`, `lib/utils/battle/battle-victory.ts`, `lib/utils/battle/store/split-participant.ts`, `attack/attack-mutation.ts`, `spell/spell-mutation.ts`.

**Interfaces:**
```ts
// extra-turn.ts
export function isExtraTurnSlot(p: BattleParticipant): boolean            // basicInfo.isExtraTurnSlot === true
export function syncSlotFromOriginal(order: BattleParticipant[], slotIndex: number): BattleParticipant[]
export function syncOriginalFromSlot(order: BattleParticipant[], slotIndex: number): BattleParticipant[]
export function resolveTargetId(order: BattleParticipant[], id: string): string   // слот → extraTurnOf
```
Синхронізується динамічний стан: `combatStats`, `spellcasting.spellSlots`, `battleData.activeEffects`, `battleData.skillUsageCounts`, `battleData.pendingExtraActions`. `basicInfo` і `actionFlags` слота лишаються власними.

- [ ] **Step 1: Тести** (`extra-turn.test.ts`):
```ts
import { describe, expect, it } from "vitest";

import { checkVictoryConditions } from "@/lib/utils/battle/battle-victory";
import { resolveTargetId, syncOriginalFromSlot, syncSlotFromOriginal } from "@/lib/utils/battle/turn/extra-turn";
import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const base = createMockParticipant();

const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } });

const slot = {
  ...hero,
  basicInfo: { ...hero.basicInfo, id: "hero-extra-1", isExtraTurnSlot: true, extraTurnOf: "hero" },
};

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY } });

describe("extra turn slot", () => {
  it("на початку ходу слот бере поточний стан оригіналу (шкода, отримана раніше)", () => {
    const hurt = { ...hero, combatStats: { ...hero.combatStats, currentHp: 4 } };

    const order = syncSlotFromOriginal([hurt, goblin, slot], 2);

    expect(order[2].combatStats.currentHp).toBe(4);
    expect(order[2].basicInfo.id).toBe("hero-extra-1");
  });

  it("після ходу слота стан повертається оригіналу (шкода від реакції, витрачені слоти)", () => {
    const usedSlot = {
      ...slot,
      combatStats: { ...slot.combatStats, currentHp: 2 },
      spellcasting: { ...slot.spellcasting, spellSlots: { "1": { max: 2, current: 0 } } },
    };

    const order = syncOriginalFromSlot([hero, goblin, usedSlot], 2);

    expect(order[0].combatStats.currentHp).toBe(2);
    expect(order[0].spellcasting.spellSlots["1"].current).toBe(0);
    expect(order[0].basicInfo.id).toBe("hero");
  });

  it("ціль-слот перенаправляється на оригінал", () => {
    expect(resolveTargetId([hero, slot], "hero-extra-1")).toBe("hero");
    expect(resolveTargetId([hero, slot], "gob")).toBe("gob");
  });

  it("перевірка перемоги не рахує слот живим союзником", () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, currentHp: 0, status: "unconscious" as const } };

    expect(checkVictoryConditions([downed, goblin, slot]).result).toBe("defeat");
  });
});
```
Тест у `advance-turn.test.ts`:
```ts
  it("кінець ходу слота екстра-ходу записує його стан в оригінал", () => {
    const original = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } });

    const slotHurt = {
      ...original,
      basicInfo: { ...original.basicInfo, id: "hero-extra-1", isExtraTurnSlot: true, extraTurnOf: "hero" },
      combatStats: { ...original.combatStats, currentHp: 3 },
    };

    const out = advanceTurn({ participants: [original, goblin, slotHurt], pending: [], scene: { ...scene, turnIndex: 2 } });

    expect(out.participants.find((p) => p.basicInfo.id === "hero")?.combatStats.currentHp).toBe(3);
  });
```
- [ ] **Step 2:** FAIL (модуль `extra-turn` відсутній; перемогу не рахує).
- [ ] **Step 3: Реалізація**
  - `types/battle.ts` → у `BattleParticipantBasicInfo` після `isExtraTurnSlot?` додати `extraTurnOf?: string; // id оригіналу для слота екстра-ходу`.
  - `extra-turn.ts`:
```ts
import type { BattleParticipant } from "@/types/battle";

export function isExtraTurnSlot(p: BattleParticipant): boolean {
  return p.basicInfo.isExtraTurnSlot === true;
}

function copyDynamicState(from: BattleParticipant, to: BattleParticipant): BattleParticipant {
  return {
    ...to,
    combatStats: { ...from.combatStats },
    spellcasting: { ...to.spellcasting, spellSlots: from.spellcasting.spellSlots },
    battleData: {
      ...to.battleData,
      activeEffects: from.battleData.activeEffects,
      skillUsageCounts: from.battleData.skillUsageCounts,
      pendingExtraActions: from.battleData.pendingExtraActions,
    },
  };
}

function originalIndex(order: BattleParticipant[], slot: BattleParticipant): number {
  return order.findIndex((p) => p.basicInfo.id === slot.basicInfo.extraTurnOf);
}

export function syncSlotFromOriginal(order: BattleParticipant[], slotIndex: number): BattleParticipant[] {
  const slot = order[slotIndex];

  const idx = slot && isExtraTurnSlot(slot) ? originalIndex(order, slot) : -1;

  if (idx < 0) return order;

  return order.map((p, i) => (i === slotIndex ? copyDynamicState(order[idx], slot) : p));
}

export function syncOriginalFromSlot(order: BattleParticipant[], slotIndex: number): BattleParticipant[] {
  const slot = order[slotIndex];

  const idx = slot && isExtraTurnSlot(slot) ? originalIndex(order, slot) : -1;

  if (idx < 0) return order;

  return order.map((p, i) => (i === idx ? copyDynamicState(slot, p) : p));
}

export function resolveTargetId(order: BattleParticipant[], id: string): string {
  const target = order.find((p) => p.basicInfo.id === id);

  return target && isExtraTurnSlot(target) && target.basicInfo.extraTurnOf ? target.basicInfo.extraTurnOf : id;
}
```
  - `apply-pending-morale.ts` — у літерал слота додати `extraTurnOf: participant.basicInfo.id`.
  - `advance-turn.ts` — на початку `advanceTurn`: `let order = syncOriginalFromSlot(participants, scene.turnIndex);` (замість `let order = participants;`).
  - `run-advance-turn-loop.ts` — перед `const nextParticipant = updatedInitiativeOrder[nextTurnIndex];` додати `updatedInitiativeOrder = syncSlotFromOriginal(updatedInitiativeOrder, nextTurnIndex);`.
  - `processStartOfRound` (`battle-turn.ts`) прибирає слоти на початку раунду — перед фільтром викликати синхронізацію для кожного слота: `const synced = initiativeOrder.reduce((acc, p, i) => (p.basicInfo?.isExtraTurnSlot ? syncOriginalFromSlot(acc, i) : acc), initiativeOrder);` і фільтрувати `synced`.
  - `battle-victory.ts` → у `checkVictoryConditions` на початку: `const real = initiativeOrder.filter((p) => !p.basicInfo.isExtraTurnSlot);` і рахувати союзників/ворогів з `real`.
  - `split-participant.ts` → `extraTurnOf: p.basicInfo.extraTurnOf ?? null` у колонках (поле лишається і в `snapshot.basicInfo`, round-trip не змінюється).
  - `attack-mutation.ts` → перед `runAttackPhase` замінити `data.targetId`/`data.targetIds` на `resolveTargetId(ctx.participants, …)`; `spell-mutation.ts` → `targetIds: data.targetIds.map((id) => resolveTargetId(order, id))`.
- [ ] **Step 4:** `pnpm test:run lib/utils/battle app/api && npx tsc --noEmit -p .` → зелене.
- [ ] **Step 5:** коміт `fix(battle-turn): extra turn slot shares state with its participant`.

---

### Task 5: Видалення поточного учасника, відродження, `hpChanges` перемоги

**Files:** Modify `patch-participant-mutation.ts`, `lib/utils/battle/battle-victory.ts`; Tests `app/api/__tests__/battles/patch-participant-mutation.test.ts`, `lib/utils/battle/__tests__/battle-victory.test.ts` (створити).

**Поведінка:**
- Видалення учасника, чий хід зараз: учасника прибрати, `pendingMoraleCheck` скинути, далі `advanceTurn` з `turnIndex = removedIndex - 1` (для `removedIndex = 0` — `-1`), щоб наступний отримав `processStartOfTurn`, а з кінця черги — новий раунд з `processStartOfRound`. Події переходу додаються після події видалення.
- Видалення не поточного — як зараз.
- HP > 0 для `unconscious` → `active`; `dead` лишається `dead`.
- `completeBattle`: `hpChanges` рахуються з учасників **до** відродження (союзники, що були `unconscious`).

- [ ] **Step 1: Тести**
`patch-participant-mutation.test.ts` — дописати:
```ts
  it("видалення поточного учасника: наступний отримує початок ходу, флаги скинуті", () => {
    const tired = { ...goblin, actionFlags: { ...goblin.actionFlags, hasUsedAction: true } };

    const out = patchParticipantMutation(context({ participants: [hero, tired], scene: { ...context().scene, turnIndex: 0 } }), "hero", { removeFromBattle: true });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["gob"]);
    expect(out.scene?.turnIndex).toBe(0);
    expect(out.participants[0].actionFlags.hasUsedAction).toBe(false);
  });

  it("видалення останнього в черзі, коли хід на ньому, — новий раунд", () => {
    const out = patchParticipantMutation(context({ participants: [hero, goblin, orc], scene: { ...context().scene, turnIndex: 2 } }), "orc", { removeFromBattle: true });

    expect(out.scene).toMatchObject({ round: 2 });
    expect(out.participants[out.scene!.turnIndex!].basicInfo.id).toBe("hero");
  });

  it("HP > 0 повертає непритомного до бою", () => {
    const downed = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "unconscious" as const } };

    const out = patchParticipantMutation(context({ participants: [hero, downed] }), "gob", { currentHp: 5 });

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.status).toBe("active");
  });
```
(Старий тест «видалення останнього, коли хід саме на ньому, — індекс обрізається» замінюється тестом «новий раунд» вище.)
`battle-victory.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { completeBattle } from "@/lib/utils/battle/battle-victory";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

describe("completeBattle", () => {
  it("перемога: hpChanges містять відроджених союзників", () => {
    const base = createMockParticipant();

    const downed = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY }, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" } });

    const { battleAction, updatedParticipants } = completeBattle([downed], "victory", 3);

    expect(updatedParticipants[0].combatStats.status).toBe("active");
    expect(battleAction.hpChanges).toEqual([expect.objectContaining({ participantId: "hero", oldHp: 0, newHp: downed.combatStats.maxHp })]);
  });
});
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реалізація**
  - `patch-participant-mutation.ts` → у `removeParticipant`, якщо `removedIndex === ctx.scene.turnIndex` і після видалення лишились учасники:
```ts
    const advanced = advanceTurn({
      participants,
      pending: ctx.pending,
      scene: { ...ctx.scene, turnIndex: removedIndex - 1, pendingMoraleCheck: null },
    });

    return {
      participants: advanced.participants,
      pending: advanced.pending,
      scene: advanced.scene,
      events: [removalEvent, ...advanced.actions.map(battleActionToEvent)],
    };
```
  (подію видалення винести в константу `removalEvent`; імпорти `advanceTurn` з `@/lib/utils/battle/turn`, `battleActionToEvent` з `@/lib/utils/battle/store`). `processEndOfTurn(-1, …)` повертає індекс 0 — перевірити тестом вище.
  - `updateHp` → статус: `newHp <= 0 ? (dead ? "dead" : "unconscious") : status === "unconscious" ? "active" : status`.
  - `battle-victory.ts` → у `completeBattle` `hpChanges` будувати з `initiativeOrder` (до відродження), фільтр `result === "victory" && side === ALLY && status === "unconscious"`, `newHp = maxHp`.
- [ ] **Step 4:** `pnpm test:run && npx tsc --noEmit -p .` → зелене.
- [ ] **Step 5:** коміт `fix(battle): removing the active participant starts the next turn, HP revives, victory hp changes`.

---

### Task 6: (видалено з плану — DoT уже доводить до `unconscious`, див. Global Constraints)

---

### Task 7: Перевірка кубиків і одна перевірка моралі за хід

**Files:** Create `lib/utils/battle/validation/dice-checks.ts`, `lib/utils/battle/validation/__tests__/dice-checks.test.ts`; Modify `attack-mutation.ts`, `spell-mutation.ts`, `morale-check-mutation.ts`; Tests у `app/api/__tests__/battles/{attack,spell,morale-check}-mutation.test.ts`.

**Interfaces:**
```ts
export function assertRollsWithinFormula(formula: string, rolls: number[], maxCount: number): void   // кидає BattleRuleError("invalid_dice")
export function assertAttackRolls(attack: BattleAttack, body: { damageRolls: number[]; targetCount: number }): void   // maxCount = кубики формули × max(1, targetCount) × 2
export function assertSpellRolls(spell: { diceCount: number | null; diceType: string | null }, rolls: number[], targetCount: number): void
export function assertReactionDamage(defender: BattleParticipant, value: number | undefined): void   // ≤ 2 × max(maxRoll(attack.damageDice)) серед атак захисника
```
Правила: кожен кидок — ціле число від 1 до розміру найбільшого кубика формули; кількість — не більше `maxCount`; формула без кубиків → дозволено лише порожній масив.

- [ ] **Step 1: Тести** (`dice-checks.test.ts`):
```ts
import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { assertAttackRolls, assertReactionDamage, assertRollsWithinFormula, assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const sword = { name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8+3", damageType: "slashing" };

describe("dice checks", () => {
  it("кидок поза кубиком, нецілий, нуль, від'ємний — invalid_dice", () => {
    for (const rolls of [[9], [2.5], [0], [-1]]) {
      expect(() => assertRollsWithinFormula("1d8", rolls, 2)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
    }
  });

  it("кидків більше, ніж дозволено — invalid_dice", () => {
    expect(() => assertRollsWithinFormula("1d8", [1, 2, 3], 2)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });

  it("атака: крит (подвоєні кубики) і кілька цілей проходять", () => {
    expect(() => assertAttackRolls(sword, { damageRolls: [8, 7], targetCount: 1 })).not.toThrow();
    expect(() => assertAttackRolls({ ...sword, damageDice: "2d6" }, { damageRolls: [1, 2, 3, 4, 5, 6], targetCount: 3 })).not.toThrow();
  });

  it("заклинання: d10 — до 10", () => {
    expect(() => assertSpellRolls({ diceCount: 2, diceType: "d10" }, [10, 1], 1)).not.toThrow();
    expect(() => assertSpellRolls({ diceCount: 2, diceType: "d10" }, [11], 1)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });

  it("реакція: не більше подвоєного максимуму атаки захисника", () => {
    const defender = createMockParticipant({ battleData: { ...createMockParticipant().battleData, attacks: [sword] } });

    expect(() => assertReactionDamage(defender, 22)).not.toThrow();
    expect(() => assertReactionDamage(defender, 23)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
    expect(() => assertReactionDamage(defender, undefined)).not.toThrow();
  });
});
```
У мутаційних тестах: атака з `damageRolls: [99]` → `invalid_dice`; заклинання з `damageRolls: [99]` → `invalid_dice`; мораль: другий виклик з `scene.pendingMoraleCheck` для того самого учасника → `action_used`:
```ts
  it("повторна перевірка моралі тим самим учасником у цьому ході — action_used", () => {
    const pending = { participantId: "hero", d10Roll: 5, moraleResult: { shouldSkipTurn: false, hasExtraTurn: false, message: "", moralePositive: true } };

    expect(() => moraleCheckMutation(context({ scene: { ...context().scene, pendingMoraleCheck: pending } }), { participantId: "hero", d10Roll: 10 })).toThrow(
      expect.objectContaining({ code: "action_used" }),
    );
  });
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Реалізація** `dice-checks.ts`:
```ts
import { maxRoll, parseDice } from "@/lib/utils/common/dice";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

function invalid(message: string): never {
  throw new BattleRuleError("invalid_dice", message);
}

export function assertRollsWithinFormula(formula: string, rolls: number[], maxCount: number): void {
  const parsed = parseDice(formula);

  const largest = parsed ? Math.max(0, ...parsed.groups.map((g) => g.size)) : 0;

  if (rolls.length > maxCount) invalid(`Забагато кидків: ${rolls.length} (максимум ${maxCount})`);

  for (const roll of rolls) {
    if (!Number.isInteger(roll) || roll < 1 || roll > largest) invalid(`Кидок ${roll} неможливий для ${formula}`);
  }
}

function diceCount(formula: string): number {
  return parseDice(formula)?.groups.reduce((sum, g) => sum + g.count, 0) ?? 0;
}

export function assertAttackRolls(attack: Pick<BattleAttack, "damageDice">, body: { damageRolls: number[]; targetCount: number }): void {
  const formula = attack.damageDice ?? "";

  assertRollsWithinFormula(formula, body.damageRolls, diceCount(formula) * Math.max(1, body.targetCount) * 2);
}

export function assertSpellRolls(spell: { diceCount: number | null; diceType: string | null }, rolls: number[], targetCount: number): void {
  if (!spell.diceCount || !spell.diceType) {
    if (rolls.length > 0) invalid("Заклинання не має кубиків шкоди");

    return;
  }

  assertRollsWithinFormula(`${spell.diceCount}${spell.diceType}`, rolls, spell.diceCount * Math.max(1, targetCount) * 2);
}

export function assertReactionDamage(defender: BattleParticipant, value: number | undefined): void {
  if (value === undefined) return;

  const best = Math.max(0, ...defender.battleData.attacks.map((a) => maxRoll(a.damageDice ?? "")));

  if (!Number.isInteger(value) || value < 0 || value > best * 2) invalid(`Шкода реакції ${value} неможлива`);
}
```
(Для формул на кшталт `"d10"` у `diceType` — `parseDice("2d10")` працює; якщо `diceType` зберігається як `"10"`, нормалізувати префіксом `d`.)
Підключення:
  - `attack-mutation.ts` → після резолву атаки (так само, як `runAttackPhase`: `attackId` за id/назвою, інакше перша) і до `runAttackPhase`: `assertAttackRolls(attack, { damageRolls: data.damageRolls, targetCount })`; для кожної цілі — `assertReactionDamage(target, data.reactionDamage)` лише для однієї цілі (`reactionDamage` — від цілі першої атаки).
  - `spell-mutation.ts` → після завантаження спела і до `processSpell`: `assertSpellRolls(spellRow, data.damageRolls, data.targetIds.length)`.
  - `morale-check-mutation.ts` → якщо `ctx.scene.pendingMoraleCheck?.participantId === data.participantId` → `BattleRuleError("action_used", "Мораль цього учасника вже перевірено в цьому ході")`.
- [ ] **Step 4:** `pnpm test:run && npx tsc --noEmit -p . && pnpm lint` → зелене.
- [ ] **Step 5:** коміт `feat(battle): reject impossible dice rolls and repeated morale checks`.

---

## Self-review (виконано)

- **Покриття спеки §10:** 1 (індекс після пересортування) — Task 2; 2 (екстра-хід) — Task 4 (варіант зі слотом, синхронізацією і перенаправленням цілей замість окремої колонки-посилання без стану: UI таймлайну/черги лишається без змін); 3 (видалення поточного) — Task 5; 4 (тривалості, DoT, пасивки, on_hit) — Task 3, DoT не баг, пасивки/on_hit — у під-проєкт «система умінь»; 5 (відродження) — Task 5; 6 (`hpChanges`) — Task 5; 7 (дублікати) — Task 1. **§9** — Task 7 (з послабленою перевіркою кількості, бо сервер ділить кидки між цілями).
- **Плейсхолдерів немає;** у місцях, що залежать від точної форми фікстур (`ActiveEffect`, `calculateInitiative`, `diceType`), — явна вказівка, що зберегти і як підлаштувати.
- **Імена узгоджені:** `getAttackAbilityModifier`, `syncSlotFromOriginal`, `syncOriginalFromSlot`, `resolveTargetId`, `assertAttackRolls`, `assertSpellRolls`, `assertReactionDamage`, `assertRollsWithinFormula`.
