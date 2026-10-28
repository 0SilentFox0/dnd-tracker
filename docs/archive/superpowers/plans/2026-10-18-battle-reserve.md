# Резерв бою — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ позначає учасників бою як резерв ще в налаштуванні (або під час бою), вводить їх одним кліком — вони ходять одразу після поточного ходу; «Додати учасника» вписує новачка в шкалу ініціативи; перемога з невідкритим резервом чекає рішення ДМ.

**Architecture:** Резерв — це елементи наявного списку `pending` (рядки `battle_participants` з `isPending = true`, у відповіді `pendingSummons`) з прапорцем `battleData.reserved = true`. Збереження, відкат, дельта й клієнтський кеш уже вміють `pending`, тож міграції немає. Рушій ходів ігнорує резерв у черзі, перевірка перемоги враховує його як «очікування рішення ДМ», новий маршрут `reveal-participant` переносить учасника з резерву в чергу.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Zod, TanStack Query, Vitest (+ happy-dom для компонентів), lucide-react.

**Spec:** `docs/archive/superpowers/specs/2026-10-18-battle-reserve-design.md`

## Global Constraints

- Тексти UI, помилок і журналу — українською; ідентифікатори — англійською.
- Коментарі мінімальні: лише неочевидне «чому», один рядок.
- Компоненти не імпортують `@/lib/api/*`; запити — `lib/api/battles.ts`, мутації — хуки в `lib/hooks/battles/useBattles.ts` через `useBattleAction`.
- Діалоги — лише `ResponsiveDialog` (`components/ui/responsive-dialog`); кнопки — у `footer`.
- `padding-line-between-statements`: порожній рядок навколо `const`/`let`/`if`/`return`/блоків; порядок імпортів — `pnpm lint --fix`.
- `react-hooks/exhaustive-deps` — error.
- Кожна бойова мутація — Zod-схема + `runBattleMutation` + сусідній `<action>-mutation.ts`.
- Без міграцій Prisma.
- Перевірка в кінці кожної задачі: `pnpm test:run <файли задачі>`; в останній — `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test:run`.

## Review Focus

1. Резерв не потрапляє в чергу на новому раунді (саммони з `pending` — так, резерв — ні) і не зникає з `pending` після `advanceTurn` — тест у Task 2.
2. Добили всіх видимих ворогів, а в резерві є вороги: бій не завершується, цикл ходів зупиняється, бойові дії відхиляються 422, а reveal/complete/rollback/reset/add/patch проходять — тести в Task 2 і Task 3.
3. Кілька reveal до кінця поточного ходу ходять у порядку відкриття, і поточний учасник не змінюється — тест у Task 5.
4. Додавання учасника з ініціативою вищою за поточного: поточний учасник лишається тим самим (`turnIndex` зсувається) — тест у Task 6.
5. Зменшення кількості юніта в налаштуванні нижче за `reserved` обмежує `reserved` — тест у Task 7.

---

## File Structure

- Create `lib/utils/battle/participant/reserve.ts` — `isReserved`, `reserveOf`, `summonsOf`, `toReserve`, `dropBattleFlag`.
- Modify `types/battle.ts` — `battleData.reserved`, `battleData.revealPending`, `BattlePreparationParticipant.reserved`, `AddParticipantData.reserved`.
- Modify `lib/utils/battle/turn/victory.ts` — `awaiting`.
- Modify `lib/utils/battle/turn/{start-end,run-advance-turn-loop,turn-helpers,advance-turn,initiative}.ts`.
- Modify `lib/utils/battle/pipeline/run-battle-mutation.ts`, `lib/utils/battle/store/errors.ts`, `lib/constants/api-errors.ts`, маршрути `complete|rollback|reset|add-participant|participants/[participantId]`.
- Create `app/api/campaigns/[id]/battles/[battleId]/start/start-reserve.ts`; modify `start-battle-handler.ts`, `start-mutation.ts`, `lib/schemas/battles.ts`.
- Create `app/api/campaigns/[id]/battles/[battleId]/reveal-participant/{route,reveal-participant-mutation}.ts`; modify `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/useBattleScene.ts`.
- Modify `app/api/campaigns/[id]/battles/[battleId]/add-participant/add-participant-mutation.ts`.
- Modify `lib/hooks/battles/setup/useBattleParticipants.ts`, `components/battle/setup/{SetupParticipantRow,SidePanelCard,BattleSetupForm}.tsx`.
- Create `components/battle/participants/ReserveParticipantRow.tsx`, `components/battle/dm/dialogs/AwaitingDmDialog.tsx`, `components/battle/scene/AwaitingDmBanner.tsx`; modify `ParticipantList.tsx`, `DmPanel.tsx`, `DesktopBattleLayout.tsx`, `MobileBattleLayout.tsx`, `AddParticipantDialog.tsx`.
- Modify `scripts/sim/battle-sweep.ts`.

---

### Task 1: Типи, хелпери резерву, перевірка перемоги з резервом

**Files:**
- Create: `lib/utils/battle/participant/reserve.ts`
- Modify: `types/battle.ts` (`BattleParticipantBattleData` ~183, `BattlePreparationParticipant` ~233, `AddParticipantData` ~372)
- Modify: `lib/utils/battle/turn/victory.ts`
- Test: `lib/utils/battle/participant/__tests__/reserve.test.ts`, `lib/utils/battle/turn/__tests__/victory.test.ts`

**Interfaces:**
- Produces: `isReserved(p): boolean`, `reserveOf(pending): BattleParticipant[]`, `summonsOf(pending): BattleParticipant[]`, `toReserve(p): BattleParticipant`, `dropBattleFlag(p, "reserved" | "revealPending"): BattleParticipant`; `checkVictoryConditions(order, reserve?: BattleParticipant[]): VictoryCheckResult` з новим полем `awaiting: "victory" | "defeat" | null`.

- [ ] **Step 1: Типи.** У `types/battle.ts`:

```ts
// BattleParticipantBattleData, після hpMultiplier
  /** Учасник у резерві бою: ще не на полі, бачить лише ДМ */
  reserved?: boolean;
  /** Щойно введений з резерву: ходить після поточного, у порядку введення */
  revealPending?: boolean;
```

```ts
export interface BattlePreparationParticipant {
  id: string;
  type: ParticipantSourceTypeValue;
  side: ParticipantSide;
  quantity?: number;
  /** Скільки з quantity (герой — 0 або 1) у резерві */
  reserved?: number;
}
```

```ts
export type AddParticipantData = {
  sourceId: string;
  type: ParticipantSourceTypeValue;
  side: ParticipantSide;
  quantity?: number;
  reserved?: boolean;
};
```

- [ ] **Step 2: Failing tests** — `lib/utils/battle/participant/__tests__/reserve.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { dropBattleFlag, isReserved, reserveOf, summonsOf, toReserve } from "@/lib/utils/battle/participant/reserve";

const base = createMockParticipant();

const wolf = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "wolf" } });

const imp = toReserve(createMockParticipant({ basicInfo: { ...base.basicInfo, id: "imp" } }));

describe("reserve helpers", () => {
  it("розділяє pending на резерв і саммонів", () => {
    expect(isReserved(imp)).toBe(true);
    expect(reserveOf([wolf, imp]).map((p) => p.basicInfo.id)).toEqual(["imp"]);
    expect(summonsOf([wolf, imp]).map((p) => p.basicInfo.id)).toEqual(["wolf"]);
  });

  it("dropBattleFlag прибирає ключ, а не ставить false", () => {
    const out = dropBattleFlag(imp, "reserved");

    expect("reserved" in out.battleData).toBe(false);
    expect(isReserved(out)).toBe(false);
  });
});
```

