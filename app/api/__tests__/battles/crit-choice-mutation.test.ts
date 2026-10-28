import { describe, expect, it, vi } from "vitest";

import { context, goblin as baseGoblin, hero as baseHero } from "./fixtures";

import { attackBodySchema, createAttackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { completeMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/complete/complete-mutation";
import { createCritChoiceMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/crit-choice/crit-choice-mutation";
import { resetMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/reset/reset-mutation";
import { createRollbackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { AttackType, BattleStatus } from "@/lib/constants/battle";
import { critChoiceSchema } from "@/lib/schemas";
import { critEffectsFor } from "@/lib/utils/battle/crit-choice/catalog";
import type { StoredPendingCritChoice } from "@/lib/utils/battle/crit-choice/types";
import type { BattleMutationContext, PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { diffParticipants, splitParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";

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
    expect(out.events[0].resultText).toContain(effect.name);
  });

  it("«random» для всіх дорівнює resume без вибору за тим самим seed", async () => {
    const { ctx, pending } = await pendingCtx();

    const viaRoute = await critChoice(ctx, { choices: { [KEY]: "random" } });

    const direct = await attack(on(), body(), { seed: pending.seed, choices: {} });

    expect(viaRoute.events[0].resultText).toBe(direct.events[0].resultText);
    expect(viaRoute.participants.map((p) => p.combatStats.currentHp)).toEqual(direct.participants.map((p) => p.combatStats.currentHp));
  });

  it("помилки: немає pending, частковий вибір, чужий ключ, неіснуючий id", async () => {
    await expect(critChoice(on(), { choices: {} })).rejects.toMatchObject({ code: "action_rejected", message: "Немає вибору крита" });

    const { ctx } = await pendingCtx();

    await expect(critChoice(ctx, { choices: {} })).rejects.toMatchObject({ code: "action_rejected" });
    await expect(critChoice(ctx, { choices: { [KEY]: effect.id, "attack:x:y:0": "random" } })).rejects.toMatchObject({ code: "action_rejected" });
    await expect(critChoice(ctx, { choices: { "attack:x:y:0": "random" } })).rejects.toMatchObject({ code: "action_rejected" });
    await expect(critChoice(ctx, { choices: { [KEY]: 9999 } })).rejects.toMatchObject({ code: "action_rejected" });
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
  const stored: StoredPendingCritChoice = { action: "attack", actorId: "hero", triggers: [], request: {}, seed: 1 };

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
