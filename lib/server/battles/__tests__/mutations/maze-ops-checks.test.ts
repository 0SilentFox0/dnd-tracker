import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { mazeMutation } from "@/lib/server/battles/mutations/maze/maze-mutation";
import { at, expectRejected, mazeMap, withMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { MazeActionData as MazeAction } from "@/types/api";
import type { MazeConfig } from "@/types/battle";

const ctx = (mazeOver: Partial<MazeConfig> = {}, participants = [at(hero, { x: 0, y: 2 }), at(goblin, { x: 6, y: 6 })]): BattleMutationContext => {
  const base = context({ participants, isDM: true });

  return withMap(base, mazeMap({ exit: { x: 7, y: 0 }, ...mazeOver }));
};

// герой у кишені (0,7)–(1,7), єдиний вихід — через (2,7); (3,3) замкнена з усіх боків
const trap = {
  walls: ["0:6:s", "1:6:s", "2:6:s", "2:3:e", "3:3:e", "3:2:s", "3:3:s"],
};

describe("maze ops: телепорти й вихід перевіряються так, як ходять учасники", () => {
  it("телепорт на вузькому місці в замкнену клітинку → відмова; той самий в іншому місці — можна", () => {
    const base = ctx(trap, [at(hero, { x: 0, y: 7 }), at(goblin, { x: 6, y: 6 })]);

    expectRejected(() => mazeMutation(base, { op: "teleport", pair: [{ x: 2, y: 7 }, { x: 3, y: 3 }] }), "Ці стіни замурують учасника — шляху до виходу не залишиться");

    expect(mazeMutation(base, { op: "teleport", pair: [{ x: 5, y: 5 }, { x: 3, y: 3 }] }).scene?.map?.maze?.teleports).toHaveLength(1);
  });

  it("телепорт на клітинку учасника → відмова", () => {
    expectRejected(() => mazeMutation(ctx(), { op: "teleport", pair: [{ x: 0, y: 2 }, { x: 5, y: 5 }] }), "Телепорт не можна поставити сюди");
  });

  it("вихід на клітинку телепорта → відмова", () => {
    expectRejected(() => mazeMutation(ctx({ teleports: [[{ x: 7, y: 3 }, { x: 2, y: 5 }]] }), { op: "exit", cell: { x: 7, y: 3 } }), "Вихід не можна ставити на телепорт");
  });

  it("стіни, що лишають прохід лише через телепорт у кишеню → відмова", () => {
    const base = ctx({ walls: ["0:6:s", "2:6:s", "2:3:e", "3:3:e", "3:2:s", "3:3:s"], teleports: [[{ x: 2, y: 7 }, { x: 3, y: 3 }]] }, [at(hero, { x: 0, y: 7 }), at(goblin, { x: 6, y: 6 })]);

    expect(mazeMutation(base, { op: "walls", add: ["5:5:e"], remove: [] }).scene?.map?.maze?.walls).toContain("5:5:e");
    expectRejected(() => mazeMutation(base, { op: "walls", add: ["1:6:s"], remove: [] }), "Ці стіни замурують учасника — шляху до виходу не залишиться");
  });
});

describe("maze ops: великі дії ДМ пишуть коротку подію (ціль для відкату)", () => {
  const cases: Array<[MazeAction, string]> = [
    [{ op: "generate", difficulty: "easy", teleportPairs: 0, fogPatches: 0, exit: null }, MAZE_TEXTS.ops.generate],
    [{ op: "reshuffle", mode: "walls", teleportPairs: 0, fogPatches: 0 }, MAZE_TEXTS.ops.reshuffle],
    [{ op: "dark", on: true }, MAZE_TEXTS.ops.darkOn],
    [{ op: "dark", on: false }, MAZE_TEXTS.ops.darkOff],
    [{ op: "scatterStarts" }, MAZE_TEXTS.ops.scatterStarts],
  ];

  it.each(cases)("%o", (action, text) => {
    const out = mazeMutation(ctx(), action);

    const kind = action.op === "reshuffle" ? "reshuffle" : "op";

    expect(out.events[0]).toMatchObject({ actorId: "dm", resultText: text, details: { actionDetails: { mazeEvent: kind } } });
  });
});

describe("maze ops: правки пензлем без події (і без знімка)", () => {
  const edits: MazeAction[] = [
    { op: "walls", add: ["3:3:e"], remove: [] },
    { op: "exit", cell: { x: 7, y: 4 } },
    { op: "teleport", pair: [{ x: 2, y: 2 }, { x: 5, y: 5 }] },
    { op: "fog", cells: ["2:2"], on: true },
  ];

  it.each(edits)("%o", (action) => {
    const out = mazeMutation(ctx(), action);

    expect(out.events).toEqual([]);
    expect(out.scene?.map?.maze).toBeTruthy();
  });
});