Додати в `lib/utils/battle/turn/__tests__/victory.test.ts`:

```ts
describe("перемога з резервом", () => {
  const base = createMockParticipant();

  const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero", side: ParticipantSide.ALLY } });

  const deadGob = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY }, combatStats: { ...base.combatStats, currentHp: 0, status: "dead" } });

  const reserveEnemy = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "imp", side: ParticipantSide.ENEMY }, battleData: { ...base.battleData, reserved: true } });

  const reserveAlly = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "pal", side: ParticipantSide.ALLY }, battleData: { ...base.battleData, reserved: true } });

  it("видимі вороги впали, у резерві ворог — очікування, не перемога", () => {
    expect(checkVictoryConditions([hero, deadGob], [reserveEnemy])).toMatchObject({ result: null, awaiting: "victory" });
  });

  it("резерв лише союзників не заважає перемозі", () => {
    expect(checkVictoryConditions([hero, deadGob], [reserveAlly])).toMatchObject({ result: "victory", awaiting: null });
  });

  it("поразка з союзниками в резерві — очікування", () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, currentHp: 0, status: "unconscious" as const } };

    const gob = { ...deadGob, combatStats: { ...deadGob.combatStats, currentHp: 5, status: "active" as const } };

    expect(checkVictoryConditions([downed, gob], [reserveAlly])).toMatchObject({ result: null, awaiting: "defeat" });
  });

  it("без резерву — як раніше", () => {
    expect(checkVictoryConditions([hero, deadGob])).toMatchObject({ result: "victory", awaiting: null });
  });
});
```

- [ ] **Step 3: Run** `pnpm test:run lib/utils/battle/participant/__tests__/reserve.test.ts lib/utils/battle/turn/__tests__/victory.test.ts` — Expected: FAIL (модуля `reserve` немає, `awaiting` undefined).

- [ ] **Step 4: Implement** `lib/utils/battle/participant/reserve.ts`:

```ts
import type { BattleParticipant } from "@/types/battle";

export const isReserved = (p: BattleParticipant): boolean => p.battleData.reserved === true;

export const reserveOf = (pending: BattleParticipant[]): BattleParticipant[] => pending.filter(isReserved);

export const summonsOf = (pending: BattleParticipant[]): BattleParticipant[] => pending.filter((p) => !isReserved(p));

export const toReserve = (p: BattleParticipant): BattleParticipant => ({ ...p, battleData: { ...p.battleData, reserved: true } });

export function dropBattleFlag(p: BattleParticipant, key: "reserved" | "revealPending"): BattleParticipant {
  const battleData = { ...p.battleData };

  delete battleData[key];

  return { ...p, battleData };
}
```

У `victory.ts`: додати `awaiting: "victory" | "defeat" | null;` в `VictoryCheckResult`; сигнатура `checkVictoryConditions(initiativeOrder: BattleParticipant[], reserve: BattleParticipant[] = [])`; `const reserveHas = (side: ParticipantSide) => reserve.some((p) => p.basicInfo.side === side);`. Гілка перемоги:

```ts
  if (allEnemiesDefeated && enemies.length > 0) {
    if (reserveHas(ParticipantSide.ENEMY)) {
      return { isVictory: false, isDefeat: false, result: null, awaiting: "victory", message: "У резерві ще є вороги — рішення за ДМ" };
    }

    return { isVictory: true, isDefeat: false, result: "victory", awaiting: null, message: "🎉 Перемога! Всі вороги переможені!" };
  }
```

Дзеркально для поразки (`ParticipantSide.ALLY`, `awaiting: "defeat"`, «У резерві ще є союзники — рішення за ДМ»); фінальний return — `awaiting: null`.

- [ ] **Step 5: Run** ті самі тести — PASS. Також `pnpm exec tsc --noEmit` (інші місця, що створюють `VictoryCheckResult` літералом, мають отримати `awaiting: null`).

- [ ] **Step 6: Commit**

```bash
git add types/battle.ts lib/utils/battle/participant/reserve.ts lib/utils/battle/participant/__tests__/reserve.test.ts lib/utils/battle/turn/victory.ts lib/utils/battle/turn/__tests__/victory.test.ts
git commit -m "feat(battle): reserve helpers and victory awaiting a DM decision"
```

---

### Task 2: Рушій ходів — резерв поза чергою, зупинка при очікуванні

**Files:**
- Modify: `lib/utils/battle/turn/start-end.ts` (`processStartOfRound` ~216)
- Modify: `lib/utils/battle/turn/run-advance-turn-loop.ts` (перевірки перемоги ~248, ~255)
- Modify: `lib/utils/battle/turn/turn-helpers.ts` (`ApplyVictoryParams`, ~44)
- Modify: `lib/utils/battle/turn/advance-turn.ts`
- Test: `lib/utils/battle/turn/__tests__/advance-turn.test.ts`, `lib/utils/battle/turn/__tests__/start-end.test.ts`

**Interfaces:**
- Consumes: `reserveOf`, `summonsOf`, `dropBattleFlag` (Task 1), `checkVictoryConditions(order, reserve)`.
- Produces: `ApplyVictoryParams.reserve?: BattleParticipant[]`; `advanceTurn` повертає `pending`, що зберігає резерв; учасник, чий хід почався, без `revealPending`.

- [ ] **Step 1: Failing tests** — додати в `advance-turn.test.ts` (використовує наявні `scene`, `base`, `hero`, `goblin`):

```ts
describe("резерв", () => {
  const imp = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "imp", side: ParticipantSide.ENEMY, controlledBy: "dm" }, battleData: { ...base.battleData, reserved: true } });

  it("резерв не входить у чергу на новому раунді й лишається в pending", () => {
    const out = advanceTurn({ participants: [hero, goblin], pending: [imp], scene: { ...scene, turnIndex: 1 } });

    expect(out.scene.round).toBe(2);
    expect(out.participants.map((p) => p.basicInfo.id)).not.toContain("imp");
    expect(out.pending.map((p) => p.basicInfo.id)).toEqual(["imp"]);
  });

  it("видимі вороги мертві, ворог у резерві — бій не завершується", () => {
    const dead = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    const out = advanceTurn({ participants: [hero, dead], pending: [imp], scene });

    expect(out.scene.status).toBe("active");
    expect(out.scene.completedAt).toBeUndefined();
    expect(out.pending).toHaveLength(1);
  });

  it("знімає revealPending з учасника, чий хід почався", () => {
    const revealed = { ...imp, battleData: { ...base.battleData, revealPending: true } };

    const out = advanceTurn({ participants: [hero, revealed, goblin], pending: [], scene });

    expect(out.scene.turnIndex).toBe(1);
    expect(out.participants[1].battleData.revealPending).toBeUndefined();
  });
});
```

Додати в `start-end.test.ts` (імпорти `createMockParticipant`, `processStartOfRound` — за наявним у файлі стилем):

