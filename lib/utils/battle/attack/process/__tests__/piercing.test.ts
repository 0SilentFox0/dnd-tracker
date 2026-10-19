import { describe, expect, it } from "vitest";

import { piercingTargets } from "../piercing";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const MAP: BattleMapConfig = { cols: 10, rows: 10, background: null, opacity: 0.4 };

const at = (id: string, pos: GridPoint, side: ParticipantSide = ParticipantSide.ENEMY): BattleParticipant => {
  const p = makeParticipant({ id, side });

  return { ...p, battleData: { ...p.battleData, position: pos } };
};

const attacker = at("a", { x: 0, y: 5 }, ParticipantSide.ALLY);

describe("piercingTargets", () => {
  it("бере ворогів на лінії за ціллю, першою ціль, решта за відстанню", () => {
    const ps = [attacker, at("far", { x: 8, y: 5 }), at("t", { x: 3, y: 5 }), at("mid", { x: 5, y: 5 })];

    expect(piercingTargets(MAP, ps, attacker, "t")).toEqual(["t", "mid", "far"]);
  });

  it("не бере ворогів поза лінією і союзників", () => {
    const ps = [attacker, at("t", { x: 3, y: 5 }), at("off", { x: 6, y: 8 }), at("ally", { x: 5, y: 5 }, ParticipantSide.ALLY)];

    expect(piercingTargets(MAP, ps, attacker, "t")).toEqual(["t"]);
  });

  it("не бере ворогів перед ціллю", () => {
    const ps = [attacker, at("front", { x: 1, y: 5 }), at("t", { x: 3, y: 5 })];

    expect(piercingTargets(MAP, ps, attacker, "t")).toEqual(["t"]);
  });

  it("працює по діагоналі", () => {
    const diag = at("a", { x: 0, y: 0 }, ParticipantSide.ALLY);

    expect(piercingTargets(MAP, [diag, at("t", { x: 2, y: 2 }), at("b", { x: 5, y: 5 })], diag, "t")).toEqual(["t", "b"]);
  });

  it("пропускає ворога в повітрі", () => {
    const flying = at("fly", { x: 5, y: 5 });

    const ps = [attacker, at("t", { x: 3, y: 5 }), { ...flying, battleData: { ...flying.battleData, airborne: { since: 1, percent: 200, name: "Пікірування" } } }];

    expect(piercingTargets(MAP, ps, attacker, "t")).toEqual(["t"]);
  });

  it("зупиняється на стіні", () => {
    const walled = { ...MAP, blocked: ["4:5"] };

    const ps = [attacker, at("t", { x: 3, y: 5 }), at("behind", { x: 6, y: 5 })];

    expect(piercingTargets(walled, ps, attacker, "t")).toEqual(["t"]);
    expect(piercingTargets(MAP, ps, attacker, "t")).toEqual(["t", "behind"]);
  });

  it("без карти — лише перша ціль", () => {
    expect(piercingTargets(undefined, [attacker, at("t", { x: 3, y: 5 }), at("b", { x: 5, y: 5 })], attacker, "t")).toEqual(["t"]);
    expect(piercingTargets(MAP, [{ ...attacker, battleData: { ...attacker.battleData, position: undefined } }, at("t", { x: 3, y: 5 })], attacker, "t")).toEqual(["t"]);
  });
});
