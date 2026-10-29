import { describe, expect, it } from "vitest";

import { isPlayable } from "../geometry";
import { canStand } from "../occupancy";
import { reachable } from "../path";
import { applyTerrain, applyTerrainDiff, diffTerrain, hazardCells, pruneExpiredTerrain, threatCells } from "../terrain";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const base: BattleMapConfig = { cols: 10, rows: 10, background: null, opacity: 0.3 };

const melee: BattleAttack = { name: "Меч", type: "melee", attackBonus: 3, damageDice: "1d8", damageType: "slashing" };

const bow: BattleAttack = { name: "Лук", type: "ranged", attackBonus: 3, damageDice: "1d8", damageType: "piercing", range: "80/320" };

function p(id: string, side: string, position: GridPoint | undefined, extra: { attacks?: BattleAttack[]; size?: number } = {}): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...b.combatStats, speed: 30, ...(extra.size && { gridSize: extra.size }) },
    battleData: { ...b.battleData, position, attacks: extra.attacks ?? [melee] },
  };
}

describe("hazardCells", () => {
  const map: BattleMapConfig = {
    ...base,
    terrain: { "1:1": { kind: "hazard", label: "Вогонь" }, "2:2": { kind: "wall" }, "3:3": { kind: "hazard" } },
  };

  it("hazardCells — лише небезпеки", () => {
    expect([...hazardCells(map)].sort()).toEqual(["1:1", "3:3"]);
    expect(hazardCells(base).size).toBe(0);
  });
});

describe("isPlayable з місцевістю", () => {
  it("wall і barrier непрохідні, hazard — прохідна", () => {
    const map: BattleMapConfig = {
      ...base,
      terrain: { "1:1": { kind: "wall" }, "2:2": { kind: "barrier", untilRound: 3 }, "3:3": { kind: "hazard" } },
    };

    expect(isPlayable(map, { x: 1, y: 1 })).toBe(false);
    expect(isPlayable(map, { x: 2, y: 2 })).toBe(false);
    expect(isPlayable(map, { x: 3, y: 3 })).toBe(true);
    expect(isPlayable(map, { x: 4, y: 4 })).toBe(true);
  });

  it("кеш за обʼєктом terrain: нова карта — новий набір", () => {
    const first: BattleMapConfig = { ...base, terrain: { "1:1": { kind: "wall" } } };

    expect(isPlayable(first, { x: 1, y: 1 })).toBe(false);

    const second = applyTerrain(first, ["1:1"], null);

    expect(isPlayable(second, { x: 1, y: 1 })).toBe(true);
    expect(isPlayable(first, { x: 1, y: 1 })).toBe(false);
  });

  it("рух і стояння обходять стіну", () => {
    const map: BattleMapConfig = { ...base, terrain: { "1:0": { kind: "wall" }, "1:1": { kind: "wall" }, "1:2": { kind: "wall" } } };

    const hero = p("h", ParticipantSide.ALLY, { x: 0, y: 0 });

    expect(canStand(map, [hero], hero, { x: 1, y: 1 })).toBe(false);
    expect(reachable(map, [hero], hero, 6).has("1:1")).toBe(false);
    expect(reachable(map, [hero], hero, 6).has("2:1")).toBe(true);
  });
});

