import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { spellSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema";
import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
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
  it("casts an at-will grant without slots or a duplicate knownSpells entry and spends the action", async () => {
    const out = await cast(monster());

    expect(casterOf(out).spellcasting.spellSlots).toEqual({});
    expect(casterOf(out).actionFlags.hasUsedAction).toBe(true);
    expect(out.participants.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(goblin.combatStats.currentHp - 4);
  });

  it("spends the grant cost once and records the display name for recharge", async () => {
    const out = await cast(monster({ pool, cost: 2 }));

    expect(casterOf(out).battleData.abilityUsage?.[pool].battle).toBe(2);
    expect(casterOf(out).battleData.pools?.[pool].label).toBe(row.name);
  });

  it("rejects the next cast when the battle limit is exhausted", async () => {
    const after = casterOf(await cast(monster({ pool, cost: 2 })));

    const next = { ...after, actionFlags: { ...after.actionFlags, hasUsedAction: false } };

    await expect(cast(next)).rejects.toMatchObject({ code: "action_rejected", message: "Не лишилося використань цього заклинання" });
    expect(next.battleData.abilityUsage?.[pool].battle).toBe(2);
    expect(next.actionFlags.hasUsedAction).toBe(false);
  });

  it("rejects a missing pool and a pool below the requested cost", async () => {
    const missing = monster({ pool: "missing", cost: 1 });

    await expect(cast(missing)).rejects.toMatchObject({ code: "action_rejected", message: "Не лишилося використань цього заклинання" });
    await expect(cast(monster({ pool, cost: 2 }, 1))).rejects.toMatchObject({ code: "action_rejected", message: "Не лишилося використань цього заклинання" });
  });

  it("rejects slotKey even for a cantrip grant", async () => {
    await expect(cast(monster(), { slotKey: "1" }, { ...row, level: 0 })).rejects.toMatchObject({ code: "action_rejected", message: "Для цього заклинання слот не потрібен" });
  });

  it("rejects a legendary-only grant on the normal cast path", async () => {
    await expect(cast(monster({ legendaryOnly: true }))).rejects.toMatchObject({ code: "action_rejected", message: "Це заклинання доступне лише як легендарна дія або дія лігва" });
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
    [{ pool, cost: 3 }, {}, "Не лишилося використань цього заклинання"],
    [{}, { slotKey: "1" }, "Для цього заклинання слот не потрібен"],
    [{ legendaryOnly: true }, {}, "Це заклинання доступне лише як легендарна дія або дія лігва"],
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
    expect(await response.json()).toEqual({ code: "action_rejected", error });
  });
});