```ts
it("processStartOfRound додає саммонів, але не резерв", () => {
  const b = createMockParticipant();

  const hero = createMockParticipant({ basicInfo: { ...b.basicInfo, id: "hero" } });

  const wolf = createMockParticipant({ basicInfo: { ...b.basicInfo, id: "wolf" } });

  const imp = createMockParticipant({ basicInfo: { ...b.basicInfo, id: "imp" }, battleData: { ...b.battleData, reserved: true } });

  const ids = processStartOfRound([hero], 2, [wolf, imp]).updatedInitiativeOrder.map((p) => p.basicInfo.id);

  expect(ids).toContain("wolf");
  expect(ids).not.toContain("imp");
});
```

- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/turn/__tests__/advance-turn.test.ts lib/utils/battle/turn/__tests__/start-end.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement.**

`start-end.ts`, у `processStartOfRound`:

```ts
  const summons = summonsOf(pendingSummons);

  const updatedOrder = [...baseOrder, ...summons];

  const newSummonIds = new Set(summons.map((p) => p.basicInfo.id));
```

(імпорт `summonsOf` з `@/lib/utils/battle/participant/reserve`).

`run-advance-turn-loop.ts`: після деструктуризації params:

```ts
  const reserve = reserveOf(pendingSummons);

  // очікування рішення ДМ щодо резерву зупиняє бій так само, як перемога
  const battleOver = (order: BattleParticipant[]) => {
    const v = checkVictoryConditions(order, reserve);

    return v.result !== null || v.awaiting !== null;
  };
```

і замінити `if (checkVictoryConditions(updatedInitiativeOrder).result) break;` на `if (battleOver(updatedInitiativeOrder)) break;`, а пару `const victoryCheck = …; if (victoryCheck.result) break;` — на `if (battleOver(updatedInitiativeOrder)) break;`.

`turn-helpers.ts`: у `ApplyVictoryParams` додати `reserve?: BattleParticipant[];`, деструктуризувати `reserve = []`, `checkVictoryConditions(order, reserve)`.

`advance-turn.ts`:

```ts
  const reserve = reserveOf(pending);
```

(перед `runAdvanceTurnLoop`); в `applyVictoryCompletion({ …, reserve })`; після нього:

```ts
  const participantsAfter = victory.updatedInitiativeOrder.map((p, i) => (i === loop.nextTurnIndex && p.battleData.revealPending ? dropBattleFlag(p, "revealPending") : p));
```

і в return: `participants: participantsAfter`, `pending: loop.clearedPendingSummons ? reserve : pending`.

