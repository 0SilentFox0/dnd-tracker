import { describe, expect, it, vi } from "vitest";

import { context, goblin as baseGoblin, hero as baseHero } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, BattleStatus } from "@/lib/constants/battle";
import { critChoiceSchema } from "@/lib/schemas";
import { attackBodySchema, createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { completeMutation } from "@/lib/server/battles/mutations/complete/complete-mutation";
import { createCritChoiceMutation } from "@/lib/server/battles/mutations/crit-choice/crit-choice-mutation";
import { resetMutation } from "@/lib/server/battles/mutations/reset/reset-mutation";
import { createRollbackMutation } from "@/lib/server/battles/mutations/rollback/rollback-mutation";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";
import { critEffectsFor } from "@/lib/utils/battle/crit-choice/catalog";
import type { StoredPendingCritChoice } from "@/lib/utils/battle/crit-choice/types";
import type { BattleMutationContext, PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { diffParticipants, splitParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";

const hero = { ...baseHero, battleData: { ...baseHero.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] } };

const goblin = { ...baseGoblin, combatStats: { ...baseGoblin.combatStats, maxHp: 100, currentHp: 100 } };

const deps = { loadPool: async () => ({ units: [], races: [] }), loadSpells: async () => [], loadSpell: async () => null };

const attack = createAttackMutation(deps);

const critChoice = createCritChoiceMutation({ attack, spell: createSpellMutation(deps) });

const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 20, damageRolls: [4], ...over });

const on = () => {
  const c = context({ participants: [hero, goblin], isDM: true, userId: "dm" });

  return { ...c, meta: { ...c.meta, critChoiceByDm: true } };
};

async function pendingCtx(over: Record<string, unknown> = {}): Promise<{ ctx: BattleMutationContext; pending: StoredPendingCritChoice }> {
  const c = on();

  const out = await attack(c, body(over));

  const pending = out.scene?.pendingCritChoice as StoredPendingCritChoice;

  return { ctx: { ...c, scene: { ...c.scene, pendingCritChoice: pending } }, pending };
}

const KEY = "attack:hero:gob:0";

const effect = critEffectsFor("attack", "success")[0];

