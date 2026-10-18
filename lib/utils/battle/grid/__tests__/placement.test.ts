import { describe, expect, it } from "vitest";

import { cellDistance } from "../geometry";
import { placeParticipants } from "../placement";

import { GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 10, rows: 5, background: null, opacity: 0.3 };

function p(id: string, side: string, battleData: Partial<BattleParticipant["battleData"]> = {}, gridSize?: number): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...b.combatStats, ...(gridSize && { gridSize }) },
    battleData: { ...b.battleData, ...battleData },
  };
}

describe("авторозстановка", () => {
  it("союзники ліворуч, вороги праворуч, без перекриттів", () => {
    const out = placeParticipants(map, [p("a1", ParticipantSide.ALLY), p("a2", ParticipantSide.ALLY), p("e1", ParticipantSide.ENEMY, {}, 2)]);

    const [a1, a2, e1] = out.map((x) => x.battleData.position!);

    expect(a1.x).toBe(0);
    expect(a2.x).toBe(0);
    expect(a1.y).not.toBe(a2.y);
    expect(e1.x).toBe(8);
  });

  it("вже розставлених і резерв не чіпає", () => {
    const placed = p("a1", ParticipantSide.ALLY, { position: { x: 4, y: 4 } });

    const reserve = p("r", ParticipantSide.ENEMY, { reserved: true });

    const out = placeParticipants(map, [placed, reserve]);

    expect(out[0]).toBe(placed);
    expect(out[1].battleData.position).toBeUndefined();
  });

  it("призваний стає поруч із призивачем", () => {
    const summoner = p("s", ParticipantSide.ALLY, { position: { x: 5, y: 2 } });

    const out = placeParticipants(map, [summoner, p("wolf", ParticipantSide.ALLY, { summonedBy: "s" })]);

    expect(cellDistance(map.grid, out[1].battleData.position!, { x: 5, y: 2 })).toBe(1);
  });
});
