import { describe, expect, it } from "vitest";

import { attackReachError, enemiesInReach } from "../attack-reach";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { mazeMap } from "@/lib/utils/battle/maze/__tests__/fixtures";
import type { BattleAttack, BattleMapConfig, BattleParticipant, Direction8, GridPoint, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => mazeMap({ exit: { x: 9, y: 9 }, ...over }, 10);

function at(id: string, position: GridPoint, side: string, extra: { facing?: Direction8; dormant?: boolean } = {}): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    battleData: { ...p.battleData, position, ...extra },
  };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "80/320 фт" } as BattleAttack;

const hero = at("h", { x: 5, y: 5 }, ParticipantSide.ALLY, { facing: "e" });

describe("ближня атака в лабіринті", () => {
  it("сусід за стіною — «Між вами стіна»; без стіни — ок", () => {
    const foe = at("e", { x: 6, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(mapOf({ walls: ["5:5:e"] }), [hero, foe], hero, sword, [foe])).toBe("Між вами стіна");
    expect(attackReachError(mapOf(), [hero, foe], hero, sword, [foe])).toBeNull();
  });

  it("по діагоналі через закритий кут — стіна; через відкрите ребро — ок", () => {
    const foe = at("e", { x: 6, y: 6 }, ParticipantSide.ENEMY);

    expect(attackReachError(mapOf({ walls: ["5:5:s"] }), [hero, foe], hero, sword, [foe])).toBe("Між вами стіна");
    expect(attackReachError(mapOf({ walls: ["4:5:e"] }), [hero, foe], hero, sword, [foe])).toBeNull();
  });

  it("далекий ворог — як раніше «не поруч»", () => {
    const foe = at("e", { x: 8, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(mapOf(), [hero, foe], hero, sword, [foe])).toMatch(/поруч/);
  });
});

describe("дальня атака в лабіринті", () => {
  it("ціль у конусі — ок; за стіною чи поза конусом — «Ціль поза полем зору»", () => {
    const ahead = at("e", { x: 8, y: 5 }, ParticipantSide.ENEMY);

    const behind = at("e2", { x: 2, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(mapOf(), [hero, ahead], hero, bow, [ahead])).toBeNull();
    expect(attackReachError(mapOf({ walls: ["6:5:e"] }), [hero, ahead], hero, bow, [ahead])).toBe("Ціль поза полем зору");
    expect(attackReachError(mapOf(), [hero, behind], hero, bow, [behind])).toBe("Ціль поза полем зору");
  });

  it("ціль у тумані видно лише впритул", () => {
    const foe = at("e", { x: 7, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(mapOf({ fog: ["7:5"] }), [hero, foe], hero, bow, [foe])).toBe("Ціль поза полем зору");
  });

  it("сусідній ворог і далі блокує постріл", () => {
    const adj = at("e1", { x: 5, y: 6 }, ParticipantSide.ENEMY);

    const ahead = at("e2", { x: 8, y: 5 }, ParticipantSide.ENEMY);

    expect(attackReachError(mapOf(), [hero, adj, ahead], hero, bow, [ahead])).toMatch(/Поруч ворог/);
  });

  it("enemiesInReach бере лише видимих", () => {
    const ahead = at("e1", { x: 8, y: 5 }, ParticipantSide.ENEMY);

    const behind = at("e2", { x: 2, y: 5 }, ParticipantSide.ENEMY);

    expect(enemiesInReach(mapOf(), [hero, ahead, behind], hero, bow).map((p) => p.basicInfo.id)).toEqual(["e1"]);
  });
});

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
