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

function at(id: string, position: GridPoint, side: string, facing?: Direction8): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] },
    battleData: { ...p.battleData, position, ...(facing && { facing }) },
  };
}

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "80/320 фт" } as BattleAttack;

const hero = at("h", { x: 5, y: 5 }, ParticipantSide.ALLY, "e");

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
