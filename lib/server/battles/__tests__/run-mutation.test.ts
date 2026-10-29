import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ParticipantSide } from "@/lib/constants/battle";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMutationContext, PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleDelta, LoadedBattle } from "@/lib/utils/battle/store";
import { BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

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
      pendingMoraleCheck: null, pendingCritChoice: null,
      startedAt: null,
      completedAt: null,
    },
    meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, critChoiceByDm: false, map: null, createdAt: new Date("2026-01-01") },
    participants: [hero, goblin],
    pending: [],
    isDM: false,
    isMember: true,
    ...over,
  };
}

function withMap(): LoadedBattle & { isMember: boolean } {
  const base = loaded();

  return { ...base, meta: { ...base.meta, map: { cols: 10, rows: 5, background: null, opacity: 0.3 } } };
}

function delta(): BattleDelta {
  return {
    battleId: "b1",
    version: 4,
    scene: { status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null, pendingCritChoice: null },
    upserted: [],
    fullIds: [],
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

describe("runBattleMutation: завершення бою", () => {
  const complete = vi.fn((ctx) => ({ participants: ctx.participants, pending: ctx.pending, scene: { status: "completed" as const, completedAt: new Date() }, events: [] }));

  it("перехід у completed викликає onLeftActive(campaignId, battleId)", async () => {
    const onLeftActive = vi.fn();

    await runBattleMutation(req(), { params, access: "member", mutate: complete }, deps({ onLeftActive }));

    expect(onLeftActive).toHaveBeenCalledWith("c1", "b1");
  });

  it("скидання active → prepared також викликає onLeftActive", async () => {
    const onLeftActive = vi.fn();

    await runBattleMutation(req(), { params, access: "member", mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, scene: { status: "prepared" as const }, events: [] }) }, deps({ onLeftActive }));

    expect(onLeftActive).toHaveBeenCalledWith("c1", "b1");
  });

  it("звичайна дія onLeftActive не викликає", async () => {
    const onLeftActive = vi.fn();

    await runBattleMutation(req(), { params, access: "member", mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }) }, deps({ onLeftActive }));

    expect(onLeftActive).not.toHaveBeenCalled();
  });
});

