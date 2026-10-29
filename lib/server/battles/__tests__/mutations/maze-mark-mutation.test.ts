import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { mazeMarkSchema } from "@/lib/schemas/battles";
import { mazeMarkMutation } from "@/lib/server/battles/mutations/maze-mark/maze-mark-mutation";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";
import { markColor } from "@/lib/utils/battle/modes/maze";
import { at, mazeMap, withMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import type { BattleMutationContext, PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccess } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { MazeConfig } from "@/types/battle";

const hero2 = participant("hero2", { controlledBy: "user-2", name: "Друга" });

const ctx = (mazeOver: Partial<MazeConfig> = {}, over: Partial<BattleMutationContext> = {}, used = 0): BattleMutationContext => {
  const base = context({ participants: [at(hero, { x: 0, y: 2 }, { movementUsed: used }), at(hero2, { x: 0, y: 4 }), at(goblin, { x: 5, y: 5 }, { dormant: true })], ...over });

  return withMap(base, mazeMap({ exit: { x: 5, y: 0 }, moved: true, ...mazeOver }, 6));
};

describe("maze-mark mutation", () => {
  it("ставить мітку на свою клітинку кольором гравця і витрачає 1 крок", () => {
    const out = mazeMarkMutation(ctx(), { participantId: "hero", symbol: "skull" });

    expect(out.scene?.map?.maze?.marks["0:2"]).toEqual({ symbol: "skull", color: markColor("hero"), by: "hero" });
    expect(out.participants[0].battleData.movementUsed).toBe(1);
    expect(markColor("hero")).toBe(markColor("hero"));
  });

  it("4-та дія за хід → відмова", () => {
    expect(() => mazeMarkMutation(ctx({}, {}, 3), { participantId: "hero", symbol: "star" })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("чужий хід → 403, у тому числі для ДМ", () => {
    expect(() => mazeMarkMutation(ctx(), { participantId: "hero2", symbol: "star" })).toThrow(expect.objectContaining({ status: 403 }));
    expect(() => mazeMarkMutation(ctx({}, { isDM: true }), { participantId: "hero2", symbol: "star" })).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("у темряві маршрут відхиляє мітку до виклику мутації", async () => {
    const loaded = ctx({ dark: true });

    const deps: PipelineDeps = {
      getUserId: async () => loaded.userId,
      rateLimit: vi.fn(),
      loadBattle: async () => ({ scene: loaded.scene, meta: loaded.meta, participants: loaded.participants, pending: [], isDM: false, isMember: true }),
      saveBattle: vi.fn(),
      publish: vi.fn(),
      loadRecentEvents: async () => [],
    };

    const mutate = vi.fn();

    const res = await runBattleMutation(
      new Request("http://x/api", { method: "POST", body: JSON.stringify({ participantId: "hero", symbol: "star" }) }),
      { params: { id: "c1", battleId: "b1" }, access: BattleAccess.MEMBER, blockedByMode: true, schema: mazeMarkSchema, mutate } as never,
      deps,
    );

    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(API_ERRORS.MAZE_DARK);
    expect(mutate).not.toHaveBeenCalled();
  });
});
