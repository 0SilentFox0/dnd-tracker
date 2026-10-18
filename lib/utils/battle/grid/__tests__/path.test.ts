import { describe, expect, it } from "vitest";

import { canStand } from "../occupancy";
import { movementBudget, reachable, remainingMovement } from "../path";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 6, rows: 3, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint, side: string = ParticipantSide.ALLY, extra: Partial<BattleParticipant["combatStats"]> = {}): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...p.combatStats, speed: 30, ...extra },
    battleData: { ...p.battleData, position },
  };
}

describe("рух по сітці", () => {
  it("бюджет = speed / 5 мінус пройдене", () => {
    const hero = at("h", { x: 0, y: 0 });

    expect(movementBudget(hero)).toBe(6);
    expect(remainingMovement({ ...hero, battleData: { ...hero.battleData, movementUsed: 4 } })).toBe(2);
  });

  it("ворожа стіна блокує, союзник прохідний, але стати на нього не можна", () => {
    const hero = at("h", { x: 0, y: 1 });

    const wall = [0, 1, 2].map((y) => at(`e${y}`, { x: 2, y }, ParticipantSide.ENEMY));

    const reach = reachable(map, [hero, ...wall], hero, 6);

    expect(reach.has("3:1")).toBe(false);

    const ally = at("a", { x: 1, y: 1 });

    const reach2 = reachable(map, [hero, ally], hero, 6);

    expect(reach2.get("2:1")).toBe(2);
    expect(reach2.has("1:1")).toBe(false);
  });

  it("мертвий ворог не блокує", () => {
    const hero = at("h", { x: 0, y: 1 });

    const dead = at("d", { x: 1, y: 1 }, ParticipantSide.ENEMY, { status: CombatStatus.DEAD, currentHp: 0 });

    expect(canStand(map, [hero, dead], hero, { x: 1, y: 1 })).toBe(true);
  });

  it("2×2 не виходить за край і не стає на чужу клітинку", () => {
    const ogre = at("o", { x: 0, y: 0 }, ParticipantSide.ENEMY, { gridSize: 2 });

    expect(canStand(map, [ogre], ogre, { x: 5, y: 0 })).toBe(false);
    expect(canStand(map, [ogre], ogre, { x: 4, y: 1 })).toBe(true);

    const hero = at("h", { x: 3, y: 1 });

    expect(canStand(map, [ogre, hero], ogre, { x: 2, y: 0 })).toBe(false);
  });

  it("immobilized — бюджет 0", () => {
    const hero = at("h", { x: 0, y: 0 });

    const rooted: BattleParticipant = {
      ...hero,
      battleData: {
        ...hero.battleData,
        activeEffects: [makeEffect("r", { name: "Коріння", type: "condition", duration: 1, effects: [{ type: "immobilized", value: 0 }] })],
      },
    };

    expect(movementBudget(rooted)).toBe(0);
  });

  it("2×2: власні клітинки не блокують і не зникають з позначок руху", () => {
    const ogre = at("o", { x: 1, y: 0 }, ParticipantSide.ALLY, { gridSize: 2, speed: 30 });

    const marks = reachable(map, [ogre], ogre, 1);

    expect(marks.get("2:0")).toBe(1);
    expect(marks.get("1:1")).toBe(1);
    expect(marks.get("0:0")).toBe(1);
    expect(marks.has("1:0")).toBe(false);
  });
});
