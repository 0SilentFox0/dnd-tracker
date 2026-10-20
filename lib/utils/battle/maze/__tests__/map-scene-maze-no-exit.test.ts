import { describe, expect, it } from "vitest";

import { emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { deriveMapScene, type MapSceneActor } from "@/lib/utils/battle/grid";
import { deriveMazeView } from "@/lib/utils/battle/view";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const hero = (): BattleParticipant => {
  const p = placed("h", { side: ParticipantSide.ALLY, at: { x: 1, y: 1 } });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: "u" }, battleData: { ...p.battleData, facing: "s" } };
};

function sceneOn(map: BattleMapConfig, isDM: boolean) {
  const participants = [hero()];

  const maze = deriveMazeView({ map, participants, userId: isDM ? "dm" : "u", isDM });

  const actor: MapSceneActor = { current: participants[0], viewer: { userId: isDM ? "dm" : "u", isDM, canSeeEnemyHp: false }, canAct: true, isDM, attackReady: true };

  return deriveMapScene({ map, participants, selectedId: null, actor, mode: { placing: false, placingId: null }, maze });
}

const moveMarks = (marks: Map<string, unknown> | undefined) => [...(marks ?? [])].filter(([, m]) => typeof m === "number");

describe("лабіринт без виходу ще не готовий", () => {
  it("немає зони ходу, клік по сусідній клітинці — не хід (і гравцю, і ДМ)", () => {
    for (const isDM of [false, true]) {
      const s = sceneOn(testMap(8, 8, { maze: emptyMaze() }), isDM);

      expect(moveMarks(s.view.marks)).toEqual([]);
      expect(s.cellClick({ x: 1, y: 2 }).kind).not.toBe("move");
    }
  });

  it("з виходом зона ходу є", () => {
    const s = sceneOn(testMap(8, 8, { maze: { ...emptyMaze(), exit: { x: 7, y: 7 } } }), false);

    expect(moveMarks(s.view.marks).length).toBeGreaterThan(0);
    expect(s.cellClick({ x: 1, y: 2 }).kind).toBe("move");
  });
});
