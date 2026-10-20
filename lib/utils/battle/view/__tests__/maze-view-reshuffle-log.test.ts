import { describe, expect, it } from "vitest";

import { DM_ACTOR, emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { deriveMazeView, maskMazeScene } from "@/lib/utils/battle/view";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const hero: BattleParticipant = (() => {
  const p = placed("a", { side: ParticipantSide.ALLY, at: { x: 1, y: 5 } });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: "u1" }, battleData: { ...p.battleData, facing: "e" } };
})();

const entry = (id: string, mazeEvent?: "op" | "reshuffle"): BattleAction =>
  ({ id, actorId: DM_ACTOR.actorId, actorName: "ДМ", targets: [], actionDetails: mazeEvent ? { mazeEvent } : {}, resultText: id, hpChanges: [] }) as unknown as BattleAction;

const log = [entry("reshuffle", "reshuffle"), entry("dark", "op"), entry("note")];

const scene = { battle: { battleLog: log }, turn: { current: null, queue: [] }, roster: { allies: [hero], enemies: [] } };

const ids = (s: typeof scene) => s.battle.battleLog.map((e) => e.id);

describe("журнал лабіринту: перетасовку не бачить ніхто", () => {
  const map = testMap(12, 12, { maze: emptyMaze() });

  it("ДМ бачить інші події ДМа, але не перетасовку", () => {
    const view = deriveMazeView({ map, participants: [hero], userId: "dm", isDM: true });

    expect(ids(maskMazeScene(scene, view))).toEqual(["dark", "note"]);
  });

  it("гравець не бачить ні перетасовки, ні інших змін лабіринту", () => {
    const view = deriveMazeView({ map, participants: [hero], userId: "u1", isDM: false });

    expect(ids(maskMazeScene(scene, view))).toEqual(["note"]);
  });

  it("глядач теж не бачить перетасовки", () => {
    const view = deriveMazeView({ map, participants: [hero], userId: "nobody", isDM: false });

    expect(ids(maskMazeScene(scene, view))).toEqual(["dark", "note"]);
  });

  it("без лабіринту сцена та сама", () => {
    expect(maskMazeScene(scene, null)).toBe(scene);
  });
});