- [ ] **Step 4: Run** ті самі тести + `pnpm test:run lib/utils/battle/turn` — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/battle/turn
git commit -m "feat(battle): turn engine keeps the reserve off the field and stops while the DM decides"
```

---

### Task 3: Пайплайн — перемога з резервом і блокування дій

**Files:**
- Modify: `lib/utils/battle/store/errors.ts` (`BattleRuleCode`)
- Modify: `lib/constants/api-errors.ts`
- Modify: `lib/utils/battle/pipeline/run-battle-mutation.ts`
- Modify: `app/api/campaigns/[id]/battles/[battleId]/{complete,rollback,reset,add-participant}/route.ts`, `.../participants/[participantId]/route.ts`
- Test: `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`

**Interfaces:**
- Consumes: `checkVictoryConditions(order, reserve)`, `reserveOf`.
- Produces: `RunBattleMutationOptions.allowWhileAwaitingDm?: boolean`; `BattleRuleCode` `"awaiting_dm"`; `API_ERRORS.BATTLE_AWAITING_DM`.

- [ ] **Step 1: Failing tests** — у `run-battle-mutation.test.ts` (наявні `loaded`, `deps`, `params`, `req`, `noop`, `hero`, `goblin`):

```ts
describe("резерв і рішення ДМ", () => {
  const deadGob = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

  const imp = createMockParticipant({ basicInfo: { ...goblin.basicInfo, id: "imp" }, battleData: { ...goblin.battleData, reserved: true } });

  const awaiting = () => loaded({ participants: [hero, deadGob], pending: [imp], isDM: true });

  it("у стані очікування бойова дія відхиляється 422", async () => {
    const d = deps({ getUserId: vi.fn(async () => "dm"), loadBattle: vi.fn(async () => awaiting()) });

    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("awaiting_dm");
  });

  it("allowWhileAwaitingDm пропускає і не завершує бій", async () => {
    const d = deps({ getUserId: vi.fn(async () => "dm"), loadBattle: vi.fn(async () => awaiting()) });

    const res = await runBattleMutation(req(), { params, access: "dm", allowWhileAwaitingDm: true, mutate: noop }, d);

    expect(res.status).toBe(200);
    expect(vi.mocked(d.saveBattle).mock.calls[0][1].scene?.status).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run** `pnpm test:run lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts` — FAIL.

- [ ] **Step 3: Implement.**
  - `errors.ts`: додати `| "awaiting_dm"` у `BattleRuleCode`.
  - `api-errors.ts`: `BATTLE_AWAITING_DM: "Бій чекає рішення ДМ щодо резерву",`.
  - `run-battle-mutation.ts`: у `RunBattleMutationOptions` — `allowWhileAwaitingDm?: boolean;`. Після перевірки `allowed` статусу:

```ts
    if (
      loaded.scene.status === BattleStatus.ACTIVE &&
      !options.allowWhileAwaitingDm &&
      checkVictoryConditions(loaded.participants, reserveOf(loaded.pending)).awaiting
    ) {
      throw new BattleRuleError("awaiting_dm", API_ERRORS.BATTLE_AWAITING_DM);
    }
```

    У `withVictory`: `const victory = checkVictoryConditions(result.participants, reserveOf(result.pending));`.
  - У `runBattleMutation({...})` п'яти маршрутів (`complete`, `rollback`, `reset`, `add-participant`, `participants/[participantId]`) додати `allowWhileAwaitingDm: true,`.

- [ ] **Step 4: Run** `pnpm test:run lib/utils/battle/pipeline app/api/__tests__/battles` — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/battle/store/errors.ts lib/constants/api-errors.ts lib/utils/battle/pipeline app/api/campaigns
git commit -m "feat(battle): pipeline waits for the DM when the losing side still has a reserve"
```

---

### Task 4: Старт бою — резервні слоти з ростеру

**Files:**
- Create: `app/api/campaigns/[id]/battles/[battleId]/start/start-reserve.ts`
- Modify: `app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler.ts`
- Modify: `app/api/campaigns/[id]/battles/[battleId]/start/start-mutation.ts`
- Modify: `lib/schemas/battles.ts`
- Test: `app/api/__tests__/battles/start-reserve.test.ts`, `app/api/__tests__/battles/start-mutation.test.ts`

**Interfaces:**
- Consumes: `toReserve` (Task 1).
- Produces: `isReservedSlot(entry: { quantity?: number; reserved?: number }, instanceIndex: number): boolean`; `partitionReserve(slots: { reserved: boolean }[], built: BattleParticipant[]): { field: BattleParticipant[]; reserve: BattleParticipant[] }`; `buildStartOrder` повертає `{ order, reserve, triggerLogEntries }`.

- [ ] **Step 1: Failing tests** — `app/api/__tests__/battles/start-reserve.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { participant } from "./fixtures";

import { isReservedSlot, partitionReserve } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-reserve";

describe("start reserve", () => {
  it("резерв — останні reserved екземплярів запису", () => {
    const entry = { quantity: 5, reserved: 2 };

    expect([0, 1, 2, 3, 4].map((i) => isReservedSlot(entry, i))).toEqual([false, false, false, true, true]);
  });

  it("герой із reserved 1 — у резерві; reserved більше за quantity обрізається", () => {
    expect(isReservedSlot({ reserved: 1 }, 0)).toBe(true);
    expect(isReservedSlot({}, 0)).toBe(false);
    expect(isReservedSlot({ quantity: 2, reserved: 9 }, 0)).toBe(true);
  });

  it("partitionReserve позначає резерв і зберігає множники балансу", () => {
    const scaled = participant("w2", {}, { battleData: { ...participant("x").battleData, hpMultiplier: 1.4 } });

    const { field, reserve } = partitionReserve([{ reserved: false }, { reserved: true }], [participant("w1"), scaled]);

    expect(field.map((p) => p.basicInfo.id)).toEqual(["w1"]);
    expect(reserve[0].battleData).toMatchObject({ reserved: true, hpMultiplier: 1.4 });
  });
});
```

У `start-mutation.test.ts` змінити `build` на `vi.fn(async () => ({ order: [hero], reserve: [], triggerLogEntries: [] }))` у наявних тестах і додати:

```ts
  it("резерв зі старту йде в pending", async () => {
    const imp = createMockParticipant({ battleData: { ...createMockParticipant().battleData, reserved: true } });

    const build = vi.fn(async () => ({ order: [createMockParticipant()], reserve: [imp], triggerLogEntries: [] }));

    const out = await createStartMutation(build)(ctx);

    expect(out.pending).toEqual([imp]);
  });
```

- [ ] **Step 2: Run** `pnpm test:run app/api/__tests__/battles/start-reserve.test.ts app/api/__tests__/battles/start-mutation.test.ts` — FAIL.

- [ ] **Step 3: Implement** `start-reserve.ts`:

```ts
import { toReserve } from "@/lib/utils/battle/participant/reserve";
import type { BattleParticipant } from "@/types/battle";

export function isReservedSlot(entry: { quantity?: number; reserved?: number }, instanceIndex: number): boolean {
  const quantity = entry.quantity ?? 1;

  return instanceIndex >= quantity - Math.min(entry.reserved ?? 0, quantity);
}

export function partitionReserve(slots: { reserved: boolean }[], built: BattleParticipant[]): { field: BattleParticipant[]; reserve: BattleParticipant[] } {
  const field: BattleParticipant[] = [];

  const reserve: BattleParticipant[] = [];

  built.forEach((p, i) => (slots[i]?.reserved ? reserve.push(toReserve(p)) : field.push(p)));

  return { field, reserve };
}
```

`start-battle-handler.ts`:
  - у тип `participantsRaw` додати `reserved?: number`;
  - у обидва варіанти `ParticipantSlot` додати `reserved: boolean`; героям — `reserved: isReservedSlot(participant, 0)`, юнітам — `reserved: isReservedSlot(participant, i)`;
  - після `const built = await scaleEnemiesForFairBattle(...)` (масштабування бачить усі слоти — баланс рахує резерв):

```ts
  const { field, reserve } = partitionReserve(slots, built);

  const initiativeOrder = applyBakedAuras(field, new Set(field.map((p) => p.basicInfo.id)));
```

  - тип повернення `{ order: BattleParticipant[]; reserve: BattleParticipant[]; triggerLogEntries: BattleAction[] }`, повертати `reserve`.

`start-mutation.ts`: `const { order, reserve, triggerLogEntries } = await build(...)`; `pending: reserve`.

`lib/schemas/battles.ts`: у об'єкт учасника — `reserved: z.number().int().min(0).optional(),`.

- [ ] **Step 4: Run** `pnpm test:run app/api/__tests__/battles` — PASS (зокрема `start-fair-scaling.test.ts` і `fair-parity.test.ts` без змін).

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/[id]/battles/[battleId]/start lib/schemas/battles.ts app/api/__tests__/battles/start-reserve.test.ts app/api/__tests__/battles/start-mutation.test.ts
git commit -m "feat(battle): battle start keeps reserved setup slots in the reserve, balanced with the rest"
```

---

### Task 5: Маршрут reveal-participant, клієнтський API і хук

**Files:**
- Create: `app/api/campaigns/[id]/battles/[battleId]/reveal-participant/reveal-participant-mutation.ts`
- Create: `app/api/campaigns/[id]/battles/[battleId]/reveal-participant/route.ts`
- Modify: `lib/constants/api-errors.ts`, `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battles/index.ts` (якщо барель перелічує хуки поіменно), `lib/hooks/battle/useBattleScene.ts` (`BattleSceneActions`, `actions`)
- Test: `app/api/__tests__/battles/reveal-participant-mutation.test.ts`

**Interfaces:**
- Consumes: `reserveOf`, `dropBattleFlag` (Task 1); `allowWhileAwaitingDm` (Task 3); `calculateInitiative`, `applyBakedAuras`, `runAbilities`, `assignUnitControl`.
- Produces: `revealParticipantSchema` (`{ participantIds: string[] }`), `revealParticipantMutation(ctx, body)`; `revealBattleParticipants(campaignId, battleId, data)`; `useRevealBattleParticipants(c, b, o)`; `BattleSceneActions.reveal`.

- [ ] **Step 1: Failing test** — `app/api/__tests__/battles/reveal-participant-mutation.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { revealParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/reveal-participant/reveal-participant-mutation";
import { ParticipantSide } from "@/lib/constants/battle";

const reserved = (id: string) => participant(id, { side: ParticipantSide.ENEMY, controlledBy: "dm" }, { battleData: { ...goblin.battleData, reserved: true } });

describe("reveal-participant mutation", () => {
  it("ставить відкритого одразу після поточного, поточний не змінюється", () => {
    const out = revealParticipantMutation(context({ isDM: true, pending: [reserved("imp")] }), { participantIds: ["imp"] });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "imp", "gob"]);
    expect(out.scene?.turnIndex).toBeUndefined();
    expect(out.pending).toEqual([]);
    expect(out.participants[1].battleData).toMatchObject({ revealPending: true });
    expect(out.participants[1].battleData.reserved).toBeUndefined();
    expect(out.events[0].resultText).toContain("ввів у бій");
  });

  it("кілька відкриттів до кінця ходу — у порядку відкриття", () => {
    const first = revealParticipantMutation(context({ isDM: true, pending: [reserved("a"), reserved("b")] }), { participantIds: ["a"] });

    const second = revealParticipantMutation(context({ isDM: true, participants: first.participants, pending: first.pending }), { participantIds: ["b"] });

    expect(second.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "a", "b", "gob"]);
  });

  it("один запит з кількома ID — у переданому порядку; саммони в pending лишаються", () => {
    const wolf = participant("wolf");

    const out = revealParticipantMutation(context({ isDM: true, pending: [reserved("a"), wolf, reserved("b")] }), { participantIds: ["b", "a"] });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "b", "a", "gob"]);
    expect(out.pending.map((p) => p.basicInfo.id)).toEqual(["wolf"]);
  });

  it("невідомий ID — 404", () => {
    expect(() => revealParticipantMutation(context({ isDM: true, participants: [hero, goblin] }), { participantIds: ["nope"] })).toThrow(expect.objectContaining({ status: 404 }));
  });
});
```

- [ ] **Step 2: Run** `pnpm test:run app/api/__tests__/battles/reveal-participant-mutation.test.ts` — FAIL.

- [ ] **Step 3: Implement** — `api-errors.ts`: `BATTLE_RESERVE_NOT_FOUND: "Учасника резерву не знайдено",`.

`reveal-participant-mutation.ts`:

```ts
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { DM_ACTOR } from "@/lib/constants/battle";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { dropBattleFlag, isReserved } from "@/lib/utils/battle/participant/reserve";
import { assignUnitControl } from "@/lib/utils/battle/participant/unit-control";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";
import { calculateInitiative } from "@/lib/utils/battle/turn/initiative";
import type { BattleParticipant } from "@/types/battle";

export const revealParticipantSchema = z.object({ participantIds: z.array(z.string()).min(1) });

export type RevealParticipantBody = z.infer<typeof revealParticipantSchema>;

function insertAfterCurrent(order: BattleParticipant[], turnIndex: number, p: BattleParticipant): BattleParticipant[] {
  let at = turnIndex + 1;

  while (order[at]?.battleData.revealPending) at++;

  return [...order.slice(0, at), p, ...order.slice(at)];
}

export function revealParticipantMutation(ctx: BattleMutationContext, body: RevealParticipantBody): MutationResult {
  let order = ctx.participants;

  let pending = ctx.pending;

  const revealed: BattleParticipant[] = [];

  for (const id of body.participantIds) {
    const found = pending.find((p) => p.basicInfo.id === id && isReserved(p));

    if (!found) throw new BattleAccessError(404, API_ERRORS.BATTLE_RESERVE_NOT_FOUND);

    pending = pending.filter((p) => p !== found);

    const clean = dropBattleFlag(found, "reserved");

    const entering: BattleParticipant = { ...clean, battleData: { ...clean.battleData, revealPending: true } };

    order = insertAfterCurrent(order, ctx.scene.turnIndex, entering);
    revealed.push(entering);
  }

  const ids = new Set(revealed.map((p) => p.basicInfo.id));

  const joined = runAbilities(applyBakedAuras(order, ids), { type: "battleStart", newcomerIds: [...ids] }, { round: ctx.scene.round, rng: ctx.rng ?? Math.random });

  const participants = joined.participants.map((p) => (ids.has(p.basicInfo.id) ? { ...p, abilities: { ...p.abilities, initiative: calculateInitiative(p, joined.participants) } } : p));

  const names = revealed.map((p) => p.basicInfo.name).join(", ");

  return {
    participants: assignUnitControl(participants, ctx.userId),
    pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: DM_ACTOR.actorId,
        targets: revealed.map((p) => ({ participantId: p.basicInfo.id, participantName: p.basicInfo.name })),
        resultText: `ДМ ввів у бій: ${names}${joined.messages.length > 0 ? `. ${joined.messages.join("; ")}` : ""}`,
        details: { actorName: DM_ACTOR.actorName, actorSide: DM_ACTOR.actorSide, actionDetails: {} },
      },
    ],
  };
}
```

(Якщо `ctx.rng` має інший тип, ніж очікує `runAbilities`, — узгодити так само, як у `processStartOfRound`, що передає `rng`.)

`route.ts`:

```ts
import { revealParticipantMutation, revealParticipantSchema } from "./reveal-participant-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.DM,
    requireStatus: BattleStatus.ACTIVE,
    allowWhileAwaitingDm: true,
    schema: revealParticipantSchema,
    mutate: revealParticipantMutation,
  });
}
```

`lib/api/battles.ts` (поряд з `addBattleParticipant`):

```ts
export async function revealBattleParticipants(campaignId: string, battleId: string, data: WithVersion<{ participantIds: string[] }>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/reveal-participant`, data);
}
```

`useBattles.ts` (поряд з `useAddBattleParticipant`; імпорт `revealBattleParticipants`):

```ts
export const useRevealBattleParticipants = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ participantIds: string[] }>(c, b, (body) => revealBattleParticipants(c, b, body), o);
```

`useBattleScene.ts`: у `BattleSceneActions` — `reveal: ReturnType<typeof useRevealBattleParticipants>;`, в `actions` — `reveal: useRevealBattleParticipants(campaignId, battleId, o),`; імпорт з `@/lib/hooks/battles` (додати в барель, якщо експорти поіменні).

- [ ] **Step 4: Run** `pnpm test:run app/api/__tests__/battles lib/hooks` — PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/[id]/battles/[battleId]/reveal-participant lib/constants/api-errors.ts lib/api/battles.ts lib/hooks app/api/__tests__/battles/reveal-participant-mutation.test.ts
git commit -m "feat(battle): DM reveals reserve participants, who act right after the current turn"
```

---

### Task 6: Додавання учасника — за ініціативою або в резерв

**Files:**
- Modify: `lib/utils/battle/turn/initiative.ts` (виділити компаратор)
- Modify: `app/api/campaigns/[id]/battles/[battleId]/add-participant/add-participant-mutation.ts`
- Test: `app/api/__tests__/battles/add-participant-mutation.test.ts`

**Interfaces:**
- Consumes: `toReserve` (Task 1).
- Produces: `compareInitiative(a, b): number` (від'ємне — `a` раніше); `addParticipantSchema.reserved?: boolean`.

- [ ] **Step 1: Failing tests** — у `add-participant-mutation.test.ts` замінити перший тест («вставляє юнітів після поточного…») і додати:

```ts
  const withInit = (id: string, initiative: number) => {
    const p = participant(id);

    return { ...p, abilities: { ...p.abilities, initiative, baseInitiative: initiative } };
  };

  it("вставляє юнітів за ініціативою після поточного", async () => {
    const d = deps({ fromUnit: vi.fn(async (_u: unknown, _b: string, _s: unknown, n: number) => withInit(`new-u${n}`, 12)) });

    const out = await createAddParticipantMutation(d)(context({ participants: [withInit("hero", 20), withInit("gob", 5)] }), { sourceId: "u1", type: "unit", side: "enemy", quantity: 2 });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "new-u1", "new-u2", "gob"]);
    expect(out.scene?.turnIndex).toBeUndefined();
    expect(out.events[0].resultText).toContain("DM додав на поле");
  });

  it("місце вже минуло — поточний не змінюється, turnIndex зсувається", async () => {
    const d = deps({ fromCharacter: vi.fn(async () => withInit("fast", 30)) });

    const out = await createAddParticipantMutation(d)(context({ participants: [withInit("hero", 20), withInit("gob", 5)], scene: { ...context().scene, turnIndex: 1 } }), { sourceId: "ch1", type: "character", side: "ally", quantity: 1 });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["fast", "hero", "gob"]);
    expect(out.scene?.turnIndex).toBe(2);
  });

  it("reserved — у резерв, черга не змінюється", async () => {
    const out = await createAddParticipantMutation(deps())(context(), { sourceId: "u1", type: "unit", side: "enemy", quantity: 2, reserved: true });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
    expect(out.pending.map((p) => [p.basicInfo.id, p.battleData.reserved])).toEqual([["new-u1", true], ["new-u2", true]]);
    expect(out.events[0].resultText).toContain("у резерв");
  });
```

- [ ] **Step 2: Run** `pnpm test:run app/api/__tests__/battles/add-participant-mutation.test.ts` — FAIL.

- [ ] **Step 3: Implement.**

`initiative.ts`:

```ts
export function compareInitiative(a: BattleParticipant, b: BattleParticipant): number {
  if (b.abilities.initiative !== a.abilities.initiative) return b.abilities.initiative - a.abilities.initiative;

  if (b.abilities.baseInitiative !== a.abilities.baseInitiative) return b.abilities.baseInitiative - a.abilities.baseInitiative;

  return b.abilities.dexterity - a.abilities.dexterity;
}

export function sortByInitiative(participants: BattleParticipant[]): BattleParticipant[] {
  return [...participants].sort(compareInitiative);
}
```

`add-participant-mutation.ts`:
  - схема: `reserved: z.boolean().optional(),`;
  - після побудови `added` (і `matchScaling`):

```ts
    if (data.reserved) {
      return {
        participants: ctx.participants,
        pending: [...ctx.pending, ...added.map(toReserve)],
        events: [dmEvent(ctx, added, "DM додав у резерв")],
      };
    }

    let order = ctx.participants;

    let turnIndex = ctx.scene.turnIndex;

    for (const fresh of added) {
      const initiative = calculateInitiative(fresh, [...order, fresh]);

      const p = { ...fresh, abilities: { ...fresh.abilities, initiative, baseInitiative: initiative } };

      const found = order.findIndex((other) => compareInitiative(p, other) < 0);

      const at = found === -1 ? order.length : found;

      // місце в цьому раунді вже минуло: поточний лишається поточним, новачок ходить з наступного раунду
      if (at <= turnIndex) turnIndex++;

      order = [...order.slice(0, at), p, ...order.slice(at)];
    }

    const addedIds = new Set(added.map((p) => p.basicInfo.id));

    return {
      participants: assignUnitControl(applyBakedAuras(order, addedIds), ctx.userId),
      pending: ctx.pending,
      ...(turnIndex !== ctx.scene.turnIndex && { scene: { turnIndex } }),
      events: [dmEvent(ctx, added, "DM додав на поле")],
    };
```

  - винести наявний літерал події в `function dmEvent(ctx: BattleMutationContext, added: BattleParticipant[], verb: string): NewBattleEvent` (`resultText: \`${verb}: ${names}\``; тип `NewBattleEvent` з `@/lib/utils/battle/store`); прибрати старий блок `insertAt` і мутацію `p.abilities.initiative = …`.
  - Примітка: `baseInitiative` перезаписується тим самим значенням, як і раніше в цьому файлі.

- [ ] **Step 4: Run** `pnpm test:run app/api/__tests__/battles lib/utils/battle/turn` — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/battle/turn/initiative.ts app/api/campaigns/[id]/battles/[battleId]/add-participant app/api/__tests__/battles/add-participant-mutation.test.ts
git commit -m "feat(battle): mid-battle additions take their initiative slot or go to the reserve"
```

---

### Task 7: Налаштування бою — позначка резерву

**Files:**
- Modify: `lib/hooks/battles/setup/useBattleParticipants.ts`
- Modify: `components/battle/setup/SetupParticipantRow.tsx`, `components/battle/setup/SidePanelCard.tsx`, `components/battle/setup/BattleSetupForm.tsx`
- Test: `lib/hooks/battles/setup/__tests__/useBattleParticipants.test.tsx`

**Interfaces:**
- Produces: `handleReserveChange(participantId: string, reserved: number): void` у `useBattleParticipants` (через `useBattleSetup` — як решта handlers); `SetupParticipantRow` props `{ name, avatar, quantity?, side, reserved, actions: { onMoveToOtherSide, onRemove, onReserveChange(n) } }`.

- [ ] **Step 1: Failing test** — `lib/hooks/battles/setup/__tests__/useBattleParticipants.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";

import { useBattleParticipants } from "../useBattleParticipants";

describe("useBattleParticipants reserve", () => {
  it("ставить резерв і обмежує його кількістю", () => {
    const { result } = renderHook(() => useBattleParticipants());

    act(() => result.current.handleAddToSide("wolf", ParticipantSourceType.UNIT, ParticipantSide.ENEMY, 5));
    act(() => result.current.handleReserveChange("wolf", 3));
    expect(result.current.participants[0].reserved).toBe(3);

    act(() => result.current.handleQuantityChange("wolf", 2));
    expect(result.current.participants[0].reserved).toBe(2);

    act(() => result.current.handleReserveChange("wolf", 9));
    expect(result.current.participants[0].reserved).toBe(2);
  });

  it("герой: резерв 0 або 1", () => {
    const { result } = renderHook(() => useBattleParticipants());

    act(() => result.current.handleParticipantToggle("h1", ParticipantSourceType.CHARACTER, true));
    act(() => result.current.handleReserveChange("h1", 1));
    expect(result.current.participants[0].reserved).toBe(1);
  });
});
```

- [ ] **Step 2: Run** `pnpm test:run lib/hooks/battles/setup/__tests__/useBattleParticipants.test.tsx` — FAIL.

- [ ] **Step 3: Implement** у `useBattleParticipants.ts`:

```ts
  const handleReserveChange = useCallback((participantId: string, reserved: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, reserved: Math.max(0, Math.min(reserved, p.quantity ?? 1)) } : p)),
    );
  }, []);
