import { describe, expect, it } from "vitest";

import { attackReachError, meleeReachCells, rangeBands, rangeDisadvantageReasons } from "../attack-reach";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 80, rows: 10, background: null, opacity: 0.3 };

const mk = (id: string, side: string, x: number, fiveE = false): BattleParticipant => {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    abilities: { ...p.abilities, ...(fiveE && { damageModel: "5e" as const }) },
    battleData: { ...p.battleData, position: { x, y: 0 } },
  };
};

const glaive = { id: "g", name: "Глефа", type: AttackType.MELEE, damageDice: "1d10", traits: ["reach", "twoHanded"] } as BattleAttack;

const dagger = { id: "d", name: "Кинджал", type: AttackType.MELEE, range: "20/60", traits: ["thrown", "finesse"] } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "80/320" } as BattleAttack;

const fiveE = mk("a", ParticipantSide.ALLY, 0, true);

const homm = mk("a", ParticipantSide.ALLY, 0);

const target = (x: number) => mk("t", ParticipantSide.ENEMY, x);

const enemyAt = (x: number) => mk("e", ParticipantSide.ENEMY, x);

describe("досяжність і дальність 5e", () => {
  it("reach weapon hits at 2 cells in 5e only", () => {
    expect(meleeReachCells(fiveE, glaive)).toBe(2);
    expect(meleeReachCells(homm, glaive)).toBe(1);
    expect(attackReachError(map, [fiveE, target(2)], fiveE, glaive, [target(2)])).toBeNull();
    expect(attackReachError(map, [fiveE, target(3)], fiveE, glaive, [target(3)])).toEqual(textRef(REJECT.targetNotNear));
    expect(attackReachError(map, [homm, target(2)], homm, glaive, [target(2)])).toEqual(textRef(REJECT.targetNotNear));
  });

  it("ranged with adjacent enemy: 5e disadvantage, HOMM rejected", () => {
    const ps = [fiveE, enemyAt(1), target(5)];

    expect(attackReachError(map, ps, fiveE, bow, [target(5)])).toBeNull();
    expect(rangeDisadvantageReasons(map, ps, fiveE, bow, target(5))).toContainEqual(textRef("battleLog.rollMode.enemyNear"));
    expect(attackReachError(map, [homm, enemyAt(1), target(5)], homm, bow, [target(5)])).toEqual(textRef(REJECT.enemyNearNoShoot));
    expect(rangeDisadvantageReasons(map, [homm, enemyAt(1), target(5)], homm, bow, target(5))).toEqual([]);
  });

  it("80/320: beyond normal is disadvantage, beyond long is rejected", () => {
    expect(rangeBands("80/320")).toEqual({ normal: 16, long: 64 });
    expect(rangeBands("30")).toEqual({ normal: 6, long: 6 });
    expect(rangeDisadvantageReasons(map, [fiveE, target(20)], fiveE, bow, target(20))).toContainEqual(textRef("battleLog.rollMode.farRange"));
    expect(rangeDisadvantageReasons(map, [fiveE, target(10)], fiveE, bow, target(10))).toEqual([]);
    expect(attackReachError(map, [fiveE, target(70)], fiveE, bow, [target(70)])).toEqual(textRef(REJECT.targetOutOfAttackRange));
  });

  it("thrown melee weapon: melee in reach, ranged beyond without adjacent-enemy penalty", () => {
    const ps = [fiveE, enemyAt(1), target(3)];

    expect(attackReachError(map, ps, fiveE, dagger, [target(3)])).toBeNull();
    expect(rangeDisadvantageReasons(map, ps, fiveE, dagger, target(3))).toEqual([]);
    expect(rangeDisadvantageReasons(map, [fiveE, target(6)], fiveE, dagger, target(6))).toEqual([textRef("battleLog.rollMode.farRange")]);
    expect(rangeDisadvantageReasons(map, [fiveE, target(1)], fiveE, dagger, target(1))).toEqual([]);
    expect(attackReachError(map, [fiveE, target(13)], fiveE, dagger, [target(13)])).toEqual(textRef(REJECT.targetOutOfAttackRange));
    expect(attackReachError(map, [homm, target(6)], homm, dagger, [target(6)])).toEqual(textRef(REJECT.targetNotNear));
  });
});