describe("runBattleMutation", () => {
  it("rng із залежностей потрапляє в контекст мутації", async () => {
    const rng = () => 0.42;

    const mutate = vi.fn((ctx: BattleMutationContext) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }));

    await runBattleMutation(req(), { params, access: "member", mutate }, deps({ rng }));

    expect(mutate.mock.calls[0][0].rng).toBe(rng);
  });

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

  it("currentController: не твій хід — 422 not_your_turn", async () => {
    const res = await runBattleMutation(
      req(),
      { params, access: "currentController", mutate: noop },
      deps({ loadBattle: vi.fn(async () => loaded({ scene: { ...loaded().scene, turnIndex: 1 } })) }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "not_your_turn" });
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
    const d = deps({ saveBattle: vi.fn(async () => ({ ...delta(), upserted: [goblin], fullIds: ["gob"] })) });

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

    const d = deps({ saveBattle: vi.fn(async () => ({ ...delta(), upserted: many, fullIds: many.map((p) => p.basicInfo.id) })) });

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
      saveBattle: vi.fn(async () => ({ ...delta(), upserted: [ten[3]], fullIds: ["p3"] })),
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

  it("розставляє учасників без позиції, коли в бою є карта", async () => {
    const d = deps({ loadBattle: vi.fn(async () => withMap()) });

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    const saved = vi.mocked(d.saveBattle).mock.calls[0][1].participants;

    expect(saved.every((p) => p.battleData.position !== undefined)).toBe(true);
  });

  it("змінена мутацією карта йде в збереження й розстановку, зміни місцевості — у відповідь і Pusher", async () => {
    const d = deps({ loadBattle: vi.fn(async () => withMap()) });

    const nextMap = { cols: 10, rows: 5, background: null, opacity: 0.3, terrain: { "0:0": { kind: "wall" as const } } };

    const res = await runBattleMutation(
      req(),
      {
        params,
        access: "member",
        mutate: (ctx) => ({
          participants: ctx.participants.map((p) => ({ ...p, battleData: { ...p.battleData, position: { x: 0, y: 0 } } })),
          pending: ctx.pending,
          events: [],
          scene: { map: nextMap },
        }),
      },
      d,
    );

    const outcome = vi.mocked(d.saveBattle).mock.calls[0][1];

    expect(outcome.scene?.map).toEqual(nextMap);
    expect(outcome.participants.some((p) => p.battleData.position?.x === 0 && p.battleData.position.y === 0)).toBe(false);

    const terrain = { set: [{ cell: { kind: "wall" }, keys: ["0:0"] }] };

    expect((await res.json()).delta.scene).toMatchObject({ terrain });
    expect(vi.mocked(d.publish).mock.calls[0][0][0].payload).toMatchObject({ scene: { terrain } });
  });

  it("без зміни карти дельта її не несе", async () => {
    const d = deps({ loadBattle: vi.fn(async () => withMap()) });

    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect((await res.json()).delta.scene).not.toHaveProperty("map");
  });

  it("аури за радіусом синхронізуються на карті (зберігання і dryRun), без карти - ні", async () => {
    const fear = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: -2, target: "nearbyEnemies" }] });

    const place = (p: BattleParticipant, x: number, extra: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position: { x, y: 0 }, ...extra } });

    const ps = [place(hero, 1), place(goblin, 2, { resolvedAbilities: [fear] })];

    const zoned = (list: BattleParticipant[]) => list[0].battleData.activeEffects.some((e) => e.zone);

    const d = deps({ loadBattle: vi.fn(async () => ({ ...withMap(), participants: ps })) });

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(zoned(vi.mocked(d.saveBattle).mock.calls[0][1].participants)).toBe(true);

    const res = await runBattleMutation(req(), { params, access: "member", dryRun: () => true, mutate: noop }, d);

    expect(JSON.stringify(await res.json())).toContain("zone:");

    const plain = deps({ loadBattle: vi.fn(async () => ({ ...loaded(), participants: ps })) });

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, plain);

    expect(zoned(vi.mocked(plain.saveBattle).mock.calls[0][1].participants)).toBe(false);
  });

  it("бій без карти позицій не додає", async () => {
    const d = deps();

    await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    const saved = vi.mocked(d.saveBattle).mock.calls[0][1].participants;

    expect(saved.some((p) => p.battleData.position !== undefined)).toBe(false);
  });

  it("dryRun з картою позицій не додає і нічого не зберігає", async () => {
    const d = deps({ loadBattle: vi.fn(async () => withMap()) });

    const res = await runBattleMutation(req(), { params, access: "member", dryRun: () => true, mutate: noop }, d);

    const json = await res.json();

    expect(d.saveBattle).not.toHaveBeenCalled();
    expect(JSON.stringify(json)).not.toContain('"position"');
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

  it("відкат несе перераховане знання з сервера, reset — порожнє, звичайна дія — без знання", async () => {
    const knowledge = { gob: { ac: { min: 12, evidence: [] }, traits: [] } };

    const loadKnowledge = vi.fn(async () => knowledge);

    const run = (history?: { cancelFromSeq: number } | { clear: true }) =>
      runBattleMutation(
        req(),
        { params, access: "member", mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [], history }) },
        deps({ loadKnowledge }),
      ).then((r) => r.json());

    expect((await run({ cancelFromSeq: 3 })).delta.knowledge).toEqual(knowledge);
    expect(loadKnowledge).toHaveBeenCalledWith("b1");
    expect((await run({ clear: true })).delta.knowledge).toEqual({});
    expect((await run()).delta).not.toHaveProperty("knowledge");
    expect(loadKnowledge).toHaveBeenCalledTimes(1);
  });
});

describe("резерв і рішення ДМ", () => {
  const deadGob = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

  const imp = createMockParticipant({ basicInfo: { ...goblin.basicInfo, id: "imp" }, battleData: { ...goblin.battleData, reserved: true } });

  const awaiting = () => loaded({ participants: [hero, deadGob], pending: [imp], isDM: true });

  it("у стані очікування бойова дія відхиляється 422", async () => {
    const d = deps({ getUserId: vi.fn(async () => "dm"), loadBattle: vi.fn(async () => awaiting()) });

    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, d);

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("awaiting_dm");
  });

  it("dryRun у стані очікування не відхиляється", async () => {
    const d = deps({ getUserId: vi.fn(async () => "dm"), loadBattle: vi.fn(async () => awaiting()) });

    const res = await runBattleMutation(req(), { params, access: "member", dryRun: () => true, mutate: noop }, d);

    expect(res.status).toBe(200);
    expect(d.saveBattle).not.toHaveBeenCalled();
  });

  it("allowWhileAwaitingDm пропускає і не завершує бій", async () => {
    const d = deps({ getUserId: vi.fn(async () => "dm"), loadBattle: vi.fn(async () => awaiting()) });

    const res = await runBattleMutation(req(), { params, access: "dm", allowWhileAwaitingDm: true, mutate: noop }, d);

    expect(res.status).toBe(200);
    expect(vi.mocked(d.saveBattle).mock.calls[0][1].scene?.status).toBeUndefined();
  });

  it("мутація, що вбиває, чистить ефекти; воскресіння ставить на найближчу вільну клітинку", async () => {
    const at = (p: BattleParticipant, x: number, y: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position: { x, y } } });

    const effect = { id: "e", name: "Щит", type: "buff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [] };

    const dead = { ...at(hero, 3, 2), combatStats: { ...hero.combatStats, status: "dead" as const, currentHp: 0 } };

    const stander = at(goblin, 3, 2);

    const before = withMap();

    const kill = deps({ loadBattle: vi.fn(async () => ({ ...before, participants: [at(hero, 3, 2), stander] })) });

    await runBattleMutation(
      req(),
      {
        params,
        access: "member",
        mutate: (ctx) => ({
          participants: ctx.participants.map((p) => (p.basicInfo.id === "hero" ? { ...dead, battleData: { ...dead.battleData, activeEffects: [effect] } } : p)),
          pending: ctx.pending,
          events: [],
        }),
      },
      kill,
    );

    expect(vi.mocked(kill.saveBattle).mock.calls[0][1].participants[0].battleData.activeEffects).toEqual([]);

    const raise = deps({ loadBattle: vi.fn(async () => ({ ...before, participants: [dead, stander] })) });

    await runBattleMutation(
      req(),
      {
        params,
        access: "member",
        mutate: (ctx) => ({
          participants: ctx.participants.map((p) => (p.basicInfo.id === "hero" ? { ...p, combatStats: { ...p.combatStats, status: "active" as const, currentHp: 1 } } : p)),
          pending: ctx.pending,
          events: [],
        }),
      },
      raise,
    );

    const saved = vi.mocked(raise.saveBattle).mock.calls[0][1].participants;

    expect(saved[1].battleData.position).toEqual({ x: 3, y: 2 });
    expect(saved[0].battleData.position).not.toEqual({ x: 3, y: 2 });
    expect(saved[0].battleData.position).toBeDefined();
  });
});

