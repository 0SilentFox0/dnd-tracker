import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { createAddParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/add-participant/add-participant-mutation";
import { MAZE_NOT_READY } from "@/app/api/campaigns/[id]/battles/[battleId]/move/maze-move";
import { moveMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { revealParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/reveal-participant/reveal-participant-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import { MAZE_PLACEMENT_ERROR } from "@/lib/utils/battle/maze";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const maze = (over: Partial<MazeConfig> = {}): MazeConfig => ({ walls: [], exit: { x: 5, y: 0 }, difficulty: "medium", teleports: [], fog: [], marks: {}, dark: false, ...over });

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => ({ cols: 6, rows: 6, background: null, opacity: 0.3, maze: maze(over) });

const at = (p: BattleParticipant, position: GridPoint, extra: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => ({
  ...p,
  battleData: { ...p.battleData, position, ...extra },
});

const hero2 = participant("hero2", { controlledBy: "user-2", name: "Друга" });

const ctx = (over: Parameters<typeof context>[0] = {}, mazeOver: Partial<MazeConfig> = {}) => {
  const base = context({
    participants: [at(hero, { x: 0, y: 2 }, { facing: "e" }), at(hero2, { x: 0, y: 4 }), at(goblin, { x: 5, y: 5 }, { dormant: true })],
    ...over,
  });

  return { ...base, meta: { ...base.meta, map: mapOf(mazeOver) } };
};

const rejected = (fn: () => unknown, message?: string) =>
  expect(fn).toThrow(expect.objectContaining({ code: "action_rejected", ...(message && { message }) }));

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
    rejected(() => moveMutation(ctx({}, { walls: ["0:2:e", "0:1:s", "0:2:s"] }), { participantId: "hero", to: { x: 1, y: 2 } }));

    const tired = ctx({ participants: [at(hero, { x: 0, y: 2 }, { movementUsed: 3 }), at(goblin, { x: 5, y: 5 }, { dormant: true })] });

    rejected(() => moveMutation(tired, { participantId: "hero", to: { x: 1, y: 2 } }));

    rejected(() => moveMutation(ctx({}, { exit: null }), { participantId: "hero", to: { x: 1, y: 2 } }), MAZE_NOT_READY);
  });

  it("гравець не ходить у чужий хід", () => {
    const notMine = ctx({ scene: { ...context().scene, turnIndex: 1 } });

    expect(() => moveMutation(notMine, { participantId: "hero", to: { x: 1, y: 2 } })).toThrow(BattleAccessError);
  });

  it("розстановка ДМ до першого кроку: героя лише на край, з поглядом усередину; не на вихід і не на зайняту", () => {
    const dm = ctx({ isDM: true, userId: "dm-user", scene: { ...context().scene, turnIndex: 2 } });

    rejected(() => moveMutation(dm, { participantId: "hero", to: { x: 2, y: 2 } }), MAZE_PLACEMENT_ERROR.edge);
    rejected(() => moveMutation(dm, { participantId: "hero", to: { x: 5, y: 0 } }), MAZE_PLACEMENT_ERROR.exit);
    rejected(() => moveMutation(dm, { participantId: "hero", to: { x: 0, y: 4 } }), MAZE_PLACEMENT_ERROR.taken);

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

describe("maze: новий і розкритий ворог сплять", () => {
  const reserved = (id: string) => participant(id, { side: ParticipantSide.ENEMY, controlledBy: "dm" }, { battleData: { ...goblin.battleData, reserved: true } });

  it("reveal-participant у лабіринті — сплячим", () => {
    const out = revealParticipantMutation(ctx({ isDM: true, pending: [reserved("imp")] }), { participantIds: ["imp"] });

    expect(out.participants.find((p) => p.basicInfo.id === "imp")?.battleData.dormant).toBe(true);
  });

  it("add-participant: ворог сплячий на вказаній клітинці; на вихід — відмова", async () => {
    const deps = {
      loadCharacter: vi.fn(),
      loadUnit: vi.fn(async () => ({ id: "u1", campaignId: "c1" }) as never),
      fromCharacter: vi.fn(),
      fromUnit: vi.fn(async (_u: unknown, _b: string, side: ParticipantSide, n: number) => participant(`new-u${n}`, { side })),
    };

    const add = createAddParticipantMutation(deps);

    const out = await add(ctx({ isDM: true }), { sourceId: "u1", type: "unit", side: "enemy", quantity: 2, position: { x: 3, y: 3 } });

    const added = out.participants.filter((p) => p.basicInfo.id.startsWith("new-u"));

    expect(added.map((p) => p.battleData.dormant)).toEqual([true, true]);
    expect(added[0].battleData.position).toEqual({ x: 3, y: 3 });

    await expect(add(ctx({ isDM: true }), { sourceId: "u1", type: "unit", side: "enemy", quantity: 1, position: { x: 5, y: 0 } })).rejects.toMatchObject({ code: "action_rejected" });
  });
});