describe("threatCells", () => {
  const mover = p("h", ParticipantSide.ALLY, { x: 0, y: 0 });

  it("клітинки навколо ворога ближнього бою, без клітинки самого ворога", () => {
    const orc = p("o", ParticipantSide.ENEMY, { x: 5, y: 5 });

    const cells = threatCells(base, [mover, orc], mover);

    expect(cells.size).toBe(8);
    expect(cells.has("4:4")).toBe(true);
    expect(cells.has("6:6")).toBe(true);
    expect(cells.has("5:5")).toBe(false);
  });

  it("велика істота 2×2 загрожує всім клітинкам навколо свого footprint", () => {
    const ogre = p("g", ParticipantSide.ENEMY, { x: 4, y: 4 }, { size: 2 });

    const cells = threatCells(base, [mover, ogre], mover);

    expect(cells.size).toBe(12);
    expect(cells.has("3:3")).toBe(true);
    expect(cells.has("6:6")).toBe(true);
    expect(cells.has("5:5")).toBe(false);
  });

  it("союзник, лише дальні атаки, disable_melee_attacks, мертвий, резерв, поза мапою — без загрози", () => {
    const ally = p("a", ParticipantSide.ALLY, { x: 5, y: 5 });

    const archer = p("r", ParticipantSide.ENEMY, { x: 5, y: 5 }, { attacks: [bow] });

    const bound = p("b", ParticipantSide.ENEMY, { x: 5, y: 5 });

    bound.battleData.activeEffects = [{ id: "x", name: "Скутість", type: "debuff", duration: 1, effects: [{ type: "disable_melee_attacks" }] } as never];

    const dead = p("d", ParticipantSide.ENEMY, { x: 5, y: 5 });

    dead.combatStats = { ...dead.combatStats, status: CombatStatus.DEAD };

    const reserved = p("s", ParticipantSide.ENEMY, { x: 5, y: 5 });

    reserved.battleData.reserved = true;

    const offMap = p("m", ParticipantSide.ENEMY, undefined);

    expect(threatCells(base, [mover, ally, archer, bound, dead, reserved, offMap], mover).size).toBe(0);
  });

  it("лише в межах карти", () => {
    const orc = p("o", ParticipantSide.ENEMY, { x: 0, y: 9 });

    expect(threatCells(base, [mover, orc], mover).size).toBe(3);
  });
});

describe("pruneExpiredTerrain", () => {
  const map: BattleMapConfig = {
    ...base,
    terrain: { "1:1": { kind: "barrier", untilRound: 3 }, "2:2": { kind: "barrier", untilRound: 4 }, "3:3": { kind: "wall" } },
  };

  it("барʼєр до кінця раунду 3 лишається в раунді 3 й зникає в раунді 4", () => {
    expect(pruneExpiredTerrain(map, 3)).toBeNull();

    const next = pruneExpiredTerrain(map, 4);

    expect(next?.terrain).toEqual({ "2:2": { kind: "barrier", untilRound: 4 }, "3:3": { kind: "wall" } });
    expect(map.terrain?.["1:1"]).toBeDefined();
  });

  it("порожня місцевість після прибирання зникає з карти", () => {
    const only: BattleMapConfig = { ...base, terrain: { "1:1": { kind: "barrier", untilRound: 1 } } };

    expect(pruneExpiredTerrain(only, 2)).toEqual(base);
  });

  it("барʼєр без строку прибирається", () => {
    expect(pruneExpiredTerrain({ ...base, terrain: { "1:1": { kind: "barrier" } } }, 1)).toEqual(base);
  });

  it("без місцевості — null", () => {
    expect(pruneExpiredTerrain(base, 5)).toBeNull();
  });

  it("небезпека зі строком прибирається після нього, без строку — лишається", () => {
    const fire = { kind: "hazard" as const, label: "Вогняна стіна", untilRound: 2, damage: { amount: 9, type: "fire" } };

    const hazards: BattleMapConfig = { ...base, terrain: { "1:1": fire, "2:2": { kind: "hazard", label: "Лава" } } };

    expect(pruneExpiredTerrain(hazards, 2)).toBeNull();
    expect(pruneExpiredTerrain(hazards, 3)?.terrain).toEqual({ "2:2": { kind: "hazard", label: "Лава" } });
  });
});

describe("applyTerrain", () => {
  it("ставить і стирає клітинки, не змінюючи оригінал", () => {
    const set = applyTerrain(base, ["1:1", "2:2"], { kind: "hazard", label: "Вогонь" });

    expect(set.terrain).toEqual({ "1:1": { kind: "hazard", label: "Вогонь" }, "2:2": { kind: "hazard", label: "Вогонь" } });
    expect(base.terrain).toBeUndefined();

    const erased = applyTerrain(set, ["1:1"], null);

    expect(erased.terrain).toEqual({ "2:2": { kind: "hazard", label: "Вогонь" } });
    expect(applyTerrain(erased, ["2:2"], null)).toEqual(base);
  });
});

