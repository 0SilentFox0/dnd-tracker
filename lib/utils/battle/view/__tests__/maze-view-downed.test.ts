import { describe, expect, it } from "vitest";

import { CombatStatus, emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { spellTargetCandidates } from "@/lib/utils/battle/flows/spell-flow";
import { deriveMazeView, visibleParticipants } from "@/lib/utils/battle/view";
import type { BattleParticipant, GridPoint } from "@/types/battle";

const hero = (id: string, at: GridPoint, user: string): BattleParticipant => {
  const p = placed(id, { side: ParticipantSide.ALLY, at });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: user }, battleData: { ...p.battleData, facing: "e" } };
};

const downed = (p: BattleParticipant): BattleParticipant => ({ ...p, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } });

const map = testMap(12, 12, { maze: { ...emptyMaze(), walls: ["5:5:e", "5:4:e", "5:6:e"] } });

describe("лабіринт: непритомні союзники", () => {
  const caster = hero("me", { x: 1, y: 5 }, "u1");

  const nearFallen = downed(hero("near", { x: 3, y: 5 }, "u2"));

  const farFallen = downed(hero("far", { x: 7, y: 5 }, "u3"));

  const all = [caster, nearFallen, farFallen];

  const view = deriveMazeView({ map, participants: all, userId: "u1", isDM: false })!;

  it("непритомний союзник у полі зору видимий і є ціллю закляття воскресіння", () => {
    expect(view.visibleIds.has("near")).toBe(true);

    const candidates = spellTargetCandidates(visibleParticipants(view, all), caster, "dead").map((p) => p.basicInfo.id);

    expect(candidates).toEqual(["near"]);
  });

  it("непритомний союзник поза полем зору прихований", () => {
    expect(view.visibleIds.has("far")).toBe(false);
  });
});
