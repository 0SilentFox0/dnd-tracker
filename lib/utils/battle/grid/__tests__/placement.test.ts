import { describe, expect, it } from "vitest";

import { cellDistance } from "../geometry";
import { placeParticipants } from "../placement";

import { ParticipantSide } from "@/lib/constants/battle";
import { CombatStatus } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

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

    const [a1, a2, e1] = out.map((x) => x.battleData.position as GridPoint);

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

    expect(cellDistance(out[1].battleData.position as GridPoint, { x: 5, y: 2 })).toBe(1);
  });

  it("непритомний займає клітинку, мертвий — ні", () => {
    const down = { ...p("d", ParticipantSide.ALLY, { position: { x: 0, y: 2 } }), combatStats: { ...p("x", "ally").combatStats, status: CombatStatus.UNCONSCIOUS, currentHp: 0 } };

    const dead = { ...p("k", ParticipantSide.ALLY, { position: { x: 0, y: 1 } }), combatStats: { ...p("x", "ally").combatStats, status: CombatStatus.DEAD, currentHp: 0 } };

    const out = placeParticipants(map, [down, dead, p("n1", ParticipantSide.ALLY, { position: { x: 0, y: 1 } }), p("n2", ParticipantSide.ALLY, { position: { x: 0, y: 2 } })]);

    expect(out[2].battleData.position).toEqual({ x: 0, y: 1 });
    expect(out[3].battleData.position).not.toEqual({ x: 0, y: 2 });
    expect(out[3].battleData.position).toBeDefined();
  });

  it("позиція поза картою після зменшення — розставляється заново поблизу", () => {
    const out = placeParticipants(map, [p("a", ParticipantSide.ALLY, { position: { x: 14, y: 2 } })]);

    const pos = out[0].battleData.position as GridPoint;

    expect(pos.x).toBe(9);
    expect(pos.y).toBeLessThan(map.rows);
  });

  it("перекриття після воскресіння — пізніший зсувається", () => {
    const first = p("a", ParticipantSide.ALLY, { position: { x: 3, y: 2 } });

    const second = p("b", ParticipantSide.ALLY, { position: { x: 3, y: 2 } });

    const out = placeParticipants(map, [first, second]);

    expect(out[0]).toBe(first);
    expect(cellDistance(out[1].battleData.position as GridPoint, { x: 3, y: 2 })).toBe(1);
  });
});