describe("diffTerrain / applyTerrainDiff", () => {
  it("зміна лише шкоди небезпеки потрапляє в diff", () => {
    const a = { "1:1": { kind: "hazard" as const, damage: { amount: 4, type: "fire" } } };

    const b = { "1:1": { kind: "hazard" as const, damage: { amount: 7, type: "fire" } } };

    expect(diffTerrain(a, b)).toEqual({ set: [{ cell: b["1:1"], keys: ["1:1"] }] });
  });

  it("зміна лише spellId небезпеки потрапляє в diff", () => {
    const a = { "1:1": { kind: "hazard" as const, damage: { amount: 4, type: "fire" } } };

    const b = { "1:1": { kind: "hazard" as const, damage: { amount: 4, type: "fire", spellId: "s1" } } };

    expect(diffTerrain(a, b)).toEqual({ set: [{ cell: b["1:1"], keys: ["1:1"] }] });
  });

  const base: BattleMapConfig = { cols: 6, rows: 6, background: null, opacity: 0.3 };

  it("групує однакові значення, рахує зміни й зняття; без змін — null", () => {
    const before = { "1:1": { kind: "wall" as const }, "2:2": { kind: "barrier" as const, untilRound: 2 } };

    const after = {
      "1:1": { kind: "wall" as const },
      "2:2": { kind: "barrier" as const, untilRound: 3 },
      "3:3": { kind: "hazard" as const, label: "Лава" },
      "4:4": { kind: "hazard" as const, label: "Лава" },
    };

    expect(diffTerrain(before, after)).toEqual({
      set: [
        { cell: { kind: "barrier", untilRound: 3 }, keys: ["2:2"] },
        { cell: { kind: "hazard", label: "Лава" }, keys: ["3:3", "4:4"] },
      ],
    });
    expect(diffTerrain(after, { "1:1": { kind: "wall" } })).toEqual({ removed: ["2:2", "3:3", "4:4"] });
    expect(diffTerrain(before, { ...before })).toBeNull();
    expect(diffTerrain(undefined, undefined)).toBeNull();
  });

  it("застосування диффу дає ту саму місцевість і новий запис", () => {
    const before = { ...base, terrain: { "1:1": { kind: "wall" as const }, "5:5": { kind: "hazard" as const } } };

    const after = applyTerrain(applyTerrain(before, ["1:1"], null), ["2:2", "3:3"], { kind: "hazard", label: "Отрута" });

    const diff = diffTerrain(before.terrain, after.terrain);

    const applied = applyTerrainDiff(before, diff ?? {});

    expect(applied).toEqual(after);
    expect(applied.terrain).not.toBe(before.terrain);
    expect(applyTerrainDiff(before, { removed: ["1:1", "5:5"] })).not.toHaveProperty("terrain");
  });
});

describe("місцевість із строком і зонами", () => {
  const map: BattleMapConfig = { cols: 6, rows: 6, background: null, opacity: 0.3 };

  it("стіна й складна місцевість зі строком згасають, без строку — постійні", () => {
    const timed: BattleMapConfig = { ...map, terrain: { "1:1": { kind: "wall", untilRound: 3 }, "2:2": { kind: "difficult", untilRound: 3 }, "3:3": { kind: "wall" } } };

    expect(pruneExpiredTerrain(timed, 3)).toBeNull();
    expect(pruneExpiredTerrain(timed, 4)?.terrain).toEqual({ "3:3": { kind: "wall" } });
  });

  it("зона заклинання без шкоди не вважається небезпекою для підсвітки ходу", () => {
    expect(hazardCells({ terrain: { "1:1": { kind: "hazard", zoneId: "z" }, "2:2": { kind: "hazard" }, "3:3": { kind: "hazard", zoneId: "z", damage: { amount: 1, type: "fire" } } } })).toEqual(new Set(["2:2", "3:3"]));
  });
});
