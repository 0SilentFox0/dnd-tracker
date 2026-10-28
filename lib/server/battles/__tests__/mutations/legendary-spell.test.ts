import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { createLegendaryMutation } from "@/lib/server/battles/mutations/core-action/legendary-mutation";
import { spellSchema } from "@/lib/server/battles/mutations/spell/cast-spell-schema";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleParticipant } from "@/types/battle";

const row = { id: "breath", campaignId: "c1", name: "Подих", level: 1, groupId: null, icon: null, dice: 1, dieSides: 6, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [] } as unknown as Spell;

const ability = resolved({ id: "breath-action", name: "Подих", trigger: { event: "action" }, limits: { legendaryCost: 2, perRound: 1 }, perform: { kind: "spell", spellId: row.id }, effects: [{ kind: "note", text: "Подих" }] });

const pool = "pool:spell:breath";

const caster = (): BattleParticipant => {
  const p = participant("dragon", { controlledBy: "dm" });

  return { ...p, spellcasting: { spellSlots: {}, knownSpells: [], grants: [{ spellId: row.id, legendaryOnly: true, pool, castLevel: 3, dc: 25 }] }, actionFlags: { ...p.actionFlags, hasUsedAction: true }, battleData: { ...p.battleData, legendary: { actions: 3, actionsLeft: 3, resistLeft: 0 }, resolvedAbilities: [ability], pools: { [pool]: { label: row.id, max: 1, rest: null } } } };
};

const cast = (p = caster(), extra = {}, isDM = true, turnIndex = 0) => createSpellMutation({ loadSpell: async () => row, loadPool: async () => ({ units: [], races: [] }) })(context({ participants: [goblin, p], isDM, userId: "dm", scene: { ...context().scene, turnIndex }, rng: () => 0.5 }), spellSchema.parse({ casterId: "dragon", spellId: row.id, legendaryKey: ability.key, targetIds: ["gob"], diceRolls: [4], ...extra }));

const actor = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "dragon") ?? (() => { throw new Error("dragon missing"); })();

describe("legendary spell route", () => {
  it("casts outside own turn, bypasses action and slot, spends legendary budget, ability and grant exactly once", async () => {
    const out = await cast();

    expect(actor(out).battleData.legendary?.actionsLeft).toBe(1);
    expect(actor(out).battleData.abilityUsage?.[ability.key].round).toBe(1);
    expect(actor(out).battleData.abilityUsage?.[pool].battle).toBe(1);
    expect(actor(out).actionFlags.hasUsedAction).toBe(true);
    expect(actor(out).spellcasting.spellSlots).toEqual({});
    expect(out.events[0].details).toMatchObject({ actionDetails: { castLevel: 3 } });
  });

  it("does not spend an unused action and permits a linked spell without knownSpells or grant", async () => {
    const p = caster();

    p.actionFlags.hasUsedAction = false;
    p.spellcasting.grants = [];

    const out = await cast(p);

    expect(actor(out).actionFlags.hasUsedAction).toBe(false);
    expect(actor(out).battleData.legendary?.actionsLeft).toBe(1);
  });

  it("preview does not spend any resource", async () => {
    const p = caster();

    expect(actor(await cast(p, { preview: true }))).toEqual(p);
  });

  it("rejects non-DM, own turn, mismatched ref, exhausted budget/limits, and malformed targets without mutation", async () => {
    await expect(cast(caster(), {}, false)).rejects.toMatchObject({ status: 403 });
    await expect(cast(caster(), {}, true, 1)).rejects.toMatchObject({ code: "action_rejected" });

    const mismatch = caster();

    mismatch.battleData.resolvedAbilities = [{ ...ability, perform: { kind: "spell", spellId: "other" } }];
    await expect(cast(mismatch)).rejects.toMatchObject({ code: "action_rejected" });

    const empty = caster();

    empty.battleData.legendary = { actions: 3, actionsLeft: 1, resistLeft: 0 };
    await expect(cast(empty)).rejects.toMatchObject({ code: "action_rejected" });

    const used = caster();

    used.battleData.abilityUsage = { [ability.key]: { battle: 1, round: 1, turn: 1 } };
    await expect(cast(used)).rejects.toMatchObject({ code: "ability_limit" });

    const fresh = caster();

    await expect(cast(fresh, { targetIds: ["missing"] })).rejects.toMatchObject({ code: "invalid_target" });
    expect(fresh.battleData.legendary?.actionsLeft).toBe(3);
    expect(fresh.battleData.abilityUsage).toBeUndefined();
  });
});

 describe("lair spell references", () => {
  const lairCaster = () => {
    const p = caster();

    p.battleData.resolvedAbilities = [{ ...ability, limits: { lair: true } }];
    p.battleData.lair = { active: true, baseResistances: 0, resistSpent: 0 };
    p.battleData.legendary = { actions: 3, actionsLeft: 0, resistLeft: 0 };

    return p;
  };

  it("uses normal targeting through spell route and spends the lair round rather than legendary budget", async () => {
    const out = await cast(lairCaster(), {}, true, 1);

    expect(actor(out).battleData.lair).toMatchObject({ usedRound: 1, lastKey: ability.key });
    expect(actor(out).battleData.legendary?.actionsLeft).toBe(0);
    expect(actor(out).battleData.abilityUsage?.[pool].battle).toBe(1);
  });

  it("core lair option delegates targeted spells to the same spell resolver", async () => {
    const p = lairCaster();

    const out = await createLegendaryMutation({ loadPool: async () => ({ units: [], races: [] }), loadSpell: async () => row })(context({ participants: [goblin, p], isDM: true, rng: () => 0.5 }), { action: "legendary", participantId: "dragon", option: { kind: "lair", abilityKey: ability.key, targetIds: ["gob"] } });

    expect(actor(out).battleData.lair?.usedRound).toBe(1);
    expect(out.participants[0].combatStats.currentHp).toBeLessThan(goblin.combatStats.currentHp);
    expect(actor(out).battleData.legendary?.actionsLeft).toBe(0);
  });
 });

it("linked spell respects its ability condition without spending", async () => {
  const p = caster();

  p.battleData.resolvedAbilities = [{ ...ability, condition: { type: "hpBelow", who: "self", percent: 50 } }];
  await expect(cast(p)).rejects.toMatchObject({ code: "action_rejected" });
  expect(p.battleData.legendary?.actionsLeft).toBe(3);
});
