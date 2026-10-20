import { describe, expect, it } from "vitest";

import { attackReachError, enemiesInReach } from "../attack-reach";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleAttack, BattleMapConfig, BattleParticipant, Direction8, GridPoint, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => ({
  cols: 10,
  rows: 10,
  background: null,
  opacity: 0.3,
  maze: { walls: [], exit: { x: 9, y: 9 }, difficulty: "medium", teleports: [], fog: [], marks: {}, dark: false, ...over },
});

function at(id: string, position: GridPoint, side: string, extra: { facing?: Direction8; dormant?: boolean } = {}): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    battleData: { ...p.battleData, position, ...extra },
  };
}

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "80/320 фт" } as BattleAttack;

const hero = at("h", { x: 5, y: 5 }, ParticipantSide.ALLY, { facing: "e" });

const target = at("t", { x: 8, y: 5 }, ParticipantSide.ENEMY);

const ENGAGED = "Поруч ворог — стріляти не можна";

describe("лабіринт: «поруч ворог» для дальньої атаки", () => {
  it("ворог за стіною поруч не заважає стріляти", () => {
    const behindWall = at("w", { x: 5, y: 6 }, ParticipantSide.ENEMY);

    const map = mapOf({ walls: ["5:5:s"] });

    expect(attackReachError(map, [hero, behindWall, target], hero, bow, [target])).toBeNull();
    expect(enemiesInReach(map, [hero, behindWall, target], hero, bow).map((p) => p.basicInfo.id)).toEqual(["t"]);
  });

  it("сплячий ворог поруч не заважає стріляти", () => {
    const sleeper = at("z", { x: 4, y: 5 }, ParticipantSide.ENEMY, { dormant: true });

    expect(attackReachError(mapOf(), [hero, sleeper, target], hero, bow, [target])).toBeNull();
  });

  it("несплячий ворог поруч без стіни — як і раніше заважає", () => {
    const awake = at("a", { x: 4, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(mapOf(), [hero, awake, target], hero, bow, [target])).toBe(ENGAGED);
  });

  it("поза лабіринтом сплячий прапорець нічого не змінює", () => {
    const sleeper = at("z", { x: 4, y: 5 }, ParticipantSide.ENEMY, { dormant: true });

    const plain: BattleMapConfig = { ...mapOf(), maze: null };

    expect(attackReachError(plain, [hero, sleeper, target], hero, bow, [target])).toBe(ENGAGED);
  });
});
