import { API_ERRORS } from "@/lib/constants/api-errors";
import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { spellSchema } from "@/lib/server/battles/mutations/spell/cast-spell-schema";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { runBattleMutation } from "@/lib/server/battles/run-mutation";
import type { BattleParticipant, SpellGrant } from "@/types/battle";

const row = {
  id: "breath", campaignId: "c1", name: "Вогняний подих", level: 1, groupId: null, icon: null,
  dice: 1, dieSides: 6, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" },
  spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [],
} as unknown as Spell;

const pool = "pool:spell:breath";

const monster = (grant: Partial<SpellGrant> = {}, spent = 0): BattleParticipant => {
  const base = participant("hero", { controlledBy: "user-1" });

  return {
    ...base,
    abilities: { ...base.abilities, damageModel: "5e", level: 1 },
    spellcasting: { spellSlots: {}, knownSpells: [], spellSaveDC: 10, spellAttackBonus: 1, grants: [{ spellId: row.id, ...grant }] },
    battleData: { ...base.battleData, pools: { [pool]: { label: row.id, max: 2, rest: null, recharge: 5 } }, abilityUsage: { [pool]: { battle: spent, round: 0, turn: 0 } } },
  };
};

const cast = (caster: BattleParticipant, data: Record<string, unknown> = {}, spell = row) => createSpellMutation({
  loadSpell: async () => spell,
  loadPool: async () => ({ units: [], races: [] }),
})(context({ participants: [caster, goblin], rng: () => 0.5 }), { casterId: "hero", spellId: row.id, targetIds: ["gob"], diceRolls: [4], ...data } as never);

function casterOf(out: { participants: BattleParticipant[] }) {
  const caster = out.participants.find((p) => p.basicInfo.id === "hero");

  if (!caster) throw new Error("Caster missing from mutation result");

  return caster;
}