```

`handleQuantityChange`: `{ ...p, quantity, ...(p.reserved !== undefined && { reserved: Math.min(p.reserved, quantity) }) }`. Повернути `handleReserveChange` з хука. Перевірити, що `useBattleSetup` пробрасує його (спред `participantsBag` або явне поле — додати так само, як `handleQuantityChange`).

`SetupParticipantRow.tsx` — нові props і розмітка (imports `Eye`, `EyeOff`, `Minus`, `Plus` з `lucide-react`, `cn` з `@/lib/utils`):

```tsx
interface SetupParticipantRowProps {
  name: string;
  avatar: string | null;
  quantity?: number;
  side: ParticipantSide;
  reserved: number;
  actions: { onMoveToOtherSide: () => void; onRemove: () => void; onReserveChange: (reserved: number) => void };
}
```

- корінь рядка: `cn("flex items-center justify-between gap-2 p-3 border rounded-lg", bgClass, reserved > 0 && "opacity-60")`;
- перед кнопкою «→/←»:

```tsx
        {reserved > 0 && (quantity ?? 1) > 1 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Button type="button" variant="ghost" size="sm" aria-label="Менше в резерві" onClick={() => actions.onReserveChange(reserved - 1)}><Minus className="size-3" /></Button>
            у резерві: {reserved}
            <Button type="button" variant="ghost" size="sm" aria-label="Більше в резерві" onClick={() => actions.onReserveChange(reserved + 1)}><Plus className="size-3" /></Button>
          </span>
        )}
        <Button type="button" variant="ghost" size="sm" aria-pressed={reserved > 0} title={reserved > 0 ? "Прибрати з резерву" : "У резерв: з'явиться, коли ДМ введе в бій"} onClick={() => actions.onReserveChange(reserved > 0 ? 0 : (quantity ?? 1))}>
          {reserved > 0 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
```

`SidePanelCard.tsx`: новий prop `onReserveChange: (participantId: string, reserved: number) => void`; обидва `SetupParticipantRow` отримують `reserved={participant.reserved ?? 0}` і `actions={{ onMoveToOtherSide: () => onSideChange(participant.id, otherSide), onRemove: () => onRemove(participant.id), onReserveChange: (n) => onReserveChange(participant.id, n) }}`.

`BattleSetupForm.tsx`: `onReserveChange={setup.handleReserveChange}`.

- [ ] **Step 4: Run** `pnpm test:run lib/hooks/battles/setup components/battle/setup` — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/battles/setup components/battle/setup
git commit -m "feat(battle-setup): mark heroes and units as reserve when preparing a battle"
```

---

### Task 8: Інтерфейс бою — резерв для ДМ, діалог очікування, плашка для гравців, галочка в діалозі додавання

**Files:**
- Modify: `lib/hooks/battle/useBattleScene.ts` (`BattleSceneData`, `deriveScene`, `useBattleSceneDataValue`)
- Create: `components/battle/participants/ReserveParticipantRow.tsx`
- Modify: `components/battle/participants/ParticipantList.tsx`
- Create: `components/battle/dm/dialogs/AwaitingDmDialog.tsx`; modify `components/battle/dm/DmPanel.tsx`
- Create: `components/battle/scene/AwaitingDmBanner.tsx`; modify `components/battle/scene/DesktopBattleLayout.tsx`, `components/battle/scene/MobileBattleLayout.tsx`
- Modify: `components/battle/dm/dialogs/AddParticipantDialog.tsx`
- Test: `components/battle/participants/__tests__/reserve.test.tsx`, `components/battle/dm/dialogs/__tests__/add-participant-dialog.test.tsx`

**Interfaces:**
- Consumes: `reserveOf` (Task 1), `checkVictoryConditions(order, reserve).awaiting` (Task 1), `actions.reveal` (Task 5), `actions.complete`, `AddParticipantData.reserved` (Task 1/6).
- Produces: `BattleSceneData.reserve: BattleParticipant[]` (порожній для гравців), `BattleSceneData.awaiting: "victory" | "defeat" | null`.

- [ ] **Step 1: Failing tests** — `components/battle/participants/__tests__/reserve.test.tsx` (за зразком `field.test.tsx`: `vi.mock("@/components/hud/fonts", …)`, контексти `BattleSceneContext` + `BattleSceneDataContext`, `TooltipProvider`):

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneContext, BattleSceneDataContext, type BattleSceneValue } from "@/lib/hooks/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleScene } from "@/types/api";

