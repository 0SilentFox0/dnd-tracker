import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { deriveMapScene, type MapSceneActor } from "@/lib/utils/battle/grid";
import { mazeMap } from "@/lib/utils/battle/maze/__tests__/fixtures";
import { deriveMazeView } from "@/lib/utils/battle/view";
import type { BattleMapConfig, BattleParticipant, Direction8, GridPoint } from "@/types/battle";

const hero = (at: GridPoint, facing: Direction8): BattleParticipant => {
  const p = placed("h", { side: ParticipantSide.ALLY, at });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: "u" }, battleData: { ...p.battleData, facing } };
};

const withExit = (walls: string[] = []): BattleMapConfig => mazeMap({ exit: { x: 7, y: 7 }, walls });

function scene(map: BattleMapConfig, participants: BattleParticipant[], isDM: boolean) {
  const current = participants[0];

  const maze = deriveMazeView({ map, participants, userId: isDM ? "dm" : "u", isDM });

  const actor: MapSceneActor = { current, viewer: { userId: isDM ? "dm" : "u", isDM, canSeeEnemyHp: false }, canAct: true, isDM, attackReady: true };

  return { maze, scene: deriveMapScene({ map, participants, selectedId: null, actor, mode: { placing: false, placingId: null }, maze }) };
}

const moveKeys = (marks: Map<string, unknown> | undefined) => [...(marks ?? [])].flatMap(([k, m]) => (typeof m === "number" ? [k] : []));

describe("deriveMapScene у лабіринті", () => {
  it("зона ходу не переходить через стіну й не довша за 3 кроки", () => {
    const wallColumn = Array.from({ length: 8 }, (_, y) => `1:${y}:e`);

    const { scene: s } = scene(withExit(wallColumn), [hero({ x: 1, y: 1 }, "s")], true);

    const keys = moveKeys(s.view.marks);

    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => Number(k.split(":")[0]) <= 1)).toBe(true);
    expect(s.view.marks?.get("1:4")).toBe(3);
    expect(s.view.marks?.has("1:5")).toBe(false);
  });

  it("гравець: позначені лише клітинки в полі зору, прихований ворог не ціль", () => {
    const map = withExit();

    const people = [hero({ x: 1, y: 1 }, "s"), placed("e", { at: { x: 4, y: 1 } })];

    const player = scene(map, people, false);

    const cells = player.maze!.cells!;

    expect(moveKeys(player.scene.view.marks).every((k) => cells.has(k))).toBe(true);
    expect(player.scene.view.marks?.get("1:4")).toBe(3);
    expect(cells.has("4:1")).toBe(false);
    expect(player.scene.view.marks?.has("4:1")).toBe(false);
    expect(player.scene.view.marks?.has("3:1")).toBe(false);

    const dm = scene(map, people, true);

    expect(dm.scene.view.marks?.get("3:1")).toBe(2);
    expect(dm.scene.view.marks?.get("4:1")).toMatch(/target/);
  });

  it("клік по досяжній клітинці — хід туди", () => {
    const { scene: s } = scene(withExit(), [hero({ x: 1, y: 1 }, "s")], false);

    expect(s.cellClick({ x: 1, y: 3 })).toEqual({ kind: "move", participantId: "h", to: { x: 1, y: 3 }, free: false });
  });

  it("у темряві зони ходу немає", () => {
    const map = mazeMap({ dark: true });

    expect(moveKeys(scene(map, [hero({ x: 1, y: 1 }, "s")], true).scene.view.marks)).toHaveLength(0);
  });
});

describe("лабіринт без виходу ще не готовий", () => {
  it("немає зони ходу, клік по сусідній клітинці — не хід (і гравцю, і ДМ)", () => {
    for (const isDM of [false, true]) {
      const { scene: s } = scene(mazeMap(), [hero({ x: 1, y: 1 }, "s")], isDM);

      expect(moveKeys(s.view.marks)).toEqual([]);
      expect(s.cellClick({ x: 1, y: 2 }).kind).not.toBe("move");
    }
  });

  it("з виходом зона ходу є", () => {
    const { scene: s } = scene(withExit(), [hero({ x: 1, y: 1 }, "s")], false);

    expect(moveKeys(s.view.marks).length).toBeGreaterThan(0);
    expect(s.cellClick({ x: 1, y: 2 }).kind).toBe("move");
  });
});
