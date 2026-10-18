import { describe, expect, it } from "vitest";

import { moveMarks, targetMarks } from "../map-view";

import { AttackType, GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 10, rows: 5, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint, side: string): BattleParticipant {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] }, combatStats: { ...p.combatStats, speed: 10 }, battleData: { ...p.battleData, position } };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

describe("підсвітка карти", () => {
  it("рух — клітинки в межах залишку руху", () => {
    const hero = at("h", { x: 0, y: 0 }, ParticipantSide.ALLY);

    const marks = moveMarks(map, [hero], hero);

    expect(marks.get("2:2")).toBe(2);
    expect(marks.has("3:0")).toBe(false);
  });

  it("цілі — сусід доступний, далекий ворог ні, союзник не підсвічується", () => {
    const hero = at("h", { x: 0, y: 0 }, ParticipantSide.ALLY);

    const near = at("e1", { x: 1, y: 0 }, ParticipantSide.ENEMY);

    const far = at("e2", { x: 5, y: 0 }, ParticipantSide.ENEMY);

    const ally = at("a", { x: 0, y: 1 }, ParticipantSide.ALLY);

    const marks = targetMarks(map, [hero, near, far, ally], hero, sword);

    expect(marks.get("1:0")).toBe("target");
    expect(marks.get("5:0")).toBe("invalid-target");
    expect(marks.has("0:1")).toBe(false);
  });
});