afterEach(cleanup);

const b = createMockParticipant();

const gob = { ...b, basicInfo: { ...b.basicInfo, id: "gob", name: "Гоблін", side: ParticipantSide.ENEMY, controlledBy: "dm" } };

const imp = { ...gob, basicInfo: { ...gob.basicInfo, id: "imp", name: "Біс" }, battleData: { ...gob.battleData, reserved: true } };

function renderList(isDM: boolean) {
  const reveal = { mutate: vi.fn(), isPending: false };

  const battle = { initiativeOrder: [gob], pendingSummons: [imp], currentTurnIndex: 0, currentRound: 1, battleLog: [] } as unknown as BattleScene;

  const value = {
    battle, isDM, viewer: { userId: "u", isDM, canSeeEnemyHp: false }, current: gob, allies: [], enemies: [gob],
    reserve: isDM ? [imp] : [], awaiting: null, effects: new Map(), select: vi.fn(),
    actions: { reveal },
  } as unknown as BattleSceneValue;

  render(
    <BattleSceneContext.Provider value={value}>
      <BattleSceneDataContext.Provider value={value}>
        <TooltipProvider><ParticipantList side={ParticipantSide.ENEMY} /></TooltipProvider>
      </BattleSceneDataContext.Provider>
    </BattleSceneContext.Provider>,
  );

  return reveal;
}