describe("runBattleMutation: недійсні захоплення", () => {
  const grappledBy = (target: BattleParticipant, grapplerId: string): BattleParticipant => ({
    ...target,
    battleData: {
      ...target.battleData,
      activeEffects: [{ id: "g1", type: "condition", abilityKey: `core:grapple:${grapplerId}`, name: "Схоплений", effects: [{ type: "grappled", value: 1 }], remainingRounds: 99, source: { participantId: grapplerId, name: grapplerId } } as never],
    },
  });

  const savedAfter = async (participants: BattleParticipant[]) => {
    const d = deps();

    await runBattleMutation(req(), { params, access: "member", mutate: () => ({ participants, pending: [], events: [] }) }, d);

    return vi.mocked(d.saveBattle).mock.calls[0][1];
  };

  it("схоплювач упав до 0 HP — ціль звільнено, подія в журналі", async () => {
    const deadGrappler = { ...goblin, combatStats: { ...goblin.combatStats, currentHp: 0, status: "dead" as const } };

    const out = await savedAfter([grappledBy(hero, "gob"), deadGrappler, { ...goblin, basicInfo: { ...goblin.basicInfo, id: "gob2" } }]);

    expect(out.participants.find((p) => p.basicInfo.id === "hero")!.battleData.activeEffects).toEqual([]);
    expect(out.events.some((e) => e.resultText?.includes("відпускає"))).toBe(true);
  });

  it("живий суміжний схоплювач — без змін і без подій", async () => {
    const out = await savedAfter([grappledBy(hero, "gob"), goblin]);

    expect(out.participants.find((p) => p.basicInfo.id === "hero")!.battleData.activeEffects).toHaveLength(1);
    expect(out.events).toEqual([]);
  });
});

describe("runBattleMutation: pending крита", () => {
  const stored = { action: "attack" as const, actorId: "hero", triggers: [], request: { secret: "req" }, seed: 424242, userId: "u", isDM: false };

  const pendingLoaded = () => {
    const base = loaded({ isDM: true });

    return { ...base, scene: { ...base.scene, pendingCritChoice: stored } };
  };

  const dmDeps = (over: Partial<PipelineDeps> = {}) => deps({ getUserId: vi.fn(async () => "dm"), loadBattle: vi.fn(async () => pendingLoaded()), ...over });

  it("інша дія при pending — 422 crit_pending", async () => {
    const res = await runBattleMutation(req(), { params, access: "member", mutate: noop }, dmDeps());

    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("crit_pending");
  });

  it("dryRun і allowWhileCritPending проходять", async () => {
    expect((await runBattleMutation(req(), { params, access: "member", dryRun: () => true, mutate: noop }, dmDeps())).status).toBe(200);
    expect((await runBattleMutation(req(), { params, access: "member", allowWhileCritPending: true, mutate: noop }, dmDeps())).status).toBe(200);
  });

  it("результат лише зі scene-патчем: delta і Pusher несуть публічний pending без request/seed", async () => {
    const publish = vi.fn();

    const d = deps({
      saveBattle: vi.fn(async () => ({ ...delta(), version: 4 })),
      publish,
    });

    const res = await runBattleMutation(
      req(),
      { params, access: "member", mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [], scene: { pendingCritChoice: stored } }) },
      d,
    );

    const json = await res.json();

    expect(json.delta.version).toBe(4);
    expect(json.delta.scene.pendingCritChoice).toEqual({ action: "attack", actorId: "hero", triggers: [] });

    const sent = JSON.stringify(publish.mock.calls);

    expect(sent).toContain("pendingCritChoice");
    expect(sent).not.toContain("424242");
    expect(sent).not.toContain("secret");
    expect(JSON.stringify(json)).not.toContain("424242");
  });
});
