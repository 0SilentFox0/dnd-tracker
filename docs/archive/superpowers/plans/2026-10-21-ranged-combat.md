# Ranged Combat (auto cover, chain shot, melee cleave) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перешкода між стрільцем і ціллю рахується автоматично (шкода ×0.5); ланцюговий постріл Демониці сам обирає наступні цілі; багатоголові ближні юніти бʼють кілька ворогів; вторинні жертви й великі залпи коректно анімуються.

**Architecture:** Чисті функції в `lib/utils/battle/grid` (лінія вогню, найближчий) і `lib/utils/battle/attack/process` (ланцюг, розщеплення) викликаються з `runAttackPhase` (сервер) і з `useAttackWizard` / `deriveTrajectory` (клієнт-прев'ю). Новий хук режиму `lineBlocked` дає лабіринту перевіряти тонкі стіни. FX: `originId` у `FxSpec`, сплеш-специфікації для вторинних жертв, обрізка черги цілими діями.

**Tech Stack:** TypeScript strict, Next.js 16, React 19, Vitest, Zod.

**Spec:** `docs/archive/superpowers/specs/2026-10-21-ranged-combat-design.md`

## Global Constraints

- Робоча тека — worktree `/Users/silentfox/Work/dnd-tracker-shooting`, гілка `feat/ranged-combat`. Не чіпати основну теку `/Users/silentfox/Work/dnd-tracker`.
- Множник перешкоди — наявні `applyObstacle` / `obstacleStep` / `OBSTACLE_MULTIPLIER = 0.5` (`lib/utils/battle/damage/obstacle.ts`), без змін.
- Ядро не імпортує режим напряму (ESLint): лабіринт — лише через хук у `lib/utils/battle/modes/engine.ts`.
- Імпорти через `@/…`; `simple-import-sort`; порожній рядок навколо `const`/`if`/`return`/блоків (`pnpm lint --fix`).
- Коментарі — мінімальні, українською, лише «чому».
- Тексти для користувача — українською.
- Тести — у сусідніх `__tests__/`; під час роботи `pnpm test:related <files>` / `pnpm test:changed`; повний `pnpm test:run` — лише в останній задачі.
- Без міграцій БД.
- Коміт після кожної задачі; повідомлення англійською, закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Великі істоти (2×2) як стрілець, ціль або перешкода: лінія від найближчих клітинок, власний footprint не заважає — тест у Task 1.
- Сусідні стрілець і ціль (діагональ теж): штрафу немає ніколи — тест у Task 1.
- Учасник «у повітрі» (пікірування) або повалений (0 HP) на лінії — не заважає — тест у Task 1.
- Ланцюг, коли основна ціль гине від першого пострілу: стрибок іде від її клітинки, мертва ціль не обирається знову — тест у Task 5.
- Бій без карти: ланцюг бере ворогів за ініціативою; розщеплення дає гравцю вибрати до N цілей вручну; перешкоди немає — тести в Tasks 3, 4, 5.

---

### Task 1: Лінія вогню (`lineOfFire`) + хук режиму `lineBlocked`

**Files:**
- Create: `lib/utils/battle/grid/line-of-fire.ts`
- Modify: `lib/utils/battle/grid/index.ts` (додати `export * from "./line-of-fire";`)
- Modify: `lib/utils/battle/modes/types.ts` (`ModeEngineHooks.lineBlocked`)
- Modify: `lib/utils/battle/modes/engine.ts` (`modeLineBlocked`)
- Modify: `lib/utils/battle/modes/maze/sight.ts` (`mazeLineBlocked`)
- Modify: `lib/utils/battle/modes/maze/mode.ts` (підключити хук)
- Test: `lib/utils/battle/grid/__tests__/line-of-fire.test.ts`

**Interfaces:**
- Produces: `export interface LineOfFire { blocked: boolean; cells: string[] }`; `export function lineOfFire(map: BattleMapConfig | null | undefined, participants: BattleParticipant[], shooter: BattleParticipant, target: BattleParticipant): LineOfFire`; `export function modeLineBlocked(map, line: GridPoint[]): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { lineOfFire } from "../line-of-fire";

import { ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import type { BattleParticipant, GridPoint } from "@/types/battle";

const MAP = testMap();

const at = (id: string, pos: GridPoint, side = ParticipantSide.ENEMY, size?: number) => placed(id, { side, at: pos, hp: 20, size });

const shooter = at("s", { x: 0, y: 5 }, ParticipantSide.ALLY);

const target = at("t", { x: 6, y: 5 });

const down = (p: BattleParticipant) => ({ ...p, combatStats: { ...p.combatStats, currentHp: 0 } });

describe("lineOfFire", () => {
  it("вільна лінія — без перешкоди", () => {
    expect(lineOfFire(MAP, [shooter, target], shooter, target)).toEqual({ blocked: false, cells: [] });
  });

  it("союзник і ворог на лінії заважають", () => {
    expect(lineOfFire(MAP, [shooter, target, at("ally", { x: 2, y: 5 }, ParticipantSide.ALLY)], shooter, target)).toEqual({ blocked: true, cells: ["2:5"] });
    expect(lineOfFire(MAP, [shooter, target, at("foe", { x: 4, y: 5 })], shooter, target).cells).toEqual(["4:5"]);
  });

  it("стіна, барʼєр і неігрова клітинка заважають, небезпека — ні", () => {
    const terrain = { "1:5": { kind: "wall" as const }, "3:5": { kind: "barrier" as const }, "4:5": { kind: "hazard" as const } };

    expect(lineOfFire({ ...MAP, terrain, blocked: ["5:5"] }, [shooter, target], shooter, target).cells).toEqual(["1:5", "3:5", "5:5"]);
  });

  it("повалений і той, хто в повітрі, не заважають", () => {
    const flying = at("fly", { x: 3, y: 5 });

    const airborne = { ...flying, battleData: { ...flying.battleData, airborne: { since: 1, percent: 200, name: "Пікірування" } } };

    expect(lineOfFire(MAP, [shooter, target, down(at("d", { x: 2, y: 5 })), airborne], shooter, target).blocked).toBe(false);
  });

  it("сусідні клітинки (і діагональ) — без перешкоди", () => {
    expect(lineOfFire(MAP, [shooter, at("n", { x: 1, y: 6 })], shooter, at("n", { x: 1, y: 6 })).blocked).toBe(false);
  });

  it("велика ціль: лінія до її найближчої клітинки, власний footprint не заважає", () => {
    const big = at("big", { x: 5, y: 4 }, ParticipantSide.ENEMY, 2);

    expect(lineOfFire(MAP, [shooter, big], shooter, big)).toEqual({ blocked: false, cells: [] });
  });

  it("великий стрілець не заважає сам собі", () => {
    const bigShooter = at("bs", { x: 0, y: 4 }, ParticipantSide.ALLY, 2);

    expect(lineOfFire(MAP, [bigShooter, target], bigShooter, target).blocked).toBe(false);
  });

  it("без карти або без позиції — без перешкоди", () => {
    expect(lineOfFire(null, [shooter, target], shooter, target).blocked).toBe(false);
    expect(lineOfFire(MAP, [shooter, placed("off")], shooter, placed("off")).blocked).toBe(false);
  });

  it("лабіринт: тонка стіна між клітинками лінії — перешкода", () => {
    const map = mazeMap({ walls: ["2:5:e"] }, 10);

    expect(lineOfFire(map, [shooter, target], shooter, target)).toEqual({ blocked: true, cells: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/line-of-fire.test.ts`
Expected: FAIL — `Cannot find module '../line-of-fire'`.

- [ ] **Step 3: Implement the mode hook**

`lib/utils/battle/modes/types.ts`, в `ModeEngineHooks<C>` після `engages`:

```ts
  /** Лінія вогню (сусідні клітинки по черзі) перетинає стіну режиму. Відсутній — ні. */
  lineBlocked?(args: { config: C; map: BattleMapConfig; line: GridPoint[] }): boolean;
```

`lib/utils/battle/modes/engine.ts`, після `modeEngages`:

```ts
export function modeLineBlocked(map: MapArg, line: GridPoint[]): boolean {
  const active = activeModeWithConfig(map);

  return active?.mode.engine.lineBlocked?.({ config: active.config, map: active.map, line }) ?? false;
}
```

`lib/utils/battle/modes/maze/sight.ts` — додати імпорт `type GridPoint` уже є; додати функцію:

```ts
export function mazeLineBlocked(grid: MazeGrid, line: GridPoint[]): boolean {
  const walls = wallSet(grid.maze);

  return line.some((c, i) => i > 0 && !canStep(grid, walls, line[i - 1], c));
}
```

`lib/utils/battle/modes/maze/mode.ts` — імпорт `mazeLineBlocked` з `./sight`, в `engine` після `engages`:

```ts
    lineBlocked: ({ map, line }) => mazeLineBlocked(gridOf(map), line),
```

- [ ] **Step 4: Implement `lineOfFire`**

`lib/utils/battle/grid/line-of-fire.ts`:

```ts
import { blockedSet, cellKey, cellLine, closestCell, inBounds } from "./geometry";
import { bothOnMap, cellsOf, occupiedBy } from "./occupancy";

import { isAirborne } from "@/lib/utils/abilities/engine/core/participants";
import { modeLineBlocked } from "@/lib/utils/battle/modes/engine";
import { isUp } from "@/lib/utils/battle/participant/state";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface LineOfFire {
  blocked: boolean;
  /** Клітинки, що заважають (для підсвітки); стіна лабіринту клітинки не має. */
  cells: string[];
}

const CLEAR: LineOfFire = { blocked: false, cells: [] };

export function lineOfFire(map: BattleMapConfig | null | undefined, participants: BattleParticipant[], shooter: BattleParticipant, target: BattleParticipant): LineOfFire {
  if (!bothOnMap(map, shooter, target)) return CLEAR;

  const from = cellsOf(shooter);

  const to = cellsOf(target);

  const start = closestCell(from, to);

  const line = cellLine(start, closestCell(to, [start]));

  const own = new Set([...from, ...to].map(cellKey));

  const others = participants.filter((p) => p.basicInfo.id !== shooter.basicInfo.id && p.basicInfo.id !== target.basicInfo.id);

  const occupied = occupiedBy(others, (p) => isUp(p) && !isAirborne(p));

  const blocked = blockedSet(map);

  const cells = line
    .filter((c) => {
      const key = cellKey(c);

      if (own.has(key)) return false;

      const kind = map.terrain?.[key]?.kind;

      return !inBounds(map, c) || blocked.has(key) || kind === "wall" || kind === "barrier" || occupied.has(key);
    })
    .map(cellKey);

  return { blocked: cells.length > 0 || modeLineBlocked(map, line), cells };
}
```

Add `export * from "./line-of-fire";` to `lib/utils/battle/grid/index.ts` (alphabetical, after `./layout`).

Check that `lib/utils/battle/participant/state.ts` does not import `@/lib/utils/battle/grid` (`import/no-cycle`): `grep -n "battle/grid" lib/utils/battle/participant/state.ts` must print nothing.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/line-of-fire.test.ts lib/utils/battle/modes`
Expected: PASS. If the maze case fails because the maze needs facing/vision fixtures, it must not — `lineBlocked` only reads `walls`; check the edge key `"2:5:e"` (edge between 2:5 and 3:5).

- [ ] **Step 6: Lint and commit**

```bash
pnpm lint --fix lib/utils/battle/grid lib/utils/battle/modes
git add lib/utils/battle/grid lib/utils/battle/modes
git commit -m "feat(battle): line of fire with terrain, units and maze walls

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `nearestTo` + «Стріла сили» бʼє найближчого

**Files:**
- Create: `lib/utils/battle/grid/nearest.ts`
- Modify: `lib/utils/battle/grid/index.ts` (`export * from "./nearest";`)
- Modify: `lib/utils/abilities/engine/core/targets.ts:37-44` (case `otherEnemy`)
- Test: `lib/utils/battle/grid/__tests__/nearest.test.ts`
- Test: `lib/utils/battle/attack/__tests__/force-arrow.test.ts` (додати кейси; наявні, що покладаються на «перший за ініціативою» без карти, мають лишитись зеленими)

**Interfaces:**
- Produces: `export function nearestTo(from: BattleParticipant, candidates: BattleParticipant[]): BattleParticipant | undefined` — найближчий за `footprintDistance`; нічия — порядок `candidates`; якщо `from` поза картою — `candidates[0]`; кандидати поза картою — після тих, що на карті.

- [ ] **Step 1: Write the failing test** — `lib/utils/battle/grid/__tests__/nearest.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { nearestTo } from "../nearest";

import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";

describe("nearestTo", () => {
  const from = placed("f", { at: { x: 5, y: 5 } });

  it("найближчий за клітинками", () => {
    expect(nearestTo(from, [placed("far", { at: { x: 9, y: 5 } }), placed("near", { at: { x: 6, y: 6 } })])?.basicInfo.id).toBe("near");
  });

  it("нічия — перший у списку", () => {
    expect(nearestTo(from, [placed("a", { at: { x: 7, y: 5 } }), placed("b", { at: { x: 3, y: 5 } })])?.basicInfo.id).toBe("a");
  });

  it("кандидат поза картою — після тих, що на карті", () => {
    expect(nearestTo(from, [placed("off"), placed("on", { at: { x: 9, y: 9 } })])?.basicInfo.id).toBe("on");
  });

  it("from поза картою — перший кандидат; порожньо — undefined", () => {
    expect(nearestTo(placed("x"), [placed("a", { at: { x: 1, y: 1 } }), placed("b")])?.basicInfo.id).toBe("a");
    expect(nearestTo(from, [])).toBeUndefined();
  });
});
```

Add to `lib/utils/battle/attack/__tests__/force-arrow.test.ts` (reuse its existing setup helpers for the archer with the «Стріла сили» ability; read the file first) two cases:
1. On a map (`testMap()`), archer hits `t` at `{x:3,y:5}`; enemies `far` at `{x:9,y:9}` (earlier in initiative) and `near` at `{x:4,y:5}` → the 50 % bonus damage lands on `near`.
2. Without a map, the first enemy in initiative is dormant (`battleData: { dormant: true }`) → bonus damage lands on the next one.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/nearest.test.ts lib/utils/battle/attack/__tests__/force-arrow.test.ts`
Expected: FAIL (module missing; new force-arrow cases hit the wrong target).

- [ ] **Step 3: Implement**

`lib/utils/battle/grid/nearest.ts`:

```ts
import { footprintDistance } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import type { BattleParticipant } from "@/types/battle";

export function nearestTo(from: BattleParticipant, candidates: BattleParticipant[]): BattleParticipant | undefined {
  if (!isOnMap(from)) return candidates[0];

  const origin = cellsOf(from);

  const distance = (p: BattleParticipant) => (isOnMap(p) ? footprintDistance(origin, cellsOf(p)) : Infinity);

  return candidates.reduce<BattleParticipant | undefined>((best, p) => (!best || distance(p) < distance(best) ? p : best), undefined);
}
```

`lib/utils/abilities/engine/core/targets.ts` — import `import { nearestTo } from "@/lib/utils/battle/grid/nearest";` (direct file, not the barrel, to keep the module graph small), replace the `otherEnemy` case:

```ts
    case "otherEnemy": {
      const taken = eventTargetIds(event);

      const others = ps.filter((p) => p.basicInfo.side !== side && !taken.includes(p.basicInfo.id) && reachable(p));

      const from = findParticipant(ps, taken[0] ?? "");

      const pick = from ? nearestTo(from, others) : others[0];

      return pick ? [pick.basicInfo.id] : [];
    }
```

(`reachable` already = `targetableInPlay` + `modeSees` for enemies — skips dormant and unseen.)

- [ ] **Step 4: Run tests**

Run: `pnpm test:related lib/utils/abilities/engine/core/targets.ts lib/utils/battle/grid/nearest.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/grid lib/utils/abilities/engine/core/targets.ts
git add lib/utils/battle/grid lib/utils/abilities/engine/core/targets.ts lib/utils/battle/attack/__tests__/force-arrow.test.ts
git commit -m "fix(abilities): force arrow hits the enemy nearest to the target

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Спільний ліміт цілей + ближнє розщеплення (Цербер)

**Files:**
- Create: `lib/utils/battle/attack/max-targets.ts`
- Create: `lib/utils/battle/attack/process/cleave.ts`
- Modify: `lib/utils/battle/attack-phase/targets.ts`
- Modify: `lib/utils/battle/attack-phase/strike-rolls.ts` (`isMultiTargetRanged` → `volley`)
- Modify: `lib/utils/battle/attack-phase/run-attack-phase.ts`
- Modify: `lib/hooks/battle/useAttackWizard.ts` (`describe`)
- Test: `lib/utils/battle/attack/__tests__/max-targets.test.ts`
- Test: `lib/utils/battle/attack/process/__tests__/cleave.test.ts`
- Test: `lib/utils/battle/attack-phase/__tests__/multi-target-roll.test.ts` (переписати «melee without the flag is one target»)

**Interfaces:**
- Produces:
  - `export function attackMaxTargets(attacker: BattleParticipant, attack: BattleAttack, ctx: { chain: boolean; onMap: boolean }): number`
  - `export function isCleave(attack: BattleAttack): boolean` (у `max-targets.ts`): ближня, не `aoe`, `(attack.maxTargets ?? 1) > 1`.
  - `export function cleaveTargets(map: BattleMapConfig | null | undefined, order: BattleParticipant[], attacker: BattleParticipant, target: BattleParticipant, count: number): BattleParticipant[]`
  - `AttackTargets` (targets.ts) тепер: `{ targets; expanded: boolean; piercing: boolean; volley: boolean; falloff: number; serverRolledFrom: number }` — `serverRolledFrom` = індекс, з якого d20 кидає сервер (розщеплення: 1; інакше `targets.length`).
  - `AttackFlags` тепер включає `"chainShot"` (прапорець зʼявиться в Task 5; тут додати лише ключ у масив `findFlagsMany` **у Task 5**, не тут). У цій задачі `ctx.chain` на сервері = `false`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/battle/attack/__tests__/max-targets.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { attackMaxTargets, isCleave } from "../max-targets";

import { AttackType } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing" };

const bite: BattleAttack = { id: "m", name: "Три голови", type: AttackType.MELEE, attackBonus: 5, damageDice: "2d6", damageType: "piercing", maxTargets: 3 };

const withStats = (maxTargets: number) => {
  const p = placed("a");

  return { ...p, combatStats: { ...p.combatStats, maxTargets } };
};

const ctx = { chain: false, onMap: true };

describe("attackMaxTargets", () => {
  it("дальня: attack.maxTargets, інакше combatStats.maxTargets", () => {
    expect(attackMaxTargets(withStats(2), bow, ctx)).toBe(2);
    expect(attackMaxTargets(withStats(2), { ...bow, maxTargets: 3 }, ctx)).toBe(3);
    expect(attackMaxTargets(placed("a"), bow, ctx)).toBe(1);
  });

  it("ланцюг — лише перша ціль", () => {
    expect(attackMaxTargets(withStats(3), bow, { ...ctx, chain: true })).toBe(1);
  });

  it("ближня: combatStats.maxTargets не діє (скіл стрільби)", () => {
    expect(attackMaxTargets(withStats(2), { ...bite, maxTargets: undefined }, ctx)).toBe(1);
  });

  it("розщеплення: на карті 1, без карти — до N вручну", () => {
    expect(isCleave(bite)).toBe(true);
    expect(attackMaxTargets(placed("a"), bite, ctx)).toBe(1);
    expect(attackMaxTargets(placed("a"), bite, { ...ctx, onMap: false })).toBe(3);
  });

  it("aoe: attack.maxTargets || combatStats.maxTargets", () => {
    expect(attackMaxTargets(withStats(4), { ...bite, targetType: "aoe", maxTargets: undefined }, ctx)).toBe(4);
    expect(isCleave({ ...bite, targetType: "aoe" })).toBe(false);
  });
});
```

`lib/utils/battle/attack/process/__tests__/cleave.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cleaveTargets } from "../cleave";

import { ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { GridPoint } from "@/types/battle";

const MAP = testMap();

const at = (id: string, pos: GridPoint, side = ParticipantSide.ENEMY) => placed(id, { side, at: pos, hp: 20 });

const cerberus = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY);

const target = at("t", { x: 6, y: 5 });

const ids = (ps: { basicInfo: { id: string } }[]) => ps.map((p) => p.basicInfo.id);

describe("cleaveTargets", () => {
  it("вороги поруч і з атакуючим, і з ціллю, за ініціативою, до count", () => {
    const order = [cerberus, target, at("a", { x: 6, y: 4 }), at("b", { x: 6, y: 6 }), at("c2", { x: 5, y: 4 })];

    expect(ids(cleaveTargets(MAP, order, cerberus, target, 2))).toEqual(["a", "b"]);
  });

  it("не бере союзників, далеких і повалених", () => {
    const fallen = at("down", { x: 6, y: 6 });

    const order = [cerberus, target, at("ally", { x: 6, y: 4 }, ParticipantSide.ALLY), at("far", { x: 7, y: 5 }), { ...fallen, combatStats: { ...fallen.combatStats, currentHp: 0, status: "unconscious" as never } }];

    expect(cleaveTargets(MAP, order, cerberus, target, 2)).toEqual([]);
  });

  it("без карти — порожньо", () => {
    expect(cleaveTargets(null, [cerberus, target, at("a", { x: 6, y: 4 })], cerberus, target, 2)).toEqual([]);
  });
});
```

(For the fallen participant use the real `CombatStatus` enum value for an unconscious participant from `@/lib/constants/battle` instead of the `as never` cast — check `grep -n "enum CombatStatus" -A6 lib/constants/battle.ts`.)

In `lib/utils/battle/attack-phase/__tests__/multi-target-roll.test.ts` replace the test «melee without the flag is one target» (around line 113) with a placed scenario (import `placed`, `testMap` from `@/lib/utils/battle/__tests__/fixtures/placed`; `runAttackPhase` accepts `map`):

```ts
  it("melee cleave: player picks one, adjacent enemies get server-rolled strikes with falloff", () => {
    const bite: BattleAttack = { id: "m", name: "Три голови", type: AttackType.MELEE, attackBonus: 20, damageDice: "1d6", damageType: "piercing", maxTargets: 3 };

    const falloff = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "multiTargetFalloff", percent: 50 }] });

    const cerb = placed("a", { side: ParticipantSide.ALLY, at: { x: 5, y: 5 }, attacks: [bite], abilities: [falloff] });

    const order = [cerb, placed("t", { at: { x: 6, y: 5 }, hp: 50 }), placed("x", { at: { x: 6, y: 4 }, hp: 50 }), placed("y", { at: { x: 6, y: 6 }, hp: 50 })];

    const r = runAttackPhase({ battle: { initiativeOrder: order, currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", targetIds: ["t"], attackRoll: 15, damageRolls: [6] }, battleId: "b", userId: "u", isDM: true, rng: seq(0.5), map: testMap() });

    const attacks = r.allBattleActions.filter((e) => e.actionType === "attack");

    const dmg = (id: string) => attacks.flatMap((e) => e.hpChanges).filter((h) => h.participantId === id).reduce((s, h) => s + h.change, 0);

    expect(attacks.map((e) => e.targets[0].participantId)).toEqual(["t", "x", "y"]);
    expect(dmg("x")).toBeLessThanOrEqual(dmg("t"));
    expect(dmg("y")).toBeLessThanOrEqual(dmg("t"));
  });

  it("melee cleave on the map rejects a second chosen target", () => {
    const bite: BattleAttack = { id: "m", name: "Три голови", type: AttackType.MELEE, attackBonus: 20, damageDice: "1d6", damageType: "piercing", maxTargets: 3 };

    const cerb = placed("a", { side: ParticipantSide.ALLY, at: { x: 5, y: 5 }, attacks: [bite] });

    const order = [cerb, placed("t", { at: { x: 6, y: 5 }, hp: 50 }), placed("x", { at: { x: 6, y: 4 }, hp: 50 })];

    expect(() =>
      runAttackPhase({ battle: { initiativeOrder: order, currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", targetIds: ["t", "x"], attackRolls: [15, 15], damageRolls: [6, 6] }, battleId: "b", userId: "u", isDM: true, rng: seq(0.5), map: testMap() }),
    ).toThrow("Забагато цілей. Максимум: 1");
  });
```

Add imports `placed`, `testMap` from `@/lib/utils/battle/__tests__/fixtures/placed`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/utils/battle/attack/__tests__/max-targets.test.ts lib/utils/battle/attack/process/__tests__/cleave.test.ts lib/utils/battle/attack-phase/__tests__/multi-target-roll.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `max-targets.ts` and `cleave.ts`**

`lib/utils/battle/attack/max-targets.ts`:

```ts
import { AttackType } from "@/lib/constants/battle";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function isCleave(attack: BattleAttack): boolean {
  return attack.targetType !== "aoe" && attackKindOf(attack.type) === AttackType.MELEE && (attack.maxTargets ?? 1) > 1;
}

/** Скільки цілей обирає гравець; автоцілі (ланцюг, розщеплення, пробивний, «бʼє всіх») — поза лімітом. */
export function attackMaxTargets(attacker: BattleParticipant, attack: BattleAttack, ctx: { chain: boolean; onMap: boolean }): number {
  if (attack.targetType === "aoe") return attack.maxTargets || attacker.combatStats.maxTargets || 1;

  if (attackKindOf(attack.type) === AttackType.MELEE) return isCleave(attack) && !ctx.onMap ? (attack.maxTargets ?? 1) : 1;

  if (ctx.chain) return 1;

  return Math.max(1, attack.maxTargets ?? attacker.combatStats.maxTargets ?? 1);
}
```

`lib/utils/battle/attack/process/cleave.ts`:

```ts
import { findParticipant, isDormant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { bothOnMap, cellsOf, footprintDistance, isOnMap } from "@/lib/utils/battle/grid";
import { modeMeleeBlockedText } from "@/lib/utils/battle/modes/engine";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

/** Додаткові цілі багатоголової атаки: вороги поруч і з атакуючим, і з ціллю, за ініціативою. */
export function cleaveTargets(map: BattleMapConfig | null | undefined, order: BattleParticipant[], attacker: BattleParticipant, target: BattleParticipant, count: number): BattleParticipant[] {
  if (count <= 0 || !bothOnMap(map, attacker, target)) return [];

  const mine = cellsOf(attacker);

  const theirs = cellsOf(findParticipant(order, target.basicInfo.id) ?? target);

  return order
    .filter(
      (p) =>
        p.basicInfo.id !== target.basicInfo.id &&
        p.basicInfo.side !== attacker.basicInfo.side &&
        isTargetable(p) &&
        !isDormant(p) &&
        isOnMap(p) &&
        footprintDistance(mine, cellsOf(p)) <= 1 &&
        footprintDistance(theirs, cellsOf(p)) <= 1 &&
        modeMeleeBlockedText(map, attacker, p) === null,
    )
    .slice(0, count);
}
```

Check `isDormant` is exported from `participants.ts` (`grep -n "export function isDormant" lib/utils/abilities/engine/core/participants.ts`); `isTargetable` already filters dead/unconscious via `isActive`.

- [ ] **Step 4: Rework `resolveAttackTargets`**

Replace the body of `lib/utils/battle/attack-phase/targets.ts` after the `byId`/`reachable` helpers (keep imports, add `attackMaxTargets`, `isCleave` from `@/lib/utils/battle/attack/max-targets` and `cleaveTargets` from `@/lib/utils/battle/attack/process/cleave`):

```ts
export interface AttackTargets {
  targets: BattleParticipant[];
  expanded: boolean;
  piercing: boolean;
  /** Кожна ціль — окремий удар з власними кубиками; основна — повна шкода, решта — за falloff. */
  volley: boolean;
  falloff: number;
  /** З цього індексу d20 і кубики шкоди кидає сервер (автоцілі розщеплення). */
  serverRolledFrom: number;
}

export function resolveAttackTargets({ order, attacker, attack, chosen, targetIds, map, flags }: AttackTargetsInput): AttackTargets {
  const isAoe = attack.targetType === "aoe";

  const isRanged = attack.type === AttackType.RANGED;

  const hitsAllEnemies = flags.attackHitsAllEnemies.length > 0;

  const piercing = !hitsAllEnemies && !isAoe && isRanged && !!map && flags.piercingShot.length > 0;

  const expanded = hitsAllEnemies || piercing;

  const onMap = !!map && !!attacker.battleData.position;

  const cleave = !expanded && isCleave(attack) && onMap;

  const byId = (ids: string[]) => ids.flatMap((id) => findParticipant(order, id) ?? []);

  const reachable = (): BattleParticipant[] => (onMap ? enemiesInReach(map, order, attacker, attack) : order.filter(enemyOf(attacker)));

  const limit = attackMaxTargets(attacker, attack, { chain: false, onMap });

  if (!expanded && chosen.length > limit) throw new BattleRuleError("action_rejected", `Забагато цілей. Максимум: ${limit}`);

  const targets = hitsAllEnemies
    ? [...chosen.filter(enemyOf(attacker)), ...reachable().filter((t) => !targetIds.includes(t.basicInfo.id))]
    : piercing
      ? byId([...new Set([...piercingTargets(map, order, attacker, chosen[0].basicInfo.id), ...targetIds])])
      : cleave
        ? [chosen[0], ...cleaveTargets(map, order, attacker, chosen[0], (attack.maxTargets ?? 1) - 1)]
        : chosen;

  if (targets.length === 0) throw new BattleRuleError("action_rejected", "Жоден ворог не в досяжності");

  const volley = expanded || cleave || (!isAoe && (isRanged || isCleave(attack)) && limit > 1);

  const falloffPercents = expanded ? [] : flags.multiTargetFalloff.map((f) => f.percent);

  return {
    targets,
    expanded,
    piercing,
    volley,
    falloff: falloffPercents.length > 0 ? Math.min(...falloffPercents) / 100 : 1,
    serverRolledFrom: cleave ? 1 : targets.length,
  };
}
```

Note: the `limit` call passes `chain: false` here; Task 5 changes it to the real flag.

`lib/utils/battle/attack-phase/strike-rolls.ts` — rename the `damageFractions` option `isMultiTargetRanged` → `volley` (signature `multi: { volley: boolean; falloff: number }`, body `if (multi.volley) …`) and the comment («volley: основна ціль — повна шкода, додаткові — за falloff»).

`lib/utils/battle/attack-phase/run-attack-phase.ts`:
- destructure `{ targets, expanded, piercing, volley, falloff, serverRolledFrom }`;
- `damageFractions(targets, attack, { volley, falloff })`;
- `const damageFormula = volley && (targets.length > 1 || expanded) ? heroAttackDamageParts(attacker, attack).formula : null;`
- replace the `strike` line with:

```ts
    const strike = i >= serverRolledFrom ? { value: rollDie(20, rng), serverRolled: true } : strikeD20(data, request, { index: i, chosenAt, expanded }, rng);
```

(import `rollDie` from `@/lib/utils/common/dice`). `piercing` is unused until Task 4 — prefix nothing, just don't destructure it yet if lint complains.

Fix any other `isMultiTargetRanged` references: `grep -rn "isMultiTargetRanged" lib app` → rename all.

- [ ] **Step 5: Client uses the same limit**

`lib/hooks/battle/useAttackWizard.ts` `describe`:

```ts
  const describe = (a: BattleAttack) => {
    const onMap = !!scene.battle.map && !!attacker?.battleData.position;

    const maxTargets = attacker ? attackMaxTargets(attacker, a, { chain: false, onMap }) : 1;

    return { attackId: a.id ?? a.name, maxTargets: hitsAll ? Math.max(maxTargets, enemyTargets.length) : maxTargets, diceSlots: attacker ? damageDiceSlots(attacker, a) : [6] };
  };
```

(import `attackMaxTargets` from `@/lib/utils/battle/attack/max-targets`.)

- [ ] **Step 6: Run tests**

Run: `pnpm test:related lib/utils/battle/attack-phase/targets.ts lib/utils/battle/attack-phase/strike-rolls.ts lib/utils/battle/attack-phase/run-attack-phase.ts lib/utils/battle/attack/max-targets.ts lib/utils/battle/attack/process/cleave.ts`
Expected: PASS. Existing tests that relied on a ranged volley with `combatStats.maxTargets` keep passing (ranged falls back to `combatStats.maxTargets`). A test that asserted the old melee single-target rejection should now be the rewritten one.

- [ ] **Step 7: Commit**

```bash
pnpm lint --fix lib/utils/battle lib/hooks/battle/useAttackWizard.ts
git add -A lib/utils/battle lib/hooks/battle/useAttackWizard.ts
git commit -m "fix(battle): multi-headed melee units strike adjacent enemies; one target cap for client and server

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Перешкода рахується на сервері для кожної цілі; поле `obstacle` прибрано з API

**Files:**
- Modify: `lib/utils/battle/attack-phase/run-attack-phase.ts`
- Modify: `lib/utils/battle/attack-phase/request.ts` (прибрати `obstacle`)
- Modify: `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts:32` (прибрати рядок `obstacle`)
- Modify: `types/api.ts:158-159` (прибрати `obstacle` і коментар)
- Modify: `lib/utils/battle/flows/attack-flow.ts` (прибрати `obstacle`, `TOGGLE_OBSTACLE`, `...(s.obstacle && …)`)
- Test: `lib/utils/battle/attack/__tests__/obstacle.test.ts`, `lib/utils/battle/flows/__tests__/attack-flow.test.ts`, `app/api/__tests__/battles/attack-mutation.test.ts` (оновити)

**Interfaces:**
- Consumes: `lineOfFire` (Task 1), `AttackTargets.piercing` (Task 3).
- Produces: `processAttack` отримує `obstacle: boolean` на ціль, обчислений сервером. Клієнтські `attackFlow`/`attackPayload` більше не знають про перешкоду (Task 6 прибирає UI).

- [ ] **Step 1: Write the failing test** — у `lib/utils/battle/attack/__tests__/obstacle.test.ts` (прочитати наявні кейси: ті, що передають `obstacle: true` у `runAttackPhase`/мутацію, переписати на розстановку на карті) додати:

```ts
describe("auto cover", () => {
  const bow: BattleAttack = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 20, damageDice: "1d6", damageType: "piercing", maxTargets: 2 };

  const archer = placed("a", { side: ParticipantSide.ALLY, at: { x: 0, y: 5 }, attacks: [bow] });

  const run = (order: BattleParticipant[], targetIds: string[], map = testMap()) =>
    runAttackPhase({ battle: { initiativeOrder: order, currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", targetIds, attackRolls: targetIds.map(() => 15), damageRolls: targetIds.flatMap(() => [6]) }, battleId: "b", userId: "u", isDM: true, rng: seq(0.5), map });

  const covered = (r: ReturnType<typeof run>) => r.allBattleActions.filter((e) => e.actionType === "attack").map((e) => e.resultText.includes("перешкода"));

  it("ціль за союзником — штраф, вільна ціль того ж залпу — ні", () => {
    const order = [archer, placed("ally", { side: ParticipantSide.ALLY, at: { x: 2, y: 5 } }), placed("t1", { at: { x: 5, y: 5 }, hp: 50 }), placed("t2", { at: { x: 0, y: 8 }, hp: 50 })];

    expect(covered(run(order, ["t1", "t2"]))).toEqual([true, false]);
  });

  it("стіна місцевості — штраф", () => {
    const order = [archer, placed("t1", { at: { x: 5, y: 5 }, hp: 50 })];

    expect(covered(run(order, ["t1"], testMap(10, 10, { terrain: { "3:5": { kind: "wall" } } })))).toEqual([true]);
  });

  it("ближня атака — без штрафу навіть через союзника", () => {
    const knight = placed("a", { side: ParticipantSide.ALLY, at: { x: 4, y: 5 } });

    const order = [knight, placed("t1", { at: { x: 5, y: 5 }, hp: 50 })];

    expect(covered(run(order, ["t1"]))).toEqual([false]);
  });

  it("без карти — без штрафу", () => {
    expect(covered(run([archer, placed("t1", { hp: 50 })], ["t1"], null as never))).toEqual([false]);
  });
});
```

(Use the file's existing imports style; `placed`/`testMap` from `@/lib/utils/battle/__tests__/fixtures/placed`, `seq` from `@/lib/utils/abilities/__tests__/fixtures`. For «без карти» pass `map: null` — make `run` accept `map: BattleMapConfig | null`.) Note: `archer` needs `combatStats.maxTargets` ≥ 2 or the bow's `maxTargets: 2` (used here) for the two-target case.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/utils/battle/attack/__tests__/obstacle.test.ts`
Expected: FAIL (no auto cover yet).

- [ ] **Step 3: Implement server cover**

`run-attack-phase.ts`: import `lineOfFire` from `@/lib/utils/battle/grid`, `attackKindOf` from `@/lib/utils/battle/common/attack-kind`, `AttackType` from `@/lib/constants/battle`. Before the loop:

```ts
  const isRanged = attackKindOf(attack.type) === AttackType.RANGED;
```

In the loop, before `processAttack`:

```ts
    const victim = findParticipant(currentInitiativeOrder, target.basicInfo.id) ?? target;

    // пробивний летить крізь цілі: штраф лише на першу
    const obstacle = isRanged && !(piercing && i > 0) && lineOfFire(input.map, currentInitiativeOrder, currentAttacker, victim).blocked;
```

and pass `target: victim, …, obstacle,` (replace `obstacle: data.obstacle`).

Remove `obstacle?: boolean;` from `AttackRequest` (`request.ts`), the Zod line `obstacle: z.boolean().default(false),` (`attack-mutation.ts`), the field + comment in `types/api.ts`. In `attack-flow.ts` remove `obstacle: boolean;` from state, `obstacle: false` from `initialAttackFlow`, the `TOGGLE_OBSTACLE` action type and case, and `...(s.obstacle && { obstacle: true })` from `attackPayload`.

Temporarily keep `useAttackWizard`/`RollStep` compiling: in `useAttackWizard` delete `toggleObstacle` and make the `steps` memo not use `state.obstacle` (`return shown;`) — Task 6 adds the per-target cover preview. In `RollStep.tsx` delete the `<label>…Перешкода…</label>` block and the now-unused `Checkbox` import.

- [ ] **Step 4: Update affected tests**

`grep -rn "obstacle\|TOGGLE_OBSTACLE" lib app components --include=*.test.ts --include=*.test.tsx` → in `attack-flow.test.ts` delete toggle tests; in `attack-mutation.test.ts` delete/replace cases that send `obstacle: true` (a request with `obstacle: true` must still succeed — Zod strips unknown keys — assert that instead of the penalty).

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm test:changed && pnpm exec tsc --noEmit -p .`
Expected: PASS, no TS errors.

- [ ] **Step 6: Commit**

```bash
pnpm lint --fix lib app types components/battle/wizards/attack
git add -A lib app types components/battle/wizards/attack
git commit -m "feat(battle): cover penalty is computed per target from the line of fire

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Ланцюговий постріл (`chainShot`)

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (новий прапорець)
- Modify: `lib/utils/abilities/registry/effects/flags.ts` (мітка/поля)
- Modify: `data/library/unit-abilities.ts` (будівник `chainShot`)
- Modify: `data/library/units/demons.ts` (Демониця)
- Create: `lib/utils/battle/attack/process/chain.ts`
- Modify: `lib/utils/battle/attack-phase/targets.ts`, `run-attack-phase.ts`
- Modify: `types/battle.ts` (`actionDetails.chainFromId?: string`)
- Modify: `lib/hooks/battle/useAttackWizard.ts` (`chain` у `describe`)
- Test: `lib/utils/battle/attack/process/__tests__/chain.test.ts`, `lib/utils/battle/attack-phase/__tests__/chain-shot.test.ts`

**Interfaces:**
- Consumes: `nearestTo` (Task 2), `attackMaxTargets` (Task 3), `attackRangeCells` (`grid/attack-reach.ts`).
- Produces: flag `{ kind: "flag", flag: "chainShot", jumps: number, percent: number }`; `export function nextChainTarget(args: { map: BattleMapConfig | null | undefined; order: BattleParticipant[]; attacker: BattleParticipant; attack: BattleAttack; from: BattleParticipant; hit: ReadonlySet<string> }): BattleParticipant | undefined`; `BattleAction.actionDetails.chainFromId?: string`.

- [ ] **Step 1: Add the flag**

`schema/effects.ts`, after the `multiTargetFalloff` line:

```ts
  z.object({ ...flagBase, flag: z.literal("chainShot"), jumps: z.number().int().min(1).max(5), percent: z.number().int().min(1).max(100) }),
```

`registry/effects/flags.ts`, after `multiTargetFalloff`:

```ts
  chainShot: {
    label: "Ланцюговий постріл",
    fields: [
      { name: "jumps", label: "Стрибків", input: "number" },
      { name: "percent", label: "% шкоди від попереднього", input: "number" },
    ],
    defaults: { jumps: 2, percent: 50 },
    describe: (e) => `після влучання постріл перескакує на найближчого ворога (${e.jumps}×), кожен стрибок — ${e.percent}% шкоди попереднього`,
  },
```

`data/library/unit-abilities.ts`, after `falloff`:

```ts
export const chainShot = (name: string, jumps = 2, percent = 50): Ability => ({
  id: "unit-chain-shot",
  name,
  description: `Після влучання постріл перескакує на найближчого ворога до ${jumps} разів; кожен стрибок — ${percent} % шкоди попереднього, промах обриває ланцюг.`,
  trigger: passive,
  effects: [{ kind: "flag", flag: "chainShot", jumps, percent }],
});
```

`data/library/units/demons.ts` Демониця: attack `{ name: "Ланцюговий постріл", type: "ranged", dice: "2d6+5", damageType: "necrotic" }` (без `targets`), `abilities: [chainShot("Ланцюговий постріл"), rangedRetaliation("Відповідний постріл")]`; import `chainShot` alongside the other builders.

Run: `pnpm test:run data/library lib/utils/abilities/registry lib/utils/abilities/schema` → PASS (if a registry test enumerates every flag, add `chainShot` there).

- [ ] **Step 2: Write the failing tests**

`lib/utils/battle/attack/process/__tests__/chain.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { nextChainTarget } from "../chain";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack, GridPoint } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Ланцюговий постріл", type: AttackType.RANGED, attackBonus: 8, damageDice: "2d6+5", damageType: "necrotic", range: "30/120" };

const at = (id: string, pos: GridPoint, side = ParticipantSide.ENEMY) => placed(id, { side, at: pos, hp: 20 });

const demoness = at("d", { x: 0, y: 0 }, ParticipantSide.ALLY);

const first = at("t", { x: 5, y: 5 });

const next = (order: ReturnType<typeof at>[], hit = new Set(["t"]), map: ReturnType<typeof testMap> | null = testMap(20)) => nextChainTarget({ map, order, attacker: demoness, attack: bow, from: first, hit })?.basicInfo.id;

describe("nextChainTarget", () => {
  it("найближчий ворог до попередньої цілі", () => {
    expect(next([demoness, first, at("far", { x: 12, y: 12 }), at("near", { x: 6, y: 7 })])).toBe("near");
  });

  it("не бере союзників і вже вражених", () => {
    expect(next([demoness, first, at("ally", { x: 6, y: 5 }, ParticipantSide.ALLY), at("done", { x: 5, y: 6 })], new Set(["t", "done"]))).toBeUndefined();
  });

  it("поза дальністю атаки від попередньої цілі — кінець ланцюга", () => {
    const short = { ...bow, range: "10" };

    expect(nextChainTarget({ map: testMap(20), order: [demoness, first, at("x", { x: 9, y: 5 })], attacker: demoness, attack: short, from: first, hit: new Set(["t"]) })).toBeUndefined();
  });

  it("без карти — перший ворог за ініціативою", () => {
    expect(next([demoness, first, placed("a"), placed("b")], new Set(["t"]), null)).toBe("a");
  });

  it("попередня ціль мертва — відстань від її клітинки", () => {
    const dead = { ...first, combatStats: { ...first.combatStats, currentHp: 0 } };

    expect(nextChainTarget({ map: testMap(20), order: [demoness, dead, at("near", { x: 6, y: 5 }), at("far", { x: 1, y: 1 })], attacker: demoness, attack: bow, from: dead, hit: new Set(["t"]) })?.basicInfo.id).toBe("near");
  });
});
```

`lib/utils/battle/attack-phase/__tests__/chain-shot.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Ланцюговий постріл", type: AttackType.RANGED, attackBonus: 30, damageDice: "1d6", damageType: "necrotic" };

const chain = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "chainShot", jumps: 2, percent: 50 }] });

const demoness = placed("d", { side: ParticipantSide.ALLY, at: { x: 0, y: 0 }, attacks: [bow], abilities: [chain] });

const foes = [placed("t", { at: { x: 5, y: 5 }, hp: 100 }), placed("n1", { at: { x: 6, y: 6 }, hp: 100 }), placed("n2", { at: { x: 8, y: 6 }, hp: 100 }), placed("n3", { at: { x: 9, y: 9 }, hp: 100 })];

const run = (order: BattleParticipant[], d20: number, rng = seq(0.9)) =>
  runAttackPhase({ battle: { initiativeOrder: order, currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "d", targetIds: ["t"], attackRoll: d20, damageRolls: [6] }, battleId: "b", userId: "u", isDM: true, rng, map: testMap(20) });

const strikes = (r: ReturnType<typeof run>) => r.allBattleActions.filter((e) => e.actionType === "attack");

describe("chain shot", () => {
  it("влучання — два стрибки на найближчих, chainFromId — попередня ціль", () => {
    const s = strikes(run([demoness, ...foes], 15));

    expect(s.map((e) => e.targets[0].participantId)).toEqual(["t", "n1", "n2"]);
    expect(s.map((e) => e.actionDetails.chainFromId)).toEqual([undefined, "t", "n1"]);
  });

  it("шкода падає 100 → 50 → 25 %", () => {
    const s = strikes(run([demoness, ...foes], 15, seq(0.99)));

    const dmg = s.map((e) => e.hpChanges.find((h) => h.participantId === e.targets[0].participantId)?.change ?? 0);

    expect(dmg[1]).toBeLessThanOrEqual(Math.ceil(dmg[0] / 2));
    expect(dmg[2]).toBeLessThanOrEqual(Math.ceil(dmg[1] / 2));
  });

  it("промах першого пострілу — без стрибків", () => {
    expect(strikes(run([demoness, ...foes], 1))).toHaveLength(1);
  });

  it("гравець не може обрати дві цілі", () => {
    expect(() =>
      runAttackPhase({ battle: { initiativeOrder: [demoness, ...foes], currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "d", targetIds: ["t", "n1"], attackRolls: [15, 15], damageRolls: [6, 6] }, battleId: "b", userId: "u", isDM: true, rng: seq(0.9), map: testMap(20) }),
    ).toThrow("Забагато цілей. Максимум: 1");
  });

  it("стрибки не отримують штраф перешкоди", () => {
    const blocker = placed("wall", { side: ParticipantSide.ALLY, at: { x: 7, y: 6 } });

    const s = strikes(run([demoness, ...foes, blocker], 15));

    expect(s.slice(1).some((e) => e.resultText.includes("перешкода"))).toBe(false);
  });
});
```

(`seq(0.9)` makes server d20 = 19 → hops hit; `attackBonus: 30` makes 15 hit regardless of AC. If damage dice are rolled server-side for hops, `seq` value controls them too.)

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test:run lib/utils/battle/attack/process/__tests__/chain.test.ts lib/utils/battle/attack-phase/__tests__/chain-shot.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `nextChainTarget`**

`lib/utils/battle/attack/process/chain.ts`:

```ts
import { isDormant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { attackRangeCells, cellsOf, footprintDistance, isOnMap, nearestTo } from "@/lib/utils/battle/grid";
import { modeSees } from "@/lib/utils/battle/modes/engine";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface ChainStep {
  map: BattleMapConfig | null | undefined;
  order: BattleParticipant[];
  attacker: BattleParticipant;
  attack: BattleAttack;
  /** Попередня ціль (може бути вже мертвою — стрибок іде від її клітинки). */
  from: BattleParticipant;
  hit: ReadonlySet<string>;
}

export function nextChainTarget({ map, order, attacker, attack, from, hit }: ChainStep): BattleParticipant | undefined {
  const range = attackRangeCells(attack.range);

  const inRange = (p: BattleParticipant) => !map || range === null || !isOnMap(from) || !isOnMap(p) || footprintDistance(cellsOf(from), cellsOf(p)) <= range;

  const candidates = order.filter(
    (p) => p.basicInfo.side !== attacker.basicInfo.side && !hit.has(p.basicInfo.id) && isTargetable(p) && !isDormant(p) && modeSees(map, attacker, p) && inRange(p),
  );

  return map ? nearestTo(from, candidates) : candidates[0];
}
```

Note: `isOnMap(from)` for a dead participant — check `occupiesCells` in `grid/occupancy.ts`; if it returns false for dead participants, use `from.battleData.position ? footprint(from.battleData.position, sizeOf(from))` instead of `cellsOf`/`isOnMap` for `from` (both helpers are in `occupancy.ts`/`geometry.ts`). The «попередня ціль мертва» test pins this.

- [ ] **Step 5: Wire it into the attack phase**

`targets.ts`: add `"chainShot"` to the `AttackFlags` generic list; compute `const chain = !expanded && isRanged && !isAoe && flags.chainShot.length > 0;` and pass `{ chain, onMap }` to `attackMaxTargets`; add `chain: boolean` and `chainPercent: number` (`flags.chainShot[0]?.percent ?? 100` / 100 → store as fraction) and `chainJumps: number` (`Math.max(0, ...flags.chainShot.map((f) => f.jumps))`) to `AttackTargets`. For chain set `volley = false` (single chosen target, full damage).

`run-attack-phase.ts`: add `"chainShot"` to the `findFlagsMany` list. Extract the body of the `for` loop (from `const strike =` through the retaliation/held-back block) into a local function so the chain can reuse it:

```ts
  const strikeAt = (target: BattleParticipant, i: number, opts: { serverD20: boolean; multiplier?: number; cover: boolean }) => {
    const chosenAt = expanded ? chosenTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id) : i;

    const strike = opts.serverD20 ? { value: rollDie(20, rng), serverRolled: true } : strikeD20(data, request, { index: i, chosenAt, expanded }, rng);

    // … existing body, using opts.multiplier for damageMultiplier, opts.cover for obstacle …

    return attackResult;
  };
```

Main loop calls `strikeAt(target, i, { serverD20: i >= serverRolledFrom, multiplier: targets.length > 1 ? fractions[i] : undefined, cover: obstacle })` and keeps the `if (!isActive(currentAttacker)) break;`. Retaliation stays inside `strikeAt` under `if (i === 0 || provoked)`.

After the main loop:

```ts
  if (chain && allBattleActions.find((e) => e.actionType === "attack")?.actionDetails.isHit) {
    const hit = new Set([targets[0].basicInfo.id]);

    let from = findParticipant(currentInitiativeOrder, targets[0].basicInfo.id) ?? targets[0];

    for (let jump = 1; jump <= chainJumps && isActive(currentAttacker); jump++) {
      const next = nextChainTarget({ map: input.map, order: currentInitiativeOrder, attacker: currentAttacker, attack, from, hit });

      if (!next) break;

      const result = strikeAt(next, jump, { serverD20: true, multiplier: chainPercent ** jump, cover: false });

      result.battleAction.actionDetails.chainFromId = from.basicInfo.id;
      hit.add(next.basicInfo.id);

      if (!result.success) break;

      from = findParticipant(currentInitiativeOrder, next.basicInfo.id) ?? next;
    }
  }
```

`damageFormula` must be non-null for chain so hops get server-rolled dice: `const damageFormula = (volley && (targets.length > 1 || expanded)) || chain ? heroAttackDamageParts(attacker, attack).formula : null;`.

`types/battle.ts`, inside `actionDetails` next to `attackKind`:

```ts
    /** Стрибок ланцюгового пострілу: від кого летить снаряд */
    chainFromId?: string;
```

`useAttackWizard.describe`: `chain` = `!!attacker && findFlags(withSelf(order, attacker), attacker.basicInfo.id, "chainShot").length > 0` (compute once next to `hitsAll`), pass `{ chain, onMap }`.

- [ ] **Step 6: Run tests**

Run: `pnpm test:related lib/utils/battle/attack-phase/run-attack-phase.ts lib/utils/battle/attack/process/chain.ts lib/utils/battle/attack-phase/targets.ts data/library/units/demons.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm lint --fix lib data types
git add -A lib data types
git commit -m "feat(battle): chain shot jumps to the nearest enemy, damage halves per jump

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Майстер атаки — перешкода на кожній цілі + картка результату з відповіді сервера

**Files:**
- Create: `lib/utils/battle/view/volley-results.ts` (+ export з `lib/utils/battle/view/index.ts`)
- Modify: `lib/utils/battle/flows/attack-flow.ts` (`AttackOutcomeSummary.splash?: boolean`)
- Modify: `lib/hooks/battle/useAttackWizard.ts`
- Modify: `components/battle/wizards/attack/TargetStep.tsx`, `RollStep.tsx`
- Modify: `components/battle/overlays/ActionResultCard.tsx` (позначка вторинної шкоди)
- Test: `lib/utils/battle/view/__tests__/volley-results.test.ts`

**Interfaces:**
- Consumes: `lineOfFire` (Task 1), `chainFromId` (Task 5).
- Produces: `export function volleyResults(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, after: BattleParticipant[]): AttackOutcomeSummary[]`; `view.cover: ReadonlySet<string>` (ids цілей зі штрафом) у `useAttackWizard`.

- [ ] **Step 1: Write the failing test** — `lib/utils/battle/view/__tests__/volley-results.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { volleyResults } from "../volley-results";

import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAction } from "@/types/battle";

const action = (i: number, over: Partial<BattleAction> & { target: string; hit?: boolean; crit?: boolean; hp?: [string, number][] }): BattleAction =>
  ({
    id: `x${i}`, battleId: "b", round: 1, actionIndex: i, timestamp: new Date(), actorId: over.actorId ?? "a", actorName: "A", actorSide: "ally",
    actionType: over.actionType ?? "attack", targets: [{ participantId: over.target, participantName: over.target }],
    actionDetails: { isHit: over.hit ?? true, isCritical: over.crit ?? false },
    resultText: "", hpChanges: (over.hp ?? []).map(([participantId, change]) => ({ participantId, participantName: participantId, oldHp: 50, newHp: 50 - change, change })),
    isCancelled: false,
  }) as BattleAction;

describe("volleyResults", () => {
  const after = [placed("t", { hp: 10 }), placed("n", { hp: 10 }), placed("s", { hp: 10 })];

  it("рядок на кожен удар атакуючого, включно з автоцілями, у порядку журналу", () => {
    const log = [action(1, { target: "t", hp: [["t", 8]] }), action(2, { target: "n", hit: false })];

    expect(volleyResults(log, new Set(), "a", after)).toEqual([
      { kind: "hit", targetId: "t", damage: 8, downed: false },
      { kind: "miss", targetId: "n", damage: 0, downed: false },
    ]);
  });

  it("вторинна шкода (хвиля, стріла сили) — окремий рядок splash", () => {
    const log = [action(1, { target: "t", crit: true, hp: [["t", 8], ["s", 4]] })];

    expect(volleyResults(log, new Set(), "a", after)).toEqual([
      { kind: "crit", targetId: "t", damage: 8, downed: false },
      { kind: "hit", targetId: "s", damage: 4, downed: false, splash: true },
    ]);
  });

  it("пропускає старі дії, відповідний удар і чужі дії", () => {
    const log = [action(1, { target: "t" }), action(2, { target: "a", actorId: "t", actionType: "retaliation" }), action(3, { target: "n", hp: [["n", 3]] })];

    expect(volleyResults(log, new Set([1]), "a", after).map((r) => r.targetId)).toEqual(["n"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/utils/battle/view/__tests__/volley-results.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `volleyResults`**

`lib/utils/battle/flows/attack-flow.ts`: add `splash?: boolean;` to `AttackOutcomeSummary` (with comment `/** Вторинна шкода (вогняна хвиля, стріла сили), не удар */`).

`lib/utils/battle/view/volley-results.ts`:

```ts
import type { AttackOutcomeSummary } from "@/lib/utils/battle/flows";
import { isUp } from "@/lib/utils/battle/participant/state";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export function volleyResults(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, after: BattleParticipant[]): AttackOutcomeSummary[] {
  const downed = (id: string) => {
    const p = after.find((x) => x.basicInfo.id === id);

    return !!p && !isUp(p);
  };

  const damageTo = (a: BattleAction, id: string) => a.hpChanges.filter((h) => h.participantId === id).reduce((sum, h) => sum + Math.max(0, h.change), 0);

  return log
    .filter((a) => !seen.has(a.actionIndex) && !a.isCancelled && a.actorId === attackerId && a.actionType === "attack")
    .sort((a, b) => a.actionIndex - b.actionIndex)
    .flatMap((a) => {
      const targetId = a.targets[0]?.participantId;

      if (!targetId) return [];

      const d = a.actionDetails;

      const kind = d.isHit === false || d.isCriticalFail ? "miss" : d.isCritical ? "crit" : "hit";

      const main: AttackOutcomeSummary = { kind, targetId, damage: damageTo(a, targetId), downed: downed(targetId) };

      const splash = [...new Set(a.hpChanges.filter((h) => h.change > 0 && h.participantId !== targetId && h.participantId !== attackerId).map((h) => h.participantId))].map(
        (id): AttackOutcomeSummary => ({ kind: "hit", targetId: id, damage: damageTo(a, id), downed: downed(id), splash: true }),
      );

      return [main, ...splash];
    });
}
```

Export it from `lib/utils/battle/view/index.ts` (check the barrel exists: `ls lib/utils/battle/view/index.ts`; if `flows` imports `view` there is a cycle — then import `AttackOutcomeSummary` with `import type` which ESLint `import/no-cycle` ignores only if configured; if it complains, move the `AttackOutcomeSummary` type to `lib/utils/battle/view/volley-results.ts` and re-export from `flows/attack-flow.ts`).

- [ ] **Step 4: Use it in the wizard**

`useAttackWizard.ts` `send`: replace the `results = state.strikes.map(...)` block with:

```ts
      const fromLog = volleyResults(log, seen, attacker.basicInfo.id, after);

      const results = fromLog.length > 0 ? fromLog : state.strikes.map((s) => ({ kind: "miss" as const, targetId: s.targetId, damage: 0, downed: false }));
```

`seen` is currently `Set<number>` of `actionIndex` — keep. Remove the now-unused `hpChanges` variable. `strikes` for the card: `results.length > 1 ? results.map((r) => ({ targetName: byId(r.targetId)?.basicInfo.name ?? "", kind: r.kind, damage: r.damage, downed: r.downed, ...(r.splash && { splash: true }) })) : undefined`. Total damage stays `results.reduce(...)`.

Per-target cover preview — add next to `hitsAll`:

```ts
  const map = scene.battle.map;

  const cover = useMemo(() => {
    if (!attacker || !attack || !map || attackKindOf(attack.type) !== AttackType.RANGED) return new Set<string>();

    return new Set(targets.filter((t) => lineOfFire(map, order, attacker, t).blocked).map((t) => t.basicInfo.id));
    // targets is derived from order every render; order covers it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacker, attack, map, order]);
```

In the `steps` memo: `return cover.has(s.targetId) ? [...shown, obstacleStep(shown.at(-1)?.after ?? 0)] : shown;` (add `cover` to deps). Add `cover` to `view`. Import `lineOfFire` from `@/lib/utils/battle/grid` (already imports `enemiesInReach` from there).

- [ ] **Step 5: UI**

`TargetStep.tsx` `trailing`:

```tsx
            trailing={
              <span className="ml-auto flex items-center gap-2">
                {view.cover.has(t.basicInfo.id) && <span className="text-xs text-[#e0a050]" title="Між стрільцем і ціллю є перешкода">🧱 ×0.5</span>}
                <HealthLabel participant={t} />
              </span>
            }
```

`RollStep.tsx` — where the checkbox was:

```tsx
      {view.cover.has(target.basicInfo.id) && <div className="mt-2 text-sm text-[#e0a050]">🧱 Перешкода на лінії · шкода ×0.5</div>}
```

`ActionResultCard.tsx` — in the strikes list (line ~34) render splash rows with a suffix: read the row markup and append ` · зачеплено` after the name when `s.splash`; add `splash?: boolean` to the strikes item type where it's declared (`grep -n "strikes" lib/hooks/battle/*.ts lib/utils/battle/view/*.ts components/battle/overlays/*.tsx` to find the type of `scene.result.show`'s `strikes`).

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test:changed && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm lint --fix lib components
git add -A lib components
git commit -m "feat(battle): attack wizard shows cover per target and results for every strike

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Карта — лінія пострілу показує перешкоду

**Files:**
- Modify: `types/battle.ts:252` (`trajectory.cover?: string[]`)
- Modify: `lib/utils/battle/grid/map-scene.ts` (`deriveTrajectory`)
- Modify: `components/battle/map/BattleMap.tsx` (~487-565)
- Test: `lib/utils/battle/grid/__tests__/map-scene.test.ts` (або наявний тест `deriveTrajectory`: `grep -rln "deriveTrajectory" lib --include=*.test.ts`)

**Interfaces:**
- Consumes: `lineOfFire` (Task 1).
- Produces: `BattleMapView["trajectory"]` = `{ fromId; targetId; to; kind; cover?: string[] } | null`; `cover` присутній лише для дальньої атаки з перешкодою (може бути `[]`, коли заважає стіна лабіринту).

- [ ] **Step 1: Write the failing test** (append to the `deriveTrajectory` test file, reusing its setup; if none exists create `lib/utils/battle/grid/__tests__/trajectory-cover.test.ts`):

```ts
import { describe, expect, it } from "vitest";

import { deriveTrajectory, targetMarks } from "@/lib/utils/battle/grid";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing", range: "80/320" };

describe("deriveTrajectory cover", () => {
  const archer = placed("a", { side: ParticipantSide.ALLY, at: { x: 0, y: 5 }, attacks: [bow] });

  const target = placed("t", { at: { x: 6, y: 5 } });

  const map = testMap();

  const run = (extra: ReturnType<typeof placed>[]) => {
    const participants = [archer, target, ...extra];

    return deriveTrajectory({ map, participants, marks: targetMarks(map, participants, archer, [bow]), current: archer }, { x: 6, y: 5 });
  };

  it("союзник на лінії — cover з його клітинкою", () => {
    expect(run([placed("ally", { side: ParticipantSide.ALLY, at: { x: 3, y: 5 } })])?.cover).toEqual(["3:5"]);
  });

  it("вільна лінія — без cover", () => {
    expect(run([])?.cover).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/utils/battle/grid/__tests__/trajectory-cover.test.ts`
Expected: FAIL (`cover` undefined in the first case).

- [ ] **Step 3: Implement**

`types/battle.ts:252`:

```ts
  /** cover — клітинки перешкоди на лінії пострілу (порожньо — заважає стіна лабіринту); відсутній — лінія вільна */
  trajectory?: { fromId: string; targetId: string; to: GridPoint; kind: "melee" | "ranged"; cover?: string[] } | null;
```

`map-scene.ts` `deriveTrajectory` (import `lineOfFire` from `./line-of-fire`):

```ts
  const kind = attackKindOf(attack.type) === AttackType.MELEE ? "melee" : "ranged";

  const line = kind === "ranged" ? lineOfFire(map, participants, current, target) : null;

  return { fromId: current.basicInfo.id, targetId: target.basicInfo.id, to: hover, kind, ...(line?.blocked && { cover: line.cells }) };
```

`BattleMap.tsx` around line 560 — inside the `{from && end && (<g …>` block: stroke colour `trajectory?.cover ? "#e0603a" : "#f2c14e"` for the line and the circle; before `</g>` add cover cells and a label:

```tsx
              {trajectory?.cover?.map((key) => {
                const c = cellCenter(parseCellKey(key));

                return <rect key={key} x={c.x - UNIT / 2} y={c.y - UNIT / 2} width={UNIT} height={UNIT} fill="rgba(224,96,58,.3)" stroke="#e0603a" strokeWidth={2} vectorEffect="non-scaling-stroke" />;
              })}
              {trajectory?.cover && <text x={end.x} y={end.y - UNIT * 0.45} textAnchor="middle" fontSize={UNIT * 0.32} fontWeight={700} fill="#ffd2b8" stroke="#3a1a10" strokeWidth={3} paintOrder="stroke">🧱 ×0.5</text>}
```

Before writing, confirm in `BattleMap.tsx`: `cellCenter` takes a `GridPoint` and returns svg coords of the cell centre, and `UNIT` is the svg size of one cell (`grep -n "const UNIT\|function cellCenter\|cellCenter =" components/battle/map/BattleMap.tsx`). If `cellCenter` is defined after a rotation transform (`fit.rotated`), reuse it exactly as the line does. Import `parseCellKey` from `@/lib/utils/battle/grid`.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm test:related lib/utils/battle/grid/map-scene.ts && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/grid components/battle/map types/battle.ts
git add -A lib/utils/battle/grid components/battle/map types/battle.ts
git commit -m "feat(battle-map): aim line highlights cover cells and the ×0.5 penalty

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: FX — снаряд стрибка від попередньої цілі, вторинні жертви, черга без втрат

**Files:**
- Modify: `lib/utils/battle/fx/types.ts` (`FxSpec.originId?: string`)
- Modify: `lib/utils/battle/fx/map-action.ts`
- Modify: `lib/utils/battle/fx/impact.ts` (`splashTargetIds`)
- Modify: `lib/utils/battle/fx/timing.ts` (`MAX_FX_BATCH = 16`), `lib/utils/battle/fx/queue.ts` (`MAX_FX_QUEUE = 32`, обрізка цілими діями)
- Modify: `lib/hooks/battle/useFxImpacts.ts` (`RECENT_ACTIONS` → `MAX_FX_BATCH`, вторинні цілі)
- Modify: `lib/hooks/battle/useBattleFxQueue.ts` (`RECENT_LOG` → `MAX_FX_QUEUE`)
- Modify: `components/battle/fx/runtime/anchors.ts:78` (`originId ?? actorId`)
- Test: `lib/utils/battle/fx/__tests__/map-action.test.ts`, `lib/utils/battle/fx/__tests__/queue.test.ts`, `lib/hooks/battle/__tests__/useFxImpacts.test.tsx`

**Interfaces:**
- Consumes: `actionDetails.chainFromId` (Task 5).
- Produces: `FxSpec.originId?: string`; `export function splashTargetIds(action: BattleAction, main: FxSpec | undefined): string[]` in `impact.ts`.

- [ ] **Step 1: Write the failing tests**

In `map-action.test.ts` (reuse its action builder; read it first) add:

```ts
  it("стрибок ланцюга летить від попередньої цілі", () => {
    const [main] = mapAction(attackAction({ attackKind: "ranged", chainFromId: "t" }, ["n1"])).filter((s) => s.archetype !== "dice");

    expect(main.originId).toBe("t");
  });

  it("вторинні жертви — окремий снаряд від першої цілі", () => {
    const specs = mapAction(attackAction({ attackKind: "ranged" }, ["t"], [{ participantId: "t", change: 8 }, { participantId: "s", change: 4 }]));

    const splash = specs.find((s) => s.key.endsWith(":splash"));

    expect(splash).toMatchObject({ archetype: "ranged", targetIds: ["s"], originId: "t", hit: true });
  });

  it("лікування й шкода самому актору — не сплеш", () => {
    const specs = mapAction(attackAction({ attackKind: "melee" }, ["t"], [{ participantId: "t", change: 8 }, { participantId: "a", change: -5 }, { participantId: "x", change: -3 }]));

    expect(specs.some((s) => s.key.endsWith(":splash"))).toBe(false);
  });
```

(If the file has no `attackAction(details, targetIds, hpChanges)` helper, write one at the top producing a `BattleAction` with `actionType: "attack"`, `actorId: "a"`, `actionDetails: { isHit: true, ...details }`, `hpChanges` filled with `oldHp: 50, newHp: 50 - change, participantName`.)

In `queue.test.ts` add:

```ts
  it("переповнена черга відкидає найстаріші дії цілком, голову не чіпає", () => {
    const spec = (actionId: string, n: number): FxSpec => ({ key: `${actionId}:${n}`, actionId, archetype: "ranged", element: "physical", actorId: "a", actorSide: "ally", targetIds: ["t"], hit: true, critical: false });

    const queue = [spec("head", 0), ...Array.from({ length: 20 }, (_, i) => [spec(`x${i}`, 0), spec(`x${i}`, 1)]).flat()];

    const trimmed = trimFxQueue(queue, MAX_FX_QUEUE);

    expect(trimmed[0].key).toBe("head:0");
    expect(trimmed.length).toBeLessThanOrEqual(MAX_FX_QUEUE);

    const kept = new Set(trimmed.slice(1).map((s) => s.actionId));

    for (const id of kept) expect(trimmed.filter((s) => s.actionId === id)).toHaveLength(2);
  });
```

In `useFxImpacts.test.tsx` (read existing setup) add a case: last action = attack on `t` with `hpChanges` for `t` (8) and `s` (4) → `impactFor("s")` returns an impact with the same `actionId` as `t`'s.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test:run lib/utils/battle/fx lib/hooks/battle/__tests__/useFxImpacts.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`fx/types.ts` `FxSpec`, after `actorSide`:

```ts
  /** Звідки летить снаряд, якщо не від актора (стрибок ланцюга, сплеш від цілі). */
  originId?: string;
```

`fx/impact.ts`:

```ts
/** Жертви дії, яких немає серед цілей головного FX: вогняна хвиля, стріла сили. */
export function splashTargetIds(action: BattleAction, main: FxSpec | undefined): string[] {
  if (!main || (main.archetype !== "melee" && main.archetype !== "ranged")) return [];

  const ids = action.hpChanges.filter((h) => h.change > 0 && h.participantId !== action.actorId && !main.targetIds.includes(h.participantId)).map((h) => h.participantId);

  return [...new Set(ids)];
}
```

(import `type BattleAction` from `@/types/battle`.)

`fx/map-action.ts` `primary()`: in the attack branch add `...(d.chainFromId && { originId: d.chainFromId })`. In `mapAction`:

```ts
  const splashIds = splashTargetIds(action, main ?? undefined);

  const splash: FxSpec[] =
    main && splashIds.length > 0 ? [{ ...main, key: `${action.id}:splash`, archetype: "ranged", targetIds: splashIds, originId: main.targetIds[0], critical: false }] : [];

  return [...dice, ...(main ? [main] : []), ...splash, ...deaths];
```

(import `splashTargetIds` from `./impact`; check `impact.ts` doesn't import `map-action.ts` — it imports `./archetypes` only.)

`components/battle/fx/runtime/anchors.ts:78`: `const actorEl = findAnchor(spec.originId ?? spec.actorId, root);`.

`fx/timing.ts`: `export const MAX_FX_BATCH = 16;`.

`fx/queue.ts`:

```ts
export const MAX_FX_QUEUE = 32;

/** Голова може саме грати — лишається; решта обрізається найстарішими діями цілком, щоб залп не втратив середину. */
export function trimFxQueue(queue: FxSpec[], max: number): FxSpec[] {
  if (queue.length <= max) return queue;

  const [head, ...rest] = queue;

  const groupOf = (s: FxSpec) => s.actionId ?? s.key;

  let tail = rest;

  while (tail.length > max - 1) {
    const oldest = groupOf(tail[0]);

    const dropped = tail.filter((s) => groupOf(s) !== oldest);

    tail = dropped.length === tail.length ? tail.slice(1) : dropped;
  }

  return [head, ...tail];
}
```

and in `advanceFxQueue` return `queue: trimFxQueue(queue, MAX_FX_QUEUE)` (remove the old inline trimming and its comment). Export `trimFxQueue` through the existing `lib/utils/battle/fx/index.ts` barrel if `queue.ts` exports are re-exported there.

`useFxImpacts.ts`: delete `RECENT_ACTIONS` and its comment, use `.slice(-MAX_FX_BATCH)` (import from `@/lib/utils/battle/fx`; export it from the barrel if missing). In the `actions.forEach` loop, after the main-target loop:

```ts
      for (const id of splashTargetIds(action, main)) {
        const impact = impactFor(main && { ...main, targetIds: [id] }, id);

        if (impact) result.set(id, hidden ? impact : { ...impact, actionId: action.id, waitMs: waitFrom(i) });
      }
```

`useBattleFxQueue.ts`: `RECENT_LOG` → use `MAX_FX_QUEUE` (import), delete the local constant.

- [ ] **Step 4: Run tests**

Run: `pnpm test:related lib/utils/battle/fx/map-action.ts lib/utils/battle/fx/queue.ts lib/utils/battle/fx/impact.ts lib/hooks/battle/useFxImpacts.ts`
Expected: PASS. Existing queue tests that asserted trimming to 12 specs must be updated to the new constant/semantics.

- [ ] **Step 5: Commit**

```bash
pnpm lint --fix lib/utils/battle/fx lib/hooks/battle components/battle/fx
git add -A lib/utils/battle/fx lib/hooks/battle components/battle/fx
git commit -m "feat(battle-fx): chain hops fly from the previous target, splash victims animate, volleys are not trimmed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Документація, повний прогін, battle-sweep, браузер

**Files:**
- Modify: `docs/architecture/battle.md` (розділ атаки: лінія вогню, ланцюг, розщеплення, `attackMaxTargets`, FX сплеш/originId)
- Modify: `docs/architecture/map-modes.md` (новий хук `lineBlocked`)
- Modify: `docs/STATUS.md`

- [ ] **Step 1: Docs** — українською, коротко, у стилі наявних розділів:
  - `battle.md`: «Перешкода рахується сервером (`grid/line-of-fire.ts`) для кожної цілі дальньої атаки: учасник з HP > 0 (не в повітрі), `wall`/`barrier`, `blocked`, стіна режиму (`lineBlocked`). Не для ближніх, стрибків ланцюга, вторинних цілей пробивного. Ліміт цілей — `attack/max-targets.ts` (клієнт і сервер). Ланцюг — прапорець `chainShot` (`attack/process/chain.ts`), розщеплення — ближня `maxTargets > 1` (`attack/process/cleave.ts`), автоцілі кидає сервер. FX: `originId`, сплеш для вторинних жертв, черга обрізається цілими діями.»
  - `map-modes.md`: рядок про `lineBlocked` у списку хуків рушія.
  - `STATUS.md`: пункт «Механіка стрільби — гілка `feat/ranged-combat`, після деплою перезасіяти юнітів (Демониця `chainShot`)».

- [ ] **Step 2: Full verification**

Run: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test:run`
Expected: all green. Fix any failures before continuing.

- [ ] **Step 3: battle-sweep on a prod copy**

```bash
./scripts/db/prodcopy-db.sh
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep
```

Expected: exit 0; read `<tmp>/battle-sweep/battle-sweep.md` for errors in attacks (rejections «Забагато цілей», crashes). Note: prod copy has the old Демониця data (без `chainShot`) — the sweep checks the rest; chain is covered by unit tests and the browser check.

- [ ] **Step 4: Browser check** (local `pnpm dev` against a local DB with the library reseeded from this branch — use the project's library seed script, `grep -n "seed" package.json`; follow memory rule: mixed races on both sides, delete test battles afterwards):
  - Демониця: одна ціль → снаряд, далі стрибки від цілі до найближчих; картка результату показує всі цілі.
  - Цербер поруч із трьома ворогами: три удари, анімація на кожному.
  - Лучник через союзника і через стіну: позначка 🧱 у майстрі, червона лінія і клітинки на карті, у журналі «🧱 перешкода».
  - «Стріла сили» і вогняна хвиля: вторинна жертва отримує снаряд, число зʼявляється після влучання.

- [ ] **Step 5: Commit docs**

```bash
git add docs
git commit -m "docs(battle): ranged combat — cover, chain shot, cleave

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: End of branch** — run `/simplify` on the branch diff, then the final review; merge per `superpowers:finishing-a-development-branch`. In the merge commit `git mv` spec and plan to `docs/archive/superpowers/`. After deploy: reseed library units on prod so Демониця gets `chainShot` (check whether participants of running battles read abilities from their snapshot — then only new battles get it).