describe("резерв у списку учасників", () => {
  it("ДМ бачить напівпрозору картку і вводить учасника кнопкою з оком", () => {
    const reveal = renderList(true);

    fireEvent.click(screen.getByRole("button", { name: "Ввести в бій: Біс" }));
    expect(reveal.mutate).toHaveBeenCalledWith({ participantIds: ["imp"] });
  });

  it("гравець резерву не бачить", () => {
    renderList(false);
    expect(screen.queryByText("Біс")).toBeNull();
  });
});
```

У `add-participant-dialog.test.tsx` додати тест (за наявним стилем файлу): позначити галочку «У резерв», натиснути «Додати» → `onAdd` викликано з `expect.objectContaining({ reserved: true })`.

- [ ] **Step 2: Run** `pnpm test:run components/battle/participants/__tests__/reserve.test.tsx components/battle/dm/dialogs/__tests__/add-participant-dialog.test.tsx` — FAIL.

- [ ] **Step 3: Implement.**

`useBattleScene.ts`:
  - `BattleSceneData`: `reserve: BattleParticipant[]; awaiting: "victory" | "defeat" | null;`;
  - `deriveScene`:

```ts
  const reserveAll = reserveOf(battle.pendingSummons ?? []);

  return {
    …,
    reserve: isDM ? reserveAll : NO_ORDER,
    awaiting: battle.status === BattleStatus.ACTIVE ? checkVictoryConditions(order, reserveAll).awaiting : null,
  };
```

  - додати `reserve`, `awaiting` у деструктуризацію, об'єкт і масив залежностей `useBattleSceneDataValue`.

`ReserveParticipantRow.tsx`:

```tsx
"use client";

import { memo } from "react";
import { EyeOff } from "lucide-react";

import { Portrait } from "@/components/battle/hud";
import { useBattleScene } from "@/lib/hooks/battle";
import type { BattleParticipant } from "@/types/battle";

export const ReserveParticipantRow = memo(function ReserveParticipantRow({ participant }: { participant: BattleParticipant }) {
  const { actions } = useBattleScene();

  const { name, id } = participant.basicInfo;

  return (
    <div className="flex min-h-[76px] w-full items-center gap-3 border-b border-dashed border-white/[.08] py-2 opacity-50">
      <Portrait participant={participant} size={48} current={false} className="pointer-events-none" />
      <span className="hud-sc min-w-0 flex-1 truncate text-base font-bold text-[var(--ink)]">{name}</span>
      <button
        type="button"
        aria-label={`Ввести в бій: ${name}`}
        title="Ввести в бій — ходить одразу після поточного ходу"
        disabled={actions.reveal.isPending}
        onClick={() => actions.reveal.mutate({ participantIds: [id] })}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-[var(--ink)] hover:bg-white/10 disabled:opacity-50"
      >
        <EyeOff className="size-5" />
      </button>
    </div>
  );
});
```

`ParticipantList.tsx`: взяти `reserve` з `useBattleSceneData()`, `const reserved = reserve.filter((p) => p.basicInfo.side === side);` і після `rows.map(…)` — `{reserved.map((p) => <ReserveParticipantRow key={p.basicInfo.id} participant={p} />)}`.

`AwaitingDmDialog.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";

