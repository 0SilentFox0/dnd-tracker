import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ActionExecutionContext } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { executeBattleOperation } from "@/lib/utils/battle/pipeline/execute-battle-operation";
import { type PipelineDeps, runBattleMutation, type RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { LoadedBattle } from "@/lib/utils/battle/store";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const registry = vi.hoisted(() => ({ definition: {} as RunBattleMutationOptions<unknown> }));

vi.mock("@/lib/server/battles/operations", () => ({ getBattleOperation: async () => registry.definition }));

const actor: Actor = { campaignId: "c", userId: "u", isDM: true, via: "session", scopes: null };

const command = { operation: "next-turn", battleId: "b", input: {}, expectedVersion: 3 };

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", controlledBy: "u" } });

const enemy = createMockParticipant({ basicInfo: { ...hero.basicInfo, id: "enemy", side: "enemy", controlledBy: "other" } });

function loaded(): LoadedBattle & { isMember: boolean } {
  return { scene: { id: "b", campaignId: "c", status: "active", round: 1, turnIndex: 0, version: 3, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null }, meta: { name: "Battle", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, map: null, createdAt: new Date() }, participants: [hero, enemy], pending: [], isDM: false, isMember: true };
}

function deps(row = loaded()): PipelineDeps {
  return { getUserId: async () => "u", rateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 1 })), loadBattle: vi.fn(async () => row), saveBattle: vi.fn(async () => ({ battleId: "b", version: 4, scene: { status: "active" as const, round: 1, turnIndex: 0, pendingMoraleCheck: null }, upserted: [], fullIds: [], removed: [], events: [] })), publish: vi.fn(), loadRecentEvents: async () => [] };
}

const request = () => new Request("http://local/irrelevant", { method: "POST", body: JSON.stringify({ expectedVersion: 3 }) });

