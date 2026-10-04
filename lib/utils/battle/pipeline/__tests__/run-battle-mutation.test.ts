import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ParticipantSide } from "@/lib/constants/battle";
import type { PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleDelta, LoadedBattle } from "@/lib/utils/battle/store";
import { BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

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
    expect(outcome.events.at(-1)?.type).toBe("battle_end");
  });

  it("успіх — 200, відповідь з battle і delta, публікація дельти", async () => {
    const d = deps();

    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.delta.version).toBe(4);
    expect(json.battle.initiativeOrder).toHaveLength(2);
    expect(d.publish).toHaveBeenCalledWith("b1", expect.objectContaining({ version: 4 }));
  });

  it("завелика дельта — публікується refetch", async () => {
    const big = { ...delta(), upserted: Array.from({ length: 40 }, () => hero) };

    const d = deps({ saveBattle: vi.fn(async () => big) });

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(d.publish).toHaveBeenCalledWith("b1", { battleId: "b1", version: 4, refetch: true });
  });
});