describe("crit-choice mutation", () => {
  it("повний вибір: ефект застосовано, pending очищено, подія є", async () => {
    const { ctx } = await pendingCtx();

    const out = await critChoice(ctx, { choices: { [KEY]: effect.id } });

    expect(out.scene?.pendingCritChoice).toBeNull();
    expect(out.events).toHaveLength(1);
    expect(eventTextOf(out.events[0])).toContain(effect.name);
  });

  it("«random» для всіх дорівнює resume без вибору за тим самим seed", async () => {
    const { ctx, pending } = await pendingCtx();

    const viaRoute = await critChoice(ctx, { choices: { [KEY]: "random" } });

    const direct = await attack(on(), body(), { seed: pending.seed, choices: {} });

    expect(eventTextOf(viaRoute.events[0])).toBe(eventTextOf(direct.events[0]));
    expect(viaRoute.participants.map((p) => p.combatStats.currentHp)).toEqual(direct.participants.map((p) => p.combatStats.currentHp));
  });

  it("помилки: немає pending, частковий вибір, чужий ключ, неіснуючий id", async () => {
    await expect(critChoice(on(), { choices: {} })).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.CRIT_CHOICE_NONE });

    const { ctx } = await pendingCtx();

    await expect(critChoice(ctx, { choices: {} })).rejects.toMatchObject({ code: "action_rejected" });
    await expect(critChoice(ctx, { choices: { [KEY]: effect.id, "attack:x:y:0": "random" } })).rejects.toMatchObject({ code: "action_rejected" });
    await expect(critChoice(ctx, { choices: { "attack:x:y:0": "random" } })).rejects.toMatchObject({ code: "action_rejected" });
    await expect(critChoice(ctx, { choices: { [KEY]: 9999 } })).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("вимкнений у правилах ефект: випадковий його обходить, явний вибір відхилено", async () => {
    const all = critEffectsFor("attack", "success");

    const rules = { ...DEFAULT_RULES, criticals: { ...DEFAULT_RULES.criticals, disabledSuccess: all.filter((e) => e.id !== all[1].id).map((e) => String(e.id)) } };

    const c = on();

    const withRules = { ...c, meta: { ...c.meta, rules } };

    const out = await attack(withRules, body());

    const pending = out.scene?.pendingCritChoice as StoredPendingCritChoice;

    const ctx = { ...withRules, scene: { ...withRules.scene, pendingCritChoice: pending } };

    await expect(critChoice(ctx, { choices: { [KEY]: all[0].id } })).rejects.toMatchObject({ message: API_ERRORS.CRIT_EFFECT_UNKNOWN });

    const done = await critChoice(ctx, { choices: { [KEY]: "random" } });

    expect(eventTextOf(done.events[0])).toContain(all[1].name);
  });

  it("серверні кидки асистента: після вибору атака повторюється з serverRolls", async () => {
    const c = { ...on(), rng: () => 0.99 };

    const serverAttack = createAttackMutation(deps, { serverRolls: true });

    const out = await serverAttack(c, body({ d20Roll: 1 }));

    const pending = out.scene?.pendingCritChoice as StoredPendingCritChoice;

    expect(pending.serverRolls).toBe(true);

    const replayAttack = vi.fn(async () => out);

    const mutation = createCritChoiceMutation({ attack: replayAttack, spell: createSpellMutation(deps) });

    await mutation({ ...c, scene: { ...c.scene, pendingCritChoice: pending } }, { choices: { [KEY]: effect.id } });

    expect(replayAttack).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ seed: pending.seed }), { serverRolls: true });
  });

  it("атака з endTurn завершує хід після вибору", async () => {
    const { ctx } = await pendingCtx({ endTurn: true });

    const out = await critChoice(ctx, { choices: { [KEY]: "random" } });

    expect(out.scene).toMatchObject({ turnIndex: 1, pendingCritChoice: null });
  });

  it("прапор кампанії вимкнено до розв'язання — вибір усе одно працює", async () => {
    const { ctx } = await pendingCtx();

    const off = { ...ctx, meta: { ...ctx.meta, critChoiceByDm: false } };

    const out = await critChoice(off, { choices: { [KEY]: effect.id } });

    expect(out.events).toHaveLength(1);
    expect(out.scene?.pendingCritChoice).toBeNull();
  });

  it("cancel: pending знято, стан без змін, одна подія", async () => {
    const { ctx } = await pendingCtx();

    const out = await critChoice(ctx, { cancel: true });

    expect(out.scene?.pendingCritChoice).toBeNull();
    expect(out.participants).toBe(ctx.participants);
    expect(out.events).toHaveLength(1);
    expect(eventTextOf(out.events[0])).toBe("ДМ скасував дію");
    await expect(critChoice(on(), { cancel: true })).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("схема: choices або cancel, не порожнє тіло", () => {
    expect(critChoiceSchema.safeParse({ cancel: true }).success).toBe(true);
    expect(critChoiceSchema.safeParse({ choices: {} }).success).toBe(true);
    expect(critChoiceSchema.safeParse({}).success).toBe(false);
    expect(critChoiceSchema.safeParse({ cancel: false }).success).toBe(false);
  });

  it("через пайплайн: не-DM — 403, DM — застосовано і версія/delta без request/seed", async () => {
    const { ctx } = await pendingCtx();

    const loaded = (isDM: boolean) => ({ scene: ctx.scene, meta: ctx.meta, participants: ctx.participants, pending: ctx.pending, isDM, isMember: true });

    const mk = (isDM: boolean): PipelineDeps => ({
      getUserId: vi.fn(async () => "u"),
      rateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 })),
      loadBattle: vi.fn(async () => loaded(isDM)),
      saveBattle: vi.fn(async () => ({ battleId: "b1", version: 3, scene: { status: BattleStatus.ACTIVE, round: 1, turnIndex: 0, pendingMoraleCheck: null, pendingCritChoice: null }, upserted: [], fullIds: [], removed: [], events: [] })),
      publish: vi.fn(),
      loadRecentEvents: vi.fn(async () => []),
    });

    const run = (d: PipelineDeps) =>
      runBattleMutation(new Request("http://x/api", { method: "POST", body: JSON.stringify({ choices: { [KEY]: "random" } }) }), { params: { id: "c1", battleId: "b1" }, access: "dm", allowWhileCritPending: true, schema: critChoiceSchema, respond: "wrapped", mutate: critChoice }, d);

    expect((await run(mk(false))).status).toBe(403);

    const res = await run(mk(true));

    expect(res.status).toBe(200);
    expect((await res.json()).delta.scene.pendingCritChoice).toBeNull();
  });
});

describe("очищення pending", () => {
  const stored: StoredPendingCritChoice = { action: "attack", actorId: "hero", triggers: [], request: {}, seed: 1, userId: "u", isDM: false };

  const withPending = () => {
    const c = context();

    return { ...c, scene: { ...c.scene, pendingCritChoice: stored } };
  };

  it("reset і complete скидають pending", () => {
    expect(resetMutation(withPending()).scene?.pendingCritChoice).toBeNull();
    expect(completeMutation(withPending(), {}).scene?.pendingCritChoice).toBeNull();
  });

  it("rollback скидає pending, навіть якщо знімок його не знає", async () => {
    const c = withPending();

    const s = [splitParticipant(hero, { orderIndex: 0, isPending: false })];

    const snapshot = { seq: 4, state: buildSnapshotState({ ...c.scene, pendingCritChoice: null }, s, diffParticipants(s, s)) };

    const out = await createRollbackMutation(vi.fn(async () => [snapshot]), vi.fn(async () => true))(c, { actionIndex: 4 });

    expect(out.scene?.pendingCritChoice).toBeNull();
  });
});
