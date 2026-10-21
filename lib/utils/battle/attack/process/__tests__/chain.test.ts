import { describe, expect, it } from "vitest";

import { nextChainTarget } from "../chain";

import { AttackType, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack, GridPoint } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Ланцюговий постріл", type: AttackType.RANGED, attackBonus: 8, damageDice: "2d6+5", damageType: "necrotic", range: "30/120" };

const at = (id: string, pos: GridPoint, side: ParticipantSide = ParticipantSide.ENEMY) => placed(id, { side, at: pos, hp: 20 });

const demoness = at("d", { x: 0, y: 0 }, ParticipantSide.ALLY);

const first = at("t", { x: 5, y: 5 });

const next = (order: ReturnType<typeof at>[], hit = new Set(["t"]), map: ReturnType<typeof testMap> | null = testMap(20)) => nextChainTarget({ map, order, attacker: demoness, attack: bow, from: first, hit })?.basicInfo.id;

describe("nextChainTarget", () => {
  it("найближчий ворог до попередньої цілі", () => {
    expect(next([demoness, first, at("far", { x: 12, y: 12 }), at("near", { x: 6, y: 7 })])).toBe("near");
  });

  it("не бере союзників і вже вражених", () => {
    expect(next([demoness, first, at("ally", { x: 6, y: 5 }, ParticipantSide.ALLY), at("done", { x: 5, y: 6 })], new Set(["t", "done"]))).toBeUndefined();
  });

  it("поза дальністю атаки від попередньої цілі — кінець ланцюга", () => {
    const short = { ...bow, range: "10" };

    expect(nextChainTarget({ map: testMap(20), order: [demoness, first, at("x", { x: 9, y: 5 })], attacker: demoness, attack: short, from: first, hit: new Set(["t"]) })).toBeUndefined();
  });

  it("без карти — перший ворог за ініціативою", () => {
    expect(next([demoness, first, placed("a"), placed("b")], new Set(["t"]), null)).toBe("a");
  });

  it("попередня ціль мертва — відстань від її клітинки", () => {
    const dead = { ...first, combatStats: { ...first.combatStats, currentHp: 0, status: CombatStatus.DEAD } };

    expect(nextChainTarget({ map: testMap(20), order: [demoness, dead, at("far", { x: 1, y: 1 }), at("near", { x: 6, y: 5 })], attacker: demoness, attack: bow, from: dead, hit: new Set(["t"]) })?.basicInfo.id).toBe("near");
  });
});
