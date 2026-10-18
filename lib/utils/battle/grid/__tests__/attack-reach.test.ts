import { describe, expect, it } from "vitest";

import { attackRangeCells, attackReachError } from "../attack-reach";

import { AttackType, CombatStatus, GridShape, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { grid: GridShape.SQUARE, cols: 30, rows: 10, background: null, opacity: 0.3 };

function at(id: string, position: GridPoint | undefined, side: string, dead = false): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    combatStats: { ...p.combatStats, ...(dead && { status: CombatStatus.DEAD, currentHp: 0 }) },
    battleData: { ...p.battleData, ...(position && { position }) },
  };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "80/320 фт" } as BattleAttack;

const sling = { id: "sl", name: "Праща", type: AttackType.RANGED, range: "30 фт" } as BattleAttack;

describe("дальність атаки", () => {
  it("береться останнє число у футах", () => {
    expect(attackRangeCells("80/320 фт")).toBe(64);
    expect(attackRangeCells("5 ft")).toBe(1);
    expect(attackRangeCells(undefined)).toBeNull();
    expect(attackRangeCells("дальня")).toBeNull();
  });
});

describe("правила атак на карті", () => {
  const hero = at("h", { x: 5, y: 5 }, ParticipantSide.ALLY);

  it("ближня атака — лише по сусідній цілі", () => {
    const near = at("e1", { x: 6, y: 6 }, ParticipantSide.ENEMY);

    const far = at("e2", { x: 8, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, near, far], hero, sword, [near])).toBeNull();
    expect(attackReachError(map, [hero, near, far], hero, sword, [far])).toMatch(/поруч/);
  });

  it("стрілок не стріляє, коли поруч живий ворог; мертвий не заважає", () => {
    const adj = at("e1", { x: 5, y: 6 }, ParticipantSide.ENEMY);

    const target = at("e2", { x: 15, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, adj, target], hero, bow, [target])).toMatch(/ворог/);

    const corpse = at("e1", { x: 5, y: 6 }, ParticipantSide.ENEMY, true);

    expect(attackReachError(map, [hero, corpse, target], hero, bow, [target])).toBeNull();
  });

  it("ціль поза дальністю", () => {
    const target = at("e2", { x: 15, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, target], hero, sling, [target])).toMatch(/дальн/);
  });

  it("без карти або без позицій — правил немає", () => {
    const far = at("e2", { x: 20, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(null, [hero, far], hero, sword, [far])).toBeNull();

    const loose = at("e3", undefined, ParticipantSide.ENEMY);

    expect(attackReachError(map, [hero, loose], hero, sword, [loose])).toBeNull();
  });
});
