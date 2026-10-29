import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { CombatStatus } from "@/lib/constants/battle";
import { mapTerrainMutation, mapTerrainSchema } from "@/lib/server/battles/mutations/map-terrain/map-terrain-mutation";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3, blocked: ["9:0"] };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const ctx = (over: Parameters<typeof context>[0] = {}, m: BattleMapConfig | null = map) => {
  const base = context({ participants: [at(hero, { x: 0, y: 0 }), at(goblin, { x: 5, y: 2 })], isDM: true, ...over });

  return { ...base, scene: { ...base.scene, round: 3 }, meta: { ...base.meta, map: m } };
};

describe("map-terrain schema", () => {
  it("клітинки x:y 1..400; барʼєр потребує раундів 1..20; підпис ≤ 60", () => {
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "wall" } }).success).toBe(true);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: null }).success).toBe(true);
    expect(mapTerrainSchema.safeParse({ cells: [], terrain: null }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: Array(401).fill("1:1"), terrain: null }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: ["a"], terrain: null }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "barrier" } }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "barrier", rounds: 21 } }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "barrier", rounds: 2 } }).success).toBe(true);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "hazard", label: "x".repeat(61) } }).success).toBe(false);
  });
});

describe("map-terrain mutation", () => {
  it("ставить непрохідне й небезпеку в карту сцени, без подій і без змін учасників", () => {
    const c = ctx();

    const out = mapTerrainMutation(c, { cells: ["2:2", "3:3", "2:2"], terrain: { kind: "wall" } });

    expect(out.scene?.map?.terrain).toEqual({ "2:2": { kind: "wall" }, "3:3": { kind: "wall" } });
    expect(out.events).toEqual([]);
    expect(out.participants).toBe(c.participants);

    const fire = mapTerrainMutation(ctx(), { cells: ["5:2"], terrain: { kind: "hazard", label: "Вогняна стіна" } });

    expect(fire.scene?.map?.terrain).toEqual({ "5:2": { kind: "hazard", label: "Вогняна стіна" } });
  });

  it("барʼєр на N раундів діє до кінця раунду round + N − 1", () => {
    const out = mapTerrainMutation(ctx(), { cells: ["4:4"], terrain: { kind: "barrier", rounds: 1 } });

    expect(out.scene?.map?.terrain).toEqual({ "4:4": { kind: "barrier", untilRound: 3 } });

    const longer = mapTerrainMutation(ctx(), { cells: ["4:4"], terrain: { kind: "barrier", rounds: 3 } });

    expect(longer.scene?.map?.terrain?.["4:4"].untilRound).toBe(5);
  });

  it("непрохідне чи барʼєр пропускає клітинки живих учасників (і великої істоти), решту ставить", () => {
    const out = mapTerrainMutation(ctx(), { cells: ["0:0", "1:0", "5:2"], terrain: { kind: "wall" } });

    expect(out.scene?.map?.terrain).toEqual({ "1:0": { kind: "wall" } });
    expect(out.response).toEqual({ skipped: ["0:0", "5:2"] });

    const ogre = { ...at(goblin, { x: 5, y: 2 }), combatStats: { ...goblin.combatStats, gridSize: 2 } };

    const big = mapTerrainMutation(ctx({ participants: [at(hero, { x: 0, y: 0 }), ogre] }), { cells: ["6:3", "7:3"], terrain: { kind: "barrier", rounds: 1 } });

    expect(big.scene?.map?.terrain).toEqual({ "7:3": { kind: "barrier", untilRound: 3 } });
    expect(big.response).toEqual({ skipped: ["6:3"] });
  });

  it("відмова лише коли не лишилось жодної клітинки", () => {
    const reject = expect.objectContaining({ code: "action_rejected", message: REJECT.mapOccupied });

    expect(() => mapTerrainMutation(ctx(), { cells: ["0:0"], terrain: { kind: "wall" } })).toThrow(reject);
    expect(() => mapTerrainMutation(ctx(), { cells: ["0:0", "5:2", "9:0"], terrain: { kind: "barrier", rounds: 1 } })).toThrow(reject);
  });

  it("без пропусків відповіді немає", () => {
    expect(mapTerrainMutation(ctx(), { cells: ["2:2"], terrain: { kind: "wall" } }).response).toBeUndefined();
  });

  it("неканонічний ключ нормалізується", () => {
    const out = mapTerrainMutation(ctx(), { cells: ["02:002", "2:2"], terrain: { kind: "wall" } });

    expect(out.scene?.map?.terrain).toEqual({ "2:2": { kind: "wall" } });
    expect(() => mapTerrainMutation(ctx(), { cells: ["00:00"], terrain: { kind: "wall" } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("мертвий учасник клітинку не займає", () => {
    const dead = { ...at(goblin, { x: 5, y: 2 }), combatStats: { ...goblin.combatStats, status: CombatStatus.DEAD } };

    const out = mapTerrainMutation(ctx({ participants: [at(hero, { x: 0, y: 0 }), dead] }), { cells: ["5:2"], terrain: { kind: "wall" } });

    expect(out.scene?.map?.terrain?.["5:2"]).toEqual({ kind: "wall" });
  });

  it("поза картою або неігрова клітинка пропускається; лише такі — відмова", () => {
    expect(() => mapTerrainMutation(ctx(), { cells: ["10:0"], terrain: { kind: "wall" } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(() => mapTerrainMutation(ctx(), { cells: ["9:0"], terrain: { kind: "hazard" } })).toThrow(expect.objectContaining({ code: "action_rejected" }));

    const out = mapTerrainMutation(ctx(), { cells: ["9:0", "8:0", "10:0"], terrain: { kind: "hazard", label: "Лава" } });

    expect(out.scene?.map?.terrain).toEqual({ "8:0": { kind: "hazard", label: "Лава" } });
    expect(out.response).toEqual({ skipped: ["9:0", "10:0"] });
  });

  it("небезпека з шкодою: кубики й тип; некоректні кубики — відмова схеми", () => {
    const damage = { dice: "2d6+1", type: "fire" };

    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "hazard", damage } }).success).toBe(true);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "hazard", damage: { dice: "2к6", type: "fire" } } }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "hazard", damage: { dice: "99999999d6", type: "fire" } } }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "hazard", damage: { dice: "2d6+9999", type: "fire" } } }).success).toBe(false);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "hazard", damage: { dice: "20d100+100", type: "fire" } } }).success).toBe(true);
    expect(mapTerrainSchema.safeParse({ cells: ["1:1"], terrain: { kind: "hazard", damage: { dice: "2d6", type: "banana" } } }).success).toBe(false);

    const out = mapTerrainMutation(ctx(), { cells: ["3:3"], terrain: { kind: "hazard", label: "Лава", damage } });

    expect(out.scene?.map?.terrain?.["3:3"]).toEqual({ kind: "hazard", label: "Лава", damage });
  });

  it("небезпека на клітинці учасника дозволена", () => {
    const out = mapTerrainMutation(ctx(), { cells: ["0:0"], terrain: { kind: "hazard" } });

    expect(out.scene?.map?.terrain?.["0:0"]).toEqual({ kind: "hazard" });
  });

  it("null стирає місцевість", () => {
    const withWall = { ...map, terrain: { "2:2": { kind: "wall" as const }, "3:3": { kind: "hazard" as const } } };

    const out = mapTerrainMutation(ctx({}, withWall), { cells: ["2:2"], terrain: null });

    expect(out.scene?.map?.terrain).toEqual({ "3:3": { kind: "hazard" } });
  });

  it("бій без карти — відмова", () => {
    expect(() => mapTerrainMutation(ctx({}, null), { cells: ["1:1"], terrain: { kind: "wall" } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });
});
