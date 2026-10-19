import { describe, expect, it } from "vitest";

import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { hazardHit, hazardOnMove, hazardUnder, reachable } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant, GridPoint, TerrainCell } from "@/types/battle";

const fire: TerrainCell = { kind: "hazard", label: "Вогонь", damage: { amount: 5, type: "fire" } };

const acid: TerrainCell = { kind: "hazard", label: "Кислота", damage: { dice: "2d6", type: "acid" } };

const plain: TerrainCell = { kind: "hazard", label: "Калюжа" };

const map = (terrain: Record<string, TerrainCell>): BattleMapConfig => ({ cols: 10, rows: 10, background: null, opacity: 0.3, terrain });

const base = createMockParticipant();

const at = (position: GridPoint, gridSize = 1, over: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => ({
  ...base,
  combatStats: { ...base.combatStats, gridSize, speed: 30 },
  battleData: { ...base.battleData, position, ...over },
});

describe("hazardUnder", () => {
  it("знаходить небезпеку з шкодою під footprint; без шкоди — null", () => {
    expect(hazardUnder(map({ "1:1": fire }), at({ x: 1, y: 1 }))).toEqual(fire);
    expect(hazardUnder(map({ "1:1": plain }), at({ x: 1, y: 1 }))).toBeNull();
    expect(hazardUnder(map({ "1:1": fire }), at({ x: 0, y: 0 }))).toBeNull();
    expect(hazardUnder(map({ "1:1": fire }), at({ x: 0, y: 0 }), { x: 1, y: 1 })).toEqual(fire);
  });

  it("велика істота на двох небезпеках — найсильніша (середнє кубиків проти числа)", () => {
    expect(hazardUnder(map({ "1:1": fire, "2:2": acid }), at({ x: 1, y: 1 }, 2))).toEqual(acid);
  });
});

describe("hazardHit", () => {
  it("завдає шкоди, пише повідомлення й позначає раунд", () => {
    const hit = hazardHit(at({ x: 1, y: 1 }), fire, 2, [], () => 0);

    expect(hit?.damage).toBe(5);
    expect(hit?.message).toBe("Тест: 5 fire шкоди від «Вогонь»");
    expect(hit?.participant.combatStats.currentHp).toBe(15);
    expect(hit?.participant.battleData.hazardHitRound).toBe(2);
  });

  it("кидає кубики", () => {
    expect(hazardHit(at({ x: 1, y: 1 }), acid, 1, [], () => 0.99)?.damage).toBe(12);
  });

  it("вже отримав шкоду в цьому раунді — null", () => {
    expect(hazardHit(at({ x: 1, y: 1 }, 1, { hazardHitRound: 2 }), fire, 2, [], () => 0)).toBeNull();
  });

  it("небезпека без damage — null", () => {
    expect(hazardHit(at({ x: 1, y: 1 }), plain, 1, [], () => 0)).toBeNull();
  });

  it("опір вогню зменшує шкоду", () => {
    const resistant = grantPassive(at({ x: 1, y: 1 }), [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }]);

    const hit = hazardHit(resistant, { ...fire, damage: { amount: 10, type: "fire" } }, 1, [resistant], () => 0);

    expect(hit?.damage).toBe(5);
  });

  it("смертельна шкода переводить у непритомність", () => {
    const weak = { ...at({ x: 1, y: 1 }), combatStats: { ...at({ x: 1, y: 1 }).combatStats, currentHp: 3 } };

    expect(hazardHit(weak, fire, 1, [], () => 0)?.participant.combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
  });
});

describe("reachable з avoid", () => {
  it("обходить клітинки avoid; без обходу клітинка недосяжна за ту ж вартість", () => {
    const mover = at({ x: 0, y: 1 });

    const wall: BattleMapConfig = { ...map({}), blocked: ["1:0", "1:2"] };

    expect(reachable(wall, [mover], mover, 2).get("2:1")).toBe(2);
    expect(reachable(wall, [mover], mover, 2, { avoid: new Set(["1:1"]) }).get("2:1")).toBeUndefined();
  });
});

describe("hazardOnMove", () => {
  it("кінець руху на небезпеці, де не стояв, — вхід", () => {
    const m = map({ "2:0": fire });

    const mover = at({ x: 0, y: 0 });

    expect(hazardOnMove(m, [mover], mover, { x: 2, y: 0 }, 2)).toEqual(fire);
  });

  it("лишається на тій самій небезпеці (велика істота зсувається) — не вхід", () => {
    const m = map({ "1:0": fire });

    const mover = at({ x: 0, y: 0 }, 2);

    expect(hazardOnMove(m, [mover], mover, { x: 1, y: 0 }, 1)).toBeNull();
  });

  it("прохід повз, коли є обхід тієї ж вартості, — без шкоди", () => {
    const m = map({ "1:0": fire });

    const mover = at({ x: 0, y: 0 });

    expect(hazardOnMove(m, [mover], mover, { x: 2, y: 0 }, 2)).toBeNull();
  });

  it("прохід через небезпеку без обходу тієї ж вартості — найсильніша небезпека в радіусі cost", () => {
    const m: BattleMapConfig = { ...map({ "1:1": fire, "0:2": acid }), blocked: ["1:0", "1:2"] };

    const mover = at({ x: 0, y: 1 });

    // 0:2 не на шляху, але в радіусі 2 — консервативно береться найсильніша
    expect(hazardOnMove(m, [mover], mover, { x: 2, y: 1 }, 2)).toEqual(acid);
  });

  it("небезпека без damage не рахується", () => {
    const m: BattleMapConfig = { ...map({ "1:1": plain }), blocked: ["1:0", "1:2"] };

    const mover = at({ x: 0, y: 1 });

    expect(hazardOnMove(m, [mover], mover, { x: 2, y: 1 }, 2)).toBeNull();
  });
});
