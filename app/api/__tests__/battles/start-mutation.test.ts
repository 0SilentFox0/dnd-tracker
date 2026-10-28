import { describe, expect, it, vi } from "vitest";

import { createStartMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-mutation";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "prepared", round: 1, turnIndex: 0, version: 0, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [{ id: "u1", type: "unit", side: "enemy" }], friendlyFire: false, rules: DEFAULT_RULES, map: null, createdAt: new Date() },
  participants: [],
  pending: [],
  userId: "dm",
  isDM: true,
} as unknown as BattleMutationContext;

describe("start mutation", () => {
  it("будує учасників із лобі, ставить active, раунд 1, хід 0", async () => {
    const hero = createMockParticipant();

    const build = vi.fn(async () => ({ order: [hero], reserve: [], triggerLogEntries: [] }));

    const out = await createStartMutation(build)(ctx);

    expect(build).toHaveBeenCalledWith("b1", "c1", ctx.meta.setup, ctx.meta.map, DEFAULT_RULES);
    expect(out.participants).toEqual([hero]);
    expect(out.scene).toMatchObject({ status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null, completedAt: null });
    expect(out.scene?.startedAt).toBeInstanceOf(Date);
    expect(out.history).toEqual({ clear: true });
  });

  it("резерв зі старту йде в pending", async () => {
    const imp = createMockParticipant({ battleData: { ...createMockParticipant().battleData, reserved: true } });

    const build = vi.fn(async () => ({ order: [createMockParticipant()], reserve: [imp], triggerLogEntries: [] }));

    const out = await createStartMutation(build)(ctx);

    expect(out.pending).toEqual([imp]);
  });

  it("увесь склад у резерві — 422, на полі нікого", async () => {
    const imp = createMockParticipant({ battleData: { ...createMockParticipant().battleData, reserved: true } });

    const build = vi.fn(async () => ({ order: [], reserve: [imp], triggerLogEntries: [] }));

    await expect(createStartMutation(build)(ctx)).rejects.toMatchObject({ code: "invalid_target", message: "Хоча б один учасник має бути на полі" });
  });

  it("порожнє лобі — 422 invalid_target", async () => {
    await expect(createStartMutation(vi.fn())({ ...ctx, meta: { ...ctx.meta, setup: [] } } as never)).rejects.toMatchObject({ code: "invalid_target" });
  });

  it("не перепризначає керування юнітами: союзний юніт під DM лишається під DM", async () => {
    const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "h", sourceType: "character", side: "ally", controlledBy: "p1" } });

    const unit = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "u", sourceType: "unit", side: "ally", controlledBy: "dm" } });

    const out = await createStartMutation(vi.fn(async () => ({ order: [hero, unit], reserve: [], triggerLogEntries: [] })))(ctx);

    expect(out.participants.find((p) => p.basicInfo.id === "u")?.basicInfo.controlledBy).toBe("dm");
  });

  it("фіксує правила кампанії в сцені й передає їх у побудову", async () => {
    const rules = { ...DEFAULT_RULES, morale: { ...DEFAULT_RULES.morale, enabled: false } };

    const build = vi.fn(async () => ({ order: [createMockParticipant()], reserve: [], triggerLogEntries: [] }));

    const out = await createStartMutation(build)({ ...ctx, meta: { ...ctx.meta, rules } } as never);

    expect(out.scene?.rules).toEqual(rules);
    expect(build).toHaveBeenCalledWith("b1", "c1", ctx.meta.setup, ctx.meta.map, rules);
  });
});