describe("monster spell grants", () => {
  it("prepares a long spell over turns and spends its grant only on completion", async () => {
    const spell = { ...row, cost: "long", casting: { rounds: 3, text: "3 rounds" } } as Spell;

    const caster = monster({ key: "long-source", pool, cost: 1 });

    const mutate = createSpellMutation({ loadSpell: async () => spell, loadPool: async () => ({ units: [], races: [] }) });

    const step = (p: BattleParticipant, round: number, finish = false) => {
      const ctx = context({ participants: [p, goblin], rng: () => 0.5 });

      ctx.scene.round = round;

      return mutate(ctx, { casterId: "hero", spellId: row.id, grantKey: "long-source", targetIds: finish ? ["gob"] : [], diceRolls: finish ? [4] : [] });
    };

    const first = await step(caster, 1);

    const preparing = casterOf(first);

    expect(preparing.battleData.pendingCast).toMatchObject({ spellId: row.id, remainingRounds: 2, grantKey: "long-source" });
    expect(preparing.battleData.abilityUsage?.[pool].battle).toBe(0);
    expect(preparing.actionFlags.hasUsedAction).toBe(true);
    await expect(step({ ...preparing, actionFlags: { ...preparing.actionFlags, hasUsedAction: false } }, 1)).rejects.toMatchObject({ code: "action_rejected" });

    const second = casterOf(await step({ ...preparing, actionFlags: { ...preparing.actionFlags, hasUsedAction: false } }, 2));

    expect(second.battleData.pendingCast?.remainingRounds).toBe(1);

    const done = await step({ ...second, actionFlags: { ...second.actionFlags, hasUsedAction: false } }, 3, true);

    expect(casterOf(done).battleData.pendingCast).toBeUndefined();
    expect(casterOf(done).battleData.abilityUsage?.[pool].battle).toBe(1);
    expect(done.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBeLessThan(goblin.combatStats.currentHp);
  });

  it("casts a reaction outside the player's own turn and spends only the reaction", async () => {
    const caster = monster({});

    const reaction = { ...row, cost: "reaction", casting: { trigger: "when hit" } };

    const mutation = createSpellMutation({ loadSpell: async () => reaction as Spell, loadPool: async () => ({ units: [], races: [] }) });

    const out = await mutation(context({ participants: [goblin, caster], isDM: false, userId: "user-1", rng: () => 0.5 }), { casterId: "hero", spellId: row.id, targetIds: ["gob"], diceRolls: [4] });

    expect(casterOf(out).actionFlags).toMatchObject({ hasUsedReaction: true, hasUsedAction: false });
    await expect(cast({ ...caster, actionFlags: { ...caster.actionFlags, hasUsedReaction: true } }, {}, reaction as Spell)).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("retains independent slot eligibility alongside an item-only grant", async () => {
    const caster = monster({ key: "wand", pool, cost: 1 });

    caster.spellcasting.knownSpells = [row.id];
    caster.spellcasting.slotSpells = [row.id];
    caster.spellcasting.spellSlots = { "1": { current: 2, max: 2 } };

    const out = casterOf(await cast(caster, { slotKey: "1" }));

    expect(out.spellcasting.spellSlots["1"].current).toBe(1);
    expect(out.battleData.abilityUsage?.[pool].battle).toBe(0);
  });

  it("selects the requested grant source when two grants share one spell", async () => {
    const first = "pool:grant:first";

    const second = "pool:grant:second";

    const caster = monster({ key: "first", pool: first, cost: 1 });

    caster.spellcasting.grants = [
      { spellId: row.id, key: "first", pool: first, cost: 1, label: "Racial" },
      { spellId: row.id, key: "second", pool: second, cost: 1, label: "Feat" },
    ];
    caster.battleData.pools = { [first]: { label: "Racial", max: 1, rest: "long" }, [second]: { label: "Feat", max: 1, rest: "long" } };

    const out = await cast(caster, { grantKey: "second" });

    expect(casterOf(out).battleData.abilityUsage).toMatchObject({ [second]: { battle: 1 } });
    expect(casterOf(out).battleData.abilityUsage?.[first]).toBeUndefined();
    expect(out.events[0].details).toMatchObject({ actionDetails: { spellGrantKey: "second", spellGrantLabel: "Feat" } });
  });

  it("rejects an ambiguous grant request without spending either pool", async () => {
    const caster = monster({ key: "first", pool: "pool:grant:first", cost: 1 });

    caster.spellcasting.grants = [{ spellId: row.id, key: "first", pool: "pool:grant:first", cost: 1 }, { spellId: row.id, key: "second", pool: "pool:grant:second", cost: 1 }];

    await expect(cast(caster)).rejects.toMatchObject({ code: "action_rejected" });
    expect(caster.battleData.abilityUsage?.["pool:grant:first"]).toBeUndefined();
  });

  it("allows selecting an ordinary slot when the grant permits both paths", async () => {
    const caster = monster({ key: "mi", pool: "pool:grant:mi", cost: 1, via: "slotOrGrant" });

    caster.spellcasting.spellSlots = { "1": { max: 1, current: 1 } };
    caster.spellcasting.knownSpells = [row.id];
    caster.battleData.pools = { "pool:grant:mi": { label: "Magic Initiate", max: 1, rest: "long" } };

    const out = await cast(caster, { slotKey: "1" });

    expect(casterOf(out).spellcasting.spellSlots?.["1"].current).toBe(0);
    expect(casterOf(out).battleData.abilityUsage?.["pool:grant:mi"]).toBeUndefined();
  });

  it("rejects a stale grant key", async () => {
    await expect(cast(monster(), { grantKey: "stale" })).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.BATTLE_SPELL_SOURCE_UNAVAILABLE });
  });

  it("derives a granted spell save DC from its configured ability", async () => {
    const caster = monster({ dcAbility: "constitution" });

    caster.spellcasting.spellSaveDC = 25;

    const saveSpell = { ...row, resolution: { kind: "save", ability: "dexterity", onSuccess: "none" } } as unknown as Spell;

    const out = await cast(caster, { saveRolls: [{ participantId: "gob", roll: 15 }] }, saveSpell);

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(goblin.combatStats.currentHp);
    expect(out.events[0].resultText).toContain("СК 10");
  });

  it("casts an at-will grant without slots or a duplicate knownSpells entry and spends the action", async () => {
    const out = await cast(monster());

    expect(casterOf(out).spellcasting.spellSlots).toEqual({});
    expect(casterOf(out).actionFlags.hasUsedAction).toBe(true);
    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(goblin.combatStats.currentHp - 4);
  });

  it("does not spend a consumable grant when cast validation rejects the target", async () => {
    const caster = monster({ key: "consumable:stack:spell:breath", pool: "pool:consumable:stack", cost: 1, castLevel: 1, dc: 15 });

    caster.battleData.pools = { "pool:consumable:stack": { label: "Scroll", max: 1, rest: null } };
    await expect(cast(caster, { grantKey: "consumable:stack:spell:breath", targetIds: [] })).rejects.toMatchObject({ code: "invalid_target" });
    expect(caster.battleData.abilityUsage?.["pool:consumable:stack"]?.battle ?? 0).toBe(0);
  });

  it("casts a zero-charge item grant with an exhausted pool without changing usage", async () => {
    const caster = monster({ key: "free-item", pool, cost: 0 }, 2);

    const out = casterOf(await cast(caster, { grantKey: "free-item" }));

    expect(out.battleData.abilityUsage?.[pool]).toEqual(caster.battleData.abilityUsage?.[pool]);
    expect(out.actionFlags.hasUsedAction).toBe(true);
  });

  it("spends grant charges once and preserves the resource pool label", async () => {
    const out = await cast(monster({ pool, cost: 2 }));

    expect(casterOf(out).battleData.abilityUsage?.[pool].battle).toBe(2);
    expect(casterOf(out).battleData.pools?.[pool].label).toBe(row.id);
  });

  it("charges the item's extra upcast cost and rejects a forged level", async () => {
    const itemGrant = { key: "item:ring:spell:breath", pool, cost: 1, castLevel: 1, upcast: { maxLevel: 3, extraCost: 1 } };

    const caster = monster(itemGrant);

    caster.battleData.pools = { [pool]: { label: "Ring", max: 4, rest: "long" } };

    const out = await cast(caster, { grantKey: itemGrant.key, castLevel: 3 });

    expect(casterOf(out).battleData.abilityUsage?.[pool].battle).toBe(3);
    await expect(cast(caster, { grantKey: itemGrant.key, castLevel: 4 })).rejects.toMatchObject({ code: "action_rejected" });
  });

  it("rejects the next cast when the battle limit is exhausted", async () => {
    const after = casterOf(await cast(monster({ pool, cost: 2 })));

    const next = { ...after, actionFlags: { ...after.actionFlags, hasUsedAction: false } };

    await expect(cast(next)).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.SPELL_USES_EMPTY });
    expect(next.battleData.abilityUsage?.[pool].battle).toBe(2);
    expect(next.actionFlags.hasUsedAction).toBe(false);
  });

  it("rejects a missing pool and a pool below the requested cost", async () => {
    const missing = monster({ pool: "missing", cost: 1 });

    await expect(cast(missing)).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.SPELL_USES_EMPTY });
    await expect(cast(monster({ pool, cost: 2 }, 1))).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.SPELL_USES_EMPTY });
  });

  it("rejects slotKey even for a cantrip grant", async () => {
    await expect(cast(monster(), { slotKey: "1" }, { ...row, level: 0 })).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.GRANT_NO_SLOT });
  });

  it("rejects a legendary-only grant on the normal cast path", async () => {
    await expect(cast(monster({ legendaryOnly: true }))).rejects.toMatchObject({ code: "action_rejected", message: API_ERRORS.SPELL_LEGENDARY_ONLY });
  });

  it("preview and rejected targeting or dice leave resources and action intact", async () => {
    const caster = monster({ pool, cost: 1 });

    const before = structuredClone(caster);

    const preview = await cast(caster, { preview: true });

    expect(preview.events).toEqual([]);
    expect(casterOf(preview)).toEqual(before);
    await expect(cast(caster, { targetIds: ["missing"] })).rejects.toMatchObject({ code: "invalid_target" });
    await expect(cast(caster, { diceRolls: [9] })).rejects.toMatchObject({ code: "invalid_dice" });
    expect(caster).toEqual(before);
  });

  it("uses the grant's cast level for dice and targets", async () => {
    const out = await cast(monster({ castLevel: 3 }), { diceRolls: [2, 2, 2] }, { ...row, upcastDice: 1 });

    expect(out.events[0].details).toMatchObject({ actionDetails: { castLevel: 3 } });
    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(goblin.combatStats.currentHp - 6);
  });

  it("uses per-grant DC without persisting the override", async () => {
    const out = await cast(monster({ dc: 25 }), { saveRolls: [{ participantId: "gob", roll: 15 }] }, { ...row, resolution: { kind: "save", ability: "dexterity", onSuccess: "none" } } as unknown as Spell);

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(goblin.combatStats.currentHp - 4);
    expect(casterOf(out).spellcasting.spellSaveDC).toBe(10);
    expect(out.events[0].resultText).toContain("СК 25");
  });

  it("uses a zero attack override without persisting it", async () => {
    const caster = monster({ attackBonus: 0 });

    caster.spellcasting.spellAttackBonus = 20;

    const out = await cast(caster, { attackRolls: [{ participantId: "gob", roll: 2 }] }, { ...row, resolution: { kind: "attack" } } as unknown as Spell);

    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(goblin.combatStats.currentHp);
    expect(casterOf(out).spellcasting.spellAttackBonus).toBe(20);
    expect(out.events[0].details).toMatchObject({ actionDetails: { spellAttacks: [{ total: 2 }] } });
  });

  it.each([
    [{ pool, cost: 3 }, {}, API_ERRORS.SPELL_USES_EMPTY],
    [{}, { slotKey: "1" }, API_ERRORS.GRANT_NO_SLOT],
    [{ legendaryOnly: true }, {}, API_ERRORS.SPELL_LEGENDARY_ONLY],
  ] as const)("returns a 422 API refusal without saving (%j)", async (grant, data, error) => {
    const ctx = context({ participants: [monster(grant), goblin] });

    const response = await runBattleMutation(new Request("http://test/spell", { method: "POST", body: JSON.stringify({ casterId: "hero", spellId: row.id, targetIds: ["gob"], diceRolls: [4], ...data }) }), {
      params: { id: "c1", battleId: "b1" }, access: "member", schema: spellSchema,
      mutate: createSpellMutation({ loadSpell: async () => row, loadPool: async () => ({ units: [], races: [] }) }),
    }, {
      getUserId: async () => "user-1",
      rateLimit: async () => ({ allowed: true, count: 1, limit: 30, retryAfterSeconds: 10 }),
      loadBattle: async () => ({ ...ctx, isMember: true }),
      saveBattle: async () => { throw new Error("Rejected casts must not be persisted"); },
      publish: () => {}, loadRecentEvents: async () => [],
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "action_rejected", error });
  });
});
