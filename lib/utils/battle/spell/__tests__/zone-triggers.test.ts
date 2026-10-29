import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { diffTerrain, pruneExpiredTerrain } from "@/lib/utils/battle/grid/terrain";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { spellTerrainEffects, spellZoneHazard } from "@/lib/utils/battle/spell/zone-hazard";
import { sweepDeadZones, zoneMove, zonesAt, zoneTurnStart } from "@/lib/utils/battle/spell/zone-triggers";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { SpellDefinition, SpellZone } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const blank: BattleMapConfig = { cols: 14, rows: 14, background: null, opacity: 0.3 };

const caster = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "mage", name: "Маг" } });

const foe = (position: GridPoint, over: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, id: "foe", name: "Ворог", side: ParticipantSide.ENEMY }, battleData: { ...base.battleData, position, ...over } };
};

const spell = (zone: SpellZone, extra: Partial<SpellDefinition> = {}): CastableSpell => ({
  id: "storm",
  name: "Буря",
  level: 3,
  groupId: null,
  definition: { dice: 0, cost: "action", targeting: { kind: "template", shape: "circle", size: 20, side: "enemy", maxTargets: 20, zone }, resolution: { kind: "auto" }, effects: [], raceModifiers: [], ...extra },
});

const square = (x0: number, y0: number, n: number) => Array.from({ length: n * n }, (_, i) => `${x0 + (i % n)}:${y0 + Math.floor(i / n)}`);

const CAST = { round: 1, casterId: "mage", dc: 99, centre: { x: 4, y: 4 } };

const exitZone: SpellZone = { rounds: 5, terrain: ["difficult", "obscured"], onExit: { save: { ability: "strength" }, effects: [], pull: "centre" } };

const zoneMap = (zone: SpellZone = exitZone, extra: Partial<Parameters<typeof spellZoneHazard>[0]> = {}) => spellZoneHazard({ map: blank, spell: spell(zone), cells: square(3, 3, 3), ...CAST, ...extra }) as BattleMapConfig;

describe("spellZoneHazard", () => {
  it("кладе прапорці місцевості, zoneId і тригери зони", () => {
    const map = zoneMap();

    expect(map.terrain?.["4:4"]).toMatchObject({ kind: "hazard", difficult: true, obscured: true, untilRound: 5 });
    expect(map.terrain?.["4:4"].damage).toBeUndefined();

    const id = map.terrain?.["4:4"].zoneId as string;

    expect(map.spellZones?.[id]).toMatchObject({ casterId: "mage", dc: 99, side: "enemies", centre: { x: 4, y: 4 }, untilRound: 5 });
  });

  it("зона без тригерів і концентрації не пише spellZones", () => {
    expect(zoneMap({ rounds: 3, terrain: ["difficult"] }).spellZones).toBeUndefined();
  });

  it("дельта зони r=20 фт: місцевість групується, розмір далеко під лімітом", () => {
    const cells = square(0, 0, 9);

    const map = spellZoneHazard({ map: blank, spell: spell(exitZone), cells, ...CAST }) as BattleMapConfig;

    expect(JSON.stringify(diffTerrain(undefined, map.terrain)).length).toBeLessThan(9500);
  });

  it("осиротілі зони прибираються разом із клітинками", () => {
    const map = zoneMap();

    expect(pruneExpiredTerrain(map, 6)?.spellZones).toBeUndefined();
    expect(pruneExpiredTerrain(map, 5)).toBeNull();
  });
});

describe("zoneMove", () => {
  const map = zoneMap();

  const walk = (from: GridPoint, path: GridPoint[], mover = foe(from), over: Partial<Parameters<typeof zoneMove>[0]> = {}) => {
    const moved = { ...mover, battleData: { ...mover.battleData, position: path.at(-1) } };

    return zoneMove({ map, participants: [caster, moved], moved, from, path, round: 1, rng: () => 0, ...over });
  };

  it("невдалий рятівний при виході тягне до вільної клітинки найближчої до центру й забирає решту руху", () => {
    const out = walk({ x: 5, y: 4 }, [{ x: 6, y: 4 }, { x: 7, y: 4 }]);

    expect(out.moved.battleData.position).toEqual({ x: 4, y: 4 });
    expect(out.moved.battleData.movementUsed).toBeGreaterThanOrEqual(6);
    expect(textsOf(out.messages).join(" ")).toContain("тягне");
  });

  it("успішний рятівний — виходить із зони", () => {
    const strong = foe({ x: 5, y: 4 });

    strong.abilities = { ...strong.abilities, modifiers: { ...strong.abilities.modifiers, strength: 30 } };

    const out = walk({ x: 5, y: 4 }, [{ x: 6, y: 4 }, { x: 7, y: 4 }], strong, { map: zoneMap(exitZone, { dc: 5 }) });

    expect(out.moved.battleData.position).toEqual({ x: 7, y: 4 });
  });

  it("вихід двічі за раунд — один тригер", () => {
    const first = walk({ x: 5, y: 4 }, [{ x: 6, y: 4 }]);

    const again = walk({ x: 5, y: 4 }, [{ x: 6, y: 4 }], first.moved);

    expect(first.moved.battleData.zoneHits).toBeDefined();
    expect(again.messages).toEqual([]);
  });

  it("союзник кастера не підпадає під зону ворогів", () => {
    const ally = { ...foe({ x: 5, y: 4 }), basicInfo: { ...foe({ x: 5, y: 4 }).basicInfo, side: ParticipantSide.ALLY } };

    expect(walk({ x: 5, y: 4 }, [{ x: 6, y: 4 }, { x: 7, y: 4 }], ally).messages).toEqual([]);
  });

  it("вхід у зону з onEnter завдає шкоди ефектом", () => {
    const burning = zoneMap({ rounds: 5, onEnter: { effects: [{ kind: "dealDamage", amount: 7, damageType: "fire", target: "eventTarget" }] } });

    const mover = foe({ x: 2, y: 4 });

    const moved = { ...mover, battleData: { ...mover.battleData, position: { x: 3, y: 4 } } };

    const out = zoneMove({ map: burning, participants: [caster, moved], moved, from: { x: 2, y: 4 }, path: [{ x: 3, y: 4 }], round: 1, rng: () => 0 });

    expect(out.moved.combatStats.currentHp).toBe(13);
  });
});

