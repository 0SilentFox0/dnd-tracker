import { describe, expect, it } from "vitest";

import { cleaveTargets } from "../cleave";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { GridPoint } from "@/types/battle";

const MAP = testMap();

const at = (id: string, pos: GridPoint, side: ParticipantSide = ParticipantSide.ENEMY) => placed(id, { side, at: pos, hp: 20 });

const cerberus = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY);

const target = at("t", { x: 6, y: 5 });

const ids = (ps: { basicInfo: { id: string } }[]) => ps.map((p) => p.basicInfo.id);

describe("cleaveTargets", () => {
  it("вороги поруч і з атакуючим, і з ціллю, за ініціативою, до count", () => {
    const order = [cerberus, target, at("a", { x: 6, y: 4 }), at("b", { x: 6, y: 6 }), at("c2", { x: 5, y: 4 })];

    expect(ids(cleaveTargets(MAP, order, cerberus, target, 2))).toEqual(["a", "b"]);
  });

  it("не бере союзників, далеких і повалених", () => {
    const fallen = at("down", { x: 6, y: 6 });

    const order = [cerberus, target, at("ally", { x: 6, y: 4 }, ParticipantSide.ALLY), at("far", { x: 7, y: 5 }), { ...fallen, combatStats: { ...fallen.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } }];

    expect(cleaveTargets(MAP, order, cerberus, target, 2)).toEqual([]);
  });

  it("без карти — порожньо", () => {
    expect(cleaveTargets(null, [cerberus, target, at("a", { x: 6, y: 4 })], cerberus, target, 2)).toEqual([]);
  });
});
