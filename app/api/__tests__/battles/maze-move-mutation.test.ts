import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { moveMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { at, expectRejected, mazeMap, withMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleMapConfig, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => mazeMap({ exit: { x: 5, y: 0 }, ...over }, 6);

const hero2 = participant("hero2", { controlledBy: "user-2", name: "Друга" });

const ctx = (over: Parameters<typeof context>[0] = {}, mazeOver: Partial<MazeConfig> = {}) => {
  const base = context({
    participants: [at(hero, { x: 0, y: 2 }, { facing: "e" }), at(hero2, { x: 0, y: 4 }), at(goblin, { x: 5, y: 5 }, { dormant: true })],
    ...over,
  });

  return withMap(base, mapOf(mazeOver));
};

describe("maze move mutation", () => {
  it("крок у свій хід: позиція, напрямок, кроки; перший крок героя ставить maze.moved", () => {
    const out = moveMutation(ctx(), { participantId: "hero", to: { x: 1, y: 3 } });

    expect(out.participants[0].battleData).toMatchObject({ position: { x: 1, y: 3 }, movementUsed: 1, facing: "se" });
    expect(out.scene?.map?.maze?.moved).toBe(true);
    expect(out.events).toEqual([]);

    const later = moveMutation(ctx({}, { moved: true }), { participantId: "hero", to: { x: 1, y: 2 } });

    expect(later.scene).toBeUndefined();
  });

  it("крізь стіну, 4-й крок і лабіринт без виходу — відмова", () => {
    expectRejected(() => moveMutation(ctx({}, { walls: ["0:2:e", "0:1:s", "0:2:s"] }), { participantId: "hero", to: { x: 1, y: 2 } }));

    const tired = ctx({ participants: [at(hero, { x: 0, y: 2 }, { movementUsed: 3 }), at(goblin, { x: 5, y: 5 }, { dormant: true })] });

    expectRejected(() => moveMutation(tired, { participantId: "hero", to: { x: 1, y: 2 } }));

    expectRejected(() => moveMutation(ctx({}, { exit: null }), { participantId: "hero", to: { x: 1, y: 2 } }), MAZE_TEXTS.notReady);
  });

  it("гравець не ходить у чужий хід", () => {
    const notMine = ctx({ scene: { ...context().scene, turnIndex: 1 } });

    expect(() => moveMutation(notMine, { participantId: "hero", to: { x: 1, y: 2 } })).toThrow(BattleAccessError);
  });

  it("розстановка ДМ до першого кроку: героя лише на край, з поглядом усередину; не на вихід і не на зайняту", () => {
    const dm = ctx({ isDM: true, userId: "dm-user", scene: { ...context().scene, turnIndex: 2 } });

    expectRejected(() => moveMutation(dm, { participantId: "hero", to: { x: 2, y: 2 } }), MAZE_TEXTS.placement.edge);
    expectRejected(() => moveMutation(dm, { participantId: "hero", to: { x: 5, y: 0 } }), MAZE_TEXTS.placement.exit);
    expectRejected(() => moveMutation(dm, { participantId: "hero", to: { x: 0, y: 4 } }), MAZE_TEXTS.placement.taken);

    const placed = moveMutation(dm, { participantId: "hero", to: { x: 3, y: 5 } });

    expect(placed.participants[0].battleData).toMatchObject({ position: { x: 3, y: 5 }, facing: "n" });
    expect(placed.participants[0].battleData.movementUsed).toBeUndefined();

    const enemy = moveMutation(dm, { participantId: "gob", to: { x: 2, y: 2 } });

    expect(enemy.participants[2].battleData.position).toEqual({ x: 2, y: 2 });
  });

  it("крок на вихід: вибрався, запис у журналі, хід перейшов до наступного", () => {
    const out = moveMutation(ctx({ participants: [at(hero, { x: 4, y: 0 }), at(hero2, { x: 0, y: 4 }), at(goblin, { x: 5, y: 5 }, { dormant: true })] }), {
      participantId: "hero",
      to: { x: 5, y: 0 },
    });

    expect(out.participants[0].battleData.escaped).toBe(true);
    expect(out.events[0].resultText).toContain("вибрався з лабіринту");
    expect(out.scene?.turnIndex).toBe(1);
  });
});