describe("zoneTurnStart", () => {
  it("на початку ходу в зоні спрацьовує onTurnStart, поза зоною — ні", () => {
    const map = zoneMap({ rounds: 5, onTurnStart: { effects: [{ kind: "dealDamage", amount: 4, damageType: "poison", target: "eventTarget" }] } });

    const inside = zoneTurnStart(map, [caster, foe({ x: 4, y: 4 })], "foe", { round: 2, rng: () => 0 });

    expect(inside.participants.find((p) => p.basicInfo.id === "foe")?.combatStats.currentHp).toBe(16);

    const outside = zoneTurnStart(map, [caster, foe({ x: 10, y: 10 })], "foe", { round: 2, rng: () => 0 });

    expect(outside.messages).toEqual([]);
  });

  it("zonesAt бачить лише зони з тригерами", () => {
    expect([...zonesAt(zoneMap(), foe({ x: 4, y: 4 }))]).toHaveLength(1);
    expect([...zonesAt(zoneMap({ rounds: 2, terrain: ["difficult"] }), foe({ x: 4, y: 4 }))]).toHaveLength(0);
  });
});

describe("sweepDeadZones", () => {
  const tag = { casterId: "mage", castId: "cast-1" };

  const live = { ...caster, battleData: { ...caster.battleData, activeEffects: [{ id: "c", name: "Буря", type: "buff", duration: 5, concentration: { castId: "cast-1" } } as never] } };

  const map = zoneMap(exitZone, { concentrationOf: tag });

  it("поки кастер концентрується — зона на місці", () => {
    expect(sweepDeadZones(map, [live, foe({ x: 4, y: 4 })])).toBeNull();
  });

  it("зламана концентрація прибирає клітинки й зону", () => {
    const swept = sweepDeadZones(map, [caster, foe({ x: 4, y: 4 })]);

    expect(swept?.terrain).toBeUndefined();
    expect(swept?.spellZones).toBeUndefined();
  });
});

describe("spellTerrainEffects", () => {
  const wall = { kind: "createTerrain" as const, terrain: "wall" as const, shape: "cell" as const, cells: 1, rounds: 10 };

  const casterAt = { ...caster, battleData: { ...caster.battleData, position: { x: 0, y: 0 } } };

  const sand = spell({ rounds: 1 });

  it("стіна лишається до untilRound, блокує рух і зникає", async () => {
    const { reachable, lineOfFire } = await import("@/lib/utils/battle/grid");

    const map = spellTerrainEffects({ map: blank, effects: [wall], spell: sand, caster: casterAt, participants: [casterAt, foe({ x: 6, y: 0 })], targetIds: [], cells: ["3:0"], round: 2 }) as BattleMapConfig;

    expect(map.terrain?.["3:0"]).toMatchObject({ kind: "wall", untilRound: 11 });

    const mover = foe({ x: 6, y: 0 });

    const cost = reachable(map, [casterAt, mover], mover, 6);

    expect(cost.has("3:0")).toBe(false);
    expect(lineOfFire(map, [casterAt, mover], casterAt, { ...mover, battleData: { ...mover.battleData, position: { x: 6, y: 0 } } }).blocked).toBe(true);
    expect(pruneExpiredTerrain(map, 11)).toBeNull();
    expect(pruneExpiredTerrain(map, 12)?.terrain).toBeUndefined();
  });

  it("стіна не займає клітинку з учасником", () => {
    expect(spellTerrainEffects({ map: blank, effects: [wall], spell: sand, caster: casterAt, participants: [casterAt, foe({ x: 3, y: 0 })], targetIds: [], cells: ["3:0"], round: 1 })).toBeNull();
  });

  it("лінія складної місцевості йде від кастера до цілі без їхніх клітинок", () => {
    const line = { kind: "createTerrain" as const, terrain: "difficult" as const, shape: "line" as const, cells: 20, rounds: 10 };

    const map = spellTerrainEffects({ map: blank, effects: [line], spell: sand, caster: casterAt, participants: [casterAt, foe({ x: 4, y: 0 })], targetIds: ["foe"], cells: undefined, round: 1 }) as BattleMapConfig;

    expect(Object.keys(map.terrain ?? {}).sort()).toEqual(["1:0", "2:0", "3:0"]);
    expect(map.terrain?.["2:0"]).toMatchObject({ kind: "difficult", untilRound: 10 });
  });
});
