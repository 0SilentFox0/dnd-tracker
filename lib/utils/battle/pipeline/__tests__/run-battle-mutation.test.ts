import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleMutationContext, PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleDelta, LoadedBattle } from "@/lib/utils/battle/store";
import { BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";

const hero = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "hero", controlledBy: "u-player" } });

const goblin = createMockParticipant({
  basicInfo: { ...createMockParticipant().basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" },
});

function loaded(over: Partial<LoadedBattle> = {}): LoadedBattle & { isMember: boolean } {
  return {
    scene: {
      id: "b1",
      campaignId: "c1",
      status: "active",
      round: 1,
      turnIndex: 0,
      version: 3,
      eventSeq: 4,
      pendingMoraleCheck: null,
      startedAt: null,
      completedAt: null,
    },
    meta: { name: "Бій", description: null, setup: [], friendlyFire: false, createdAt: new Date("2026-01-01") },
    participants: [hero, goblin],
    pending: [],
    isDM: false,
    isMember: true,
    ...over,
  };
}

function delta(): BattleDelta {
  return {
    battleId: "b1",
    version: 4,
    scene: { status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null },
    upserted: [],
    removed: [],
    events: [],
  };
}

function deps(over: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    getUserId: vi.fn(async () => "u-player"),
    rateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 })),
    loadBattle: vi.fn(async () => loaded()),
    saveBattle: vi.fn(async () => delta()),
    publish: vi.fn(),
    loadRecentEvents: vi.fn(async () => []),
    ...over,
  };
}

const params = { id: "c1", battleId: "b1" };

const req = (body: unknown = {}) =>
  new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });

const noop = vi.fn((ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }));