beforeEach(() => {
  registry.definition = { params: { id: "c", battleId: "b" }, access: "currentController", requireStatus: "active", schema: z.object({}), mutate: vi.fn(ctx => ({ participants: ctx.participants, pending: ctx.pending, events: [] })) };
});
describe("shared battle operation pipeline", () => {
  it("real next-turn definition preserves HTTP delta, events and actor result refs", async () => {
    const { getBattleOperation } = await vi.importActual<typeof import("@/lib/server/battles/operations")>("@/lib/server/battles/operations");

    registry.definition = { ...await getBattleOperation("next-turn", { id: "c", battleId: "b" }), params: { id: "c", battleId: "b" } };

    const httpDeps = deps();

    const actorDeps = deps();

    const http = await runBattleMutation(request(), { params: { id: "c", battleId: "b" }, operation: "next-turn" }, httpDeps);

    const result = await executeBattleOperation(actor, command, undefined, actorDeps);

    expect(http.status).toBe(200);
    expect(await http.json()).toHaveProperty("delta.version", 4);
    expect(result.data).toMatchObject({ version: 4 });

    const httpOutcome = vi.mocked(httpDeps.saveBattle).mock.calls[0][1];

    const actorOutcome = vi.mocked(actorDeps.saveBattle).mock.calls[0][1];

    expect(actorOutcome.scene).toEqual(httpOutcome.scene);
    expect(actorOutcome.participants).toEqual(httpOutcome.participants);
    expect(actorOutcome.events.map(event => event.type)).toEqual(httpOutcome.events.map(event => event.type));
    expect(actorOutcome.scene?.turnIndex).toBe(1);
  });
  it("actor flags cannot grant DM access and scope/version/context cannot be bypassed", async () => {
    registry.definition.access = "dm";

    const d = deps();

    await expect(executeBattleOperation(actor, command, undefined, d)).rejects.toMatchObject({ status: 403 });
    await expect(executeBattleOperation({ ...actor, via: "token", scopes: ["battles:read"] }, command, undefined, d)).rejects.toMatchObject({ status: 403 });
    await expect(executeBattleOperation(actor, { ...command, expectedVersion: NaN }, undefined, d)).rejects.toMatchObject({ status: 400 });

    const ctx = { caller: { actor: { ...actor, campaignId: "foreign" } }, db: {} } as ActionExecutionContext;

    await expect(executeBattleOperation(actor, command, ctx, d)).rejects.toMatchObject({ status: 403 });
    expect(d.saveBattle).not.toHaveBeenCalled();
  });
  it("same schema and rate limit reject both entry points before mutation", async () => {
    registry.definition.schema = z.object({ required: z.string() });

    const d = deps();

    expect((await runBattleMutation(request(), { params: { id: "c", battleId: "b" }, operation: "next-turn" }, d)).status).toBe(400);
    await expect(executeBattleOperation(actor, command, undefined, d)).rejects.toMatchObject({ status: 400 });
    registry.definition.rateLimitScope = "nextTurn";
    d.rateLimit = vi.fn(async () => ({ allowed: false, count: 31, limit: 30, retryAfterSeconds: 1 }));
    expect((await runBattleMutation(request(), { params: { id: "c", battleId: "b" }, operation: "next-turn" }, d)).status).toBe(429);
    await expect(executeBattleOperation(actor, command, undefined, d)).rejects.toMatchObject({ status: 429 });
    expect(d.saveBattle).not.toHaveBeenCalled();
  });
  it("missing campaign guard preserves HTTP 404", async () => {
    const d = deps();

    d.withWrite = async () => { throw new ContentError("Кампанію не знайдено", 404); };
    expect((await runBattleMutation(request(), { params: { id: "c", battleId: "b" }, operation: "next-turn" }, d)).status).toBe(404);
    expect(d.saveBattle).not.toHaveBeenCalled();
  });
  it("httpAndActorShareStatusAndTurnChecks", async () => {
    for (const change of [{ scene: { ...loaded().scene, status: "prepared" as const } }, { scene: { ...loaded().scene, turnIndex: 1 } }]) {
      const row = { ...loaded(), ...change };

      const d = deps(row);

      const http = await runBattleMutation(request(), { params: { id: "c", battleId: "b" }, operation: "next-turn" }, d);

      expect(http.status).toBe(422);
      await expect(executeBattleOperation(actor, command, undefined, d)).rejects.toMatchObject({ status: 422 });
      expect(d.saveBattle).not.toHaveBeenCalled();
    }
  });
  it("cannotBypassAwaitingDmOrMapMode", async () => {
    const row = loaded();

    row.participants = [hero, { ...enemy, combatStats: { ...enemy.combatStats, currentHp: 0, status: "dead" } }];
    row.pending = [{ ...enemy, battleData: { ...enemy.battleData, reserved: true } }];

    const d = deps(row);

    await expect(executeBattleOperation(actor, command, undefined, d)).rejects.toMatchObject({ code: "awaiting_dm" });
    expect(d.saveBattle).not.toHaveBeenCalled();
    registry.definition.blockedByMode = true;

    const dark = loaded();

    dark.meta.map = mazeMap({ dark: true });

    const modeDeps = deps(dark);

    await expect(executeBattleOperation(actor, command, undefined, modeDeps)).rejects.toMatchObject({ code: "action_rejected" });
    expect(modeDeps.saveBattle).not.toHaveBeenCalled();
  });
  it("wrongVersion409", async () => {
    const d = deps();

    await expect(executeBattleOperation(actor, { ...command, expectedVersion: 2 }, undefined, d)).rejects.toMatchObject({ status: 409 });
    expect(d.saveBattle).not.toHaveBeenCalled();
  });
  it("revokedActorBeforeSave", async () => {
    const d = deps();

    vi.mocked(d.loadBattle).mockResolvedValueOnce(loaded()).mockResolvedValue({ ...loaded(), isMember: false });
    await expect(executeBattleOperation(actor, command, undefined, d)).rejects.toMatchObject({ status: 403 });
    expect(d.saveBattle).not.toHaveBeenCalled();
  });
  it("receiptAndBattleSaveRollbackTogether", async () => {
    const d = deps();

    const db = { marker: true };

    const effects: unknown[] = [];

    const ctx = { caller: { actor }, db, intentId: "i", afterCommit: (effect: unknown) => effects.push(effect) } as unknown as ActionExecutionContext;

    d.saveBattle = vi.fn(async () => { throw new Error("SQL failure"); });
    await expect(executeBattleOperation(actor, command, ctx, d)).rejects.toThrow("SQL failure");
    expect(effects).toEqual([]);
    expect(d.publish).not.toHaveBeenCalled();
  });
  it("publishAfterCommitOnly", async () => {
    const d = deps();

    const effects: unknown[] = [];

    const ctx = { caller: { actor }, db: {}, intentId: "i", afterCommit: (effect: unknown) => effects.push(effect) } as unknown as ActionExecutionContext;

    const result = await executeBattleOperation(actor, command, ctx, d);

    expect(result.data).toMatchObject({ operation: "next-turn", battleId: "b", version: 4 });
    expect(JSON.stringify(result)).not.toContain("combatStats");
    expect(effects).toHaveLength(1);
    expect(d.publish).not.toHaveBeenCalled();
  });
});