export function AwaitingDmDialog() {
  const { awaiting, reserve, actions, isDM } = useBattleScene();

  if (!isDM || !awaiting) return null;

  const side = awaiting === "victory" ? ParticipantSide.ENEMY : ParticipantSide.ALLY;

  const waiting = reserve.filter((p) => p.basicInfo.side === side);

  const busy = actions.reveal.isPending || actions.complete.isPending;

  return (
    <ResponsiveDialog
      open
      onOpenChange={() => {}}
      size="sm"
      hud
      title={awaiting === "victory" ? "У резерві ще є вороги" : "У резерві ще є союзники"}
      description={`${awaiting === "victory" ? "Видимих ворогів переможено" : "Видимих союзників переможено"}. Ввести резерв у бій чи завершити бій?`}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={() => actions.complete.mutate({ result: awaiting })}>Завершити бій</Button>
          <Button disabled={busy} onClick={() => actions.reveal.mutate({ participantIds: waiting.map((p) => p.basicInfo.id) })}>Ввести всіх</Button>
        </>
      }
    >
      <ul className="space-y-1 py-2 text-sm">
        {waiting.map((p) => <li key={p.basicInfo.id}>{p.basicInfo.name}</li>)}
      </ul>
    </ResponsiveDialog>
  );
}
```

(Перевірити, чи `ResponsiveDialog` дозволяє діалог без закриття; якщо `onOpenChange` обов'язково має закривати — тримати локальний стан `dismissed`, скинутий при зміні `awaiting`, щоб ДМ міг закрити й відкрити учасника з картки.) Змонтувати `<AwaitingDmDialog />` у `DmPanel.tsx` поряд з іншими діалогами.

`AwaitingDmBanner.tsx` (стиль як у `BattleOverBanner`, іконка `Hourglass`):

```tsx
"use client";

import { memo } from "react";
import { Hourglass } from "lucide-react";

export const AwaitingDmBanner = memo(function AwaitingDmBanner() {
  return (
    <div className="mx-4 mt-2 flex min-h-10 items-center justify-center gap-3 border-y border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-1.5 text-center">
      <Hourglass className="size-4 shrink-0 text-[var(--gold)]" />
      <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">Очікуємо рішення ДМ</span>
    </div>
  );
});
```

У `DesktopBattleLayout.tsx` і `MobileBattleLayout.tsx` поряд з `BattleOverBanner`: `{awaiting && !isDM && <AwaitingDmBanner />}` (`awaiting` — з `useBattleScene()`).

`AddParticipantDialog.tsx`:
  - стан `const [reserved, setReserved] = useState(false);`;
  - `onAdd({ …, reserved })` в обох гілках, скидати `setReserved(false)` після додавання;
  - перед `ConfirmCancelFooter`:

```tsx
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={reserved} onCheckedChange={(v) => setReserved(v === true)} />
          У резерв — з'явиться, коли ДМ введе в бій
        </label>
```

  (`Checkbox` з `@/components/ui/checkbox`);
  - `description="Учасник займе місце в черзі за своєю ініціативою або чекатиме в резерві."`.

- [ ] **Step 4: Run** `pnpm test:run components/battle lib/hooks/battle` — PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/battle components/battle
git commit -m "feat(battle-ui): reserve cards with a reveal button, DM decision dialog, player waiting banner"
```

---

### Task 9: battle-sweep сценарій і фінальна перевірка

**Files:**
- Modify: `scripts/sim/battle-sweep.ts`

**Interfaces:**
- Consumes: маршрут reveal (Task 5), `add-participant` (Task 6), `reserved` у ростері (Task 4).

- [ ] **Step 1: Сценарій.** Імпорти: `createAddParticipantMutation`, `addParticipantSchema` з `@/app/api/campaigns/[id]/battles/[battleId]/add-participant/add-participant-mutation`; `revealParticipantMutation`, `revealParticipantSchema` з `.../reveal-participant/reveal-participant-mutation`. Опції поряд з `START`/`NEXT`:

```ts
const REVEAL = { access: "dm", requireStatus: "active", allowWhileAwaitingDm: true, schema: revealParticipantSchema, mutate: revealParticipantMutation };

const KILL = (id: string) => ({ ...PATCH(id), allowWhileAwaitingDm: true });
```

Функція після `auraZoneCheck` (за її зразком):

```ts
async function reserveCheck() {
  await applyRotation(0);
  battleLabel = "Резерв";

  const [front, back] = await prisma.unit.findMany({ where: { campaignId: ctx.campaignId }, take: 2 });

  const setup = [...heroRows.map((h) => ({ id: h.id, type: ParticipantSourceType.CHARACTER, side: "ally" })), { id: front.id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 1 }, { id: back.id, type: ParticipantSourceType.UNIT, side: "enemy", quantity: 2, reserved: 2 }];

  const b = await prisma.battleScene.create({ data: { campaignId: ctx.campaignId, name: "ТЕСТ Резерв", status: "prepared", participants: setup as any, currentRound: 1, currentTurnIndex: 0 } });

  ctx.battleId = b.id; state = await readState(); await call("start", START);

  const reserve = () => (state.pendingSummons ?? []).filter((p: any) => p.battleData.reserved);

  const startedOk = P().length === heroRows.length + 1 && reserve().length === 2 && reserve().every((p: any) => p.battleData.hpMultiplier !== undefined);

  const before = current().basicInfo.id;

  const revealedId = reserve()[0].basicInfo.id;

  const r = await call("reveal-participant", REVEAL, { participantIds: [revealedId] });

  await nextOnly();

  const actedNext = current().basicInfo.id === revealedId && before !== revealedId;

  for (const e of P().filter((p) => p.basicInfo.side === "enemy")) await call("participants", KILL(e.basicInfo.id), { kill: true });

  const awaitingOk = state.status === "active" && reserve().length === 1;

  const blocked = await call("next-turn", NEXT);

  const r2 = await call("reveal-participant", REVEAL, { participantIds: [reserve()[0].basicInfo.id] });

  tcheck("Резерв: старт, введення, очікування рішення ДМ", startedOk && r.status === 200 && actedNext && awaitingOk && blocked.status === 422 && r2.status === 200 && state.status === "active", `старт=${startedOk} reveal=${r.status} ходить-наступним=${actedNext} очікування=${awaitingOk} next-turn=${blocked.status} reveal2=${r2.status}`);
}
```

і в `main()`: `if (MODE === "all" || MODE === "targeted") await reserveCheck();` після `auraZoneCheck`. Перевірка `TURN` у `call` вимагає, щоб `reveal-participant` не змінював поточного учасника — це і є перевірка вимоги. Якщо `kill` поточного ворога легітимно передає хід (дивись `patch-participant-mutation.ts`), спершу вбити не поточних, а поточного — останнім або після `nextOnly()`, щоб не отримати хибне `TURN`. (Якщо `ParticipantSourceType`/`PATCH` відрізняються сигнатурою — узгодити з кодом файлу; `call` для `PATCH` формує URL з label, тож label `participants` достатній.)

- [ ] **Step 2: Повна перевірка**

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test:run
```

Expected: без помилок; усі тести PASS.

- [ ] **Step 3: battle-sweep на копії прод-БД** (якщо локальна БД `prodcopy` доступна):

```bash
./scripts/db/prodcopy-db.sh
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep
```

Expected: exit 0; у звіті «✅ Резерв: старт, введення, очікування рішення ДМ».

- [ ] **Step 4: Commit**

```bash
git add scripts/sim/battle-sweep.ts
git commit -m "test(battle-sweep): reserve reveal and DM decision scenario"
```