describe("runBattleMutation", () => {
  it("без сесії — 401, БД не чіпаємо", async () => {
    const d = deps({ getUserId: vi.fn(async () => null) });

    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(res.status).toBe(401);
    expect(d.loadBattle).not.toHaveBeenCalled();
  });

  it("немає бою — 404", async () => {
    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, deps({ loadBattle: vi.fn(async () => null) }));

    expect(res.status).toBe(404);
  });

  it("не учасник кампанії — 403", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "member", mutate: noop },
      deps({ loadBattle: vi.fn(async () => ({ ...loaded(), isMember: false })) }),
    );

    expect(res.status).toBe(403);
  });

  it("dm-дія від гравця — 403", async () => {
    const res = await runBattleMutation(req(), { params, access: "dm", mutate: noop }, deps());

    expect(res.status).toBe(403);
  });

  it("turnController: не твій хід — 422 not_your_turn", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "turnController", mutate: noop },
      deps({ loadBattle: vi.fn(async () => loaded({ scene: { ...loaded().scene, turnIndex: 1 } })) }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "not_your_turn" });
  });

  it("turnController: твій учасник непритомний — 422 participant_dead", async () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, status: "unconscious" as const } };

    const res = await runBattleMutation(
      req(),
      { params, access: "turnController", mutate: noop },
      deps({ loadBattle: vi.fn(async () => loaded({ participants: [downed, goblin] })) }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "participant_dead" });
  });

  it("невідповідний статус бою — 422 wrong_status", async () => {
    const res = await runBattleMutation(req(), { params, access: "member", requireStatus: "prepared", mutate: noop }, deps());

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "wrong_status" });
  });

  it("невалідне тіло — 400, mutate не викликається", async () => {
    const mutate = vi.fn(noop);

    const res = await runBattleMutation(
      req({ targetId: 5 }),
      { params, access: "member", schema: z.object({ targetId: z.string() }), mutate },
      deps(),
    );

    expect(res.status).toBe(400);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("expectedVersion застаріла — 409 без мутації", async () => {
    const mutate = vi.fn(noop);

    const res = await runBattleMutation(
      req({ expectedVersion: 2 }),
      { params, access: "member", schema: z.object({ expectedVersion: z.number() }), mutate },
      deps(),
    );

    expect(res.status).toBe(409);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("конфлікт при збереженні — 409", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "member", mutate: noop },
      deps({ saveBattle: vi.fn(async () => { throw new BattleConflictError(); }) }),
    );

    expect(res.status).toBe(409);
  });

  it("mutate кидає правило — 422, нічого не зберігається і не публікується", async () => {
    const d = deps();

    const res = await runBattleMutation(
      req(),
      {
        params,
        access: "member",
        mutate: () => {
          throw new BattleRuleError("invalid_dice", "Кидок поза межами кубика");
        },
      },
      d,
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "invalid_dice" });
    expect(d.saveBattle).not.toHaveBeenCalled();
    expect(d.publish).not.toHaveBeenCalled();
  });

  it("rate limit — 429", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "member", rateLimitScope: "attack", mutate: noop },
      deps({ rateLimit: vi.fn(async () => ({ allowed: false, count: 31, limit: 30, retryAfterSeconds: 4 })) }),
    );

    expect(res.status).toBe(429);
  });

  it("усі вороги впали — бій завершується тим самим збереженням", async () => {
    const d = deps();

    const deadGoblin = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    await runBattleMutation(
      req(),
      { params, access: "member", mutate: () => ({ participants: [hero, deadGoblin], pending: [], events: [] }) },
      d,
    );

    const outcome = vi.mocked(d.saveBattle).mock.calls[0][1];

    expect(outcome.scene?.status).toBe("completed");
    expect(outcome.scene?.completedAt).toBeInstanceOf(Date);
    expect(outcome.events.at(-1)).toMatchObject({ type: "end_turn", resultText: expect.stringContaining("Бій завершено") });
  });

  it("успіх — 200, { delta, response } для того, хто діяв, і battle-delta для інших", async () => {
    const d = deps({ saveBattle: vi.fn(async () => ({ ...delta(), upserted: [goblin] })) });

    const mutate = vi.fn((ctx: BattleMutationContext) => ({
      participants: ctx.participants, pending: ctx.pending, events: [], response: { moraleResult: { ok: true } },
    }));

    const res = await runBattleMutation(req(), { params, access: "member", mutate }, d);

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.delta).toMatchObject({ battleId: "b1", version: 4, removed: [] });
    expect(json.delta.upserted.map((p: { basicInfo: { id: string } }) => p.basicInfo.id)).toEqual(["gob"]);
    expect(json.response).toEqual({ moraleResult: { ok: true } });

    const messages = vi.mocked(d.publish).mock.calls[0][0];

    expect(messages[0]).toMatchObject({ event: "battle-delta", channel: "private-battle-b1" });
    expect(messages[0].payload).toEqual(json.delta);
  });

  it("велика дельта — battle-delta з refetch, відповідь усе одно повна", async () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      createMockParticipant({ basicInfo: { ...hero.basicInfo, id: `h${i}` } }),
    );

    const d = deps({ saveBattle: vi.fn(async () => ({ ...delta(), upserted: many })) });

    const res = await runBattleMutation(req(), { params, access: "member", mutate: () => ({ participants: many, pending: [], events: [] }) }, d);

    expect((await res.json()).delta.upserted).toHaveLength(60);
    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toEqual({ battleId: "b1", version: 4, refetch: true });
  });

  it("ліміт — у байтах: довгий кириличний запис журналу дає refetch", async () => {
    const text = "Ш".repeat(6_000);

    const cyr = { ...delta(), events: [{ seq: 5, type: "attack", round: 1, actorId: null, targets: [], details: {}, hpChanges: [], resultText: text }] };

    const d = deps({ saveBattle: vi.fn(async () => cyr) });

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toEqual({ battleId: "b1", version: 4, refetch: true });
  });

  it("бій із 10 учасниками, атака по одній цілі — дельта вміщується в Pusher", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => createMockParticipant({ basicInfo: { ...hero.basicInfo, id: `p${i}` } }));

    const d = deps({
      loadBattle: vi.fn(async () => loaded({ participants: ten })),
      saveBattle: vi.fn(async () => ({ ...delta(), upserted: [ten[3]] })),
    });

    await runBattleMutation(req(), { params, access: "member", mutate: (ctx) => ({ participants: ctx.participants, pending: [], events: [] }) }, d);

    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toHaveProperty("upserted");
  });

  it("currentController: контролер непритомного учасника може передати хід", async () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, status: "unconscious" as const } };

    const res = await runBattleMutation(
      req(),
      { params, access: "currentController", mutate: noop },
      deps({ loadBattle: vi.fn(async () => loaded({ participants: [downed, goblin] })) }),
    );

    expect(res.status).toBe(200);
  });

  it("dryRun: нічого не зберігає і не публікує, повертає response", async () => {
    const d = deps();

    const res = await runBattleMutation(
      req({ preview: true }),
      {
        params,
        access: "member",
        schema: z.object({ preview: z.boolean() }),
        dryRun: (b) => b.preview,
        respond: "response",
        mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [], response: { preview: true } }),
      },
      d,
    );

    expect(await res.json()).toEqual({ preview: true });
    expect(d.saveBattle).not.toHaveBeenCalled();
    expect(d.publish).not.toHaveBeenCalled();
  });

  it("expectedVersion перевіряється, навіть якщо схема роуту його не оголошує", async () => {
    const mutate = vi.fn((ctx: BattleMutationContext) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }));

    const res = await runBattleMutation(
      req({ targetId: "gob", expectedVersion: 2 }),
      { params, access: "member", schema: z.object({ targetId: z.string() }), mutate },
      deps(),
    );

    expect(res.status).toBe(409);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("expectedVersion перевіряється і для роуту без схеми", async () => {
    const res = await runBattleMutation(req({ expectedVersion: 2 }), { params, access: "member", mutate: noop }, deps());

    expect(res.status).toBe(409);
  });

  it("очищення історії (reset/start) скасовує весь журнал у клієнтів", async () => {
    const d = deps();

    const res = await runBattleMutation(
      req(),
      { params, access: "member", mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [], history: { clear: true } }) },
      d,
    );

    expect((await res.json()).delta.cancelledFrom).toBe(0);
    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toMatchObject({ cancelledFrom: 0 });
  });
});
