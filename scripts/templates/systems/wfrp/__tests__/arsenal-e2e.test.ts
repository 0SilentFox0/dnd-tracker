import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { buildUnit, ctxOf, data, heroes, HIT, part, rules, standing, strike } from "./grim-e2e-helpers";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { createSpellSchema } from "@/lib/schemas/spells";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { initAmmo } from "@/lib/utils/battle/ammo";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { coerceRecord, IMPORT_SPECS } from "@/lib/utils/content/import";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import { slotChars, slotStats } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { castOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";
import { extractWfrpAttacks } from "@/systems/wfrp/rules/combat/extract-attacks";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { armourAp } from "@/systems/wfrp/rules/equipment";
import { ATTACK_SLOT } from "@/systems/wfrp/rules/slots";
import { must } from "@/systems/wfrp/rules/traits/__tests__/fixtures";
import type { BattleParticipant } from "@/types/battle";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

const artifactRow = (name: string) => {
  const row = must(data.artifacts.find((a) => a.name === name), name);

  return { id: name.toLowerCase().replace(/[^a-z]+/g, "-"), name, systemStats: row.systemStats };
};

function spellOf(name: string): Spell {
  const row = must(data.spells.find((s) => s.name === name), name);

  const { value } = coerceRecord(row, IMPORT_SPECS.spells.fields);

  const body = createSpellSchema.parse(IMPORT_SPECS.spells.toBody ? IMPORT_SPECS.spells.toBody(value, "create") : value);

  return { ...body, id: name, campaignId: "c1", groupId: null, icon: null, raceModifiers: [] } as unknown as Spell;
}

const cast = createSpellMutation({ loadSpell: async (id) => spellOf(id), loadPool: async () => ({ units: [], races: [] as unknown as Prisma.RaceGetPayload<object>[] }) });

const GEAR = { weapon: "Arming Sword", range_weapon: "Light Crossbow", armor: "Chain Hauberk", helmet: "Mail Hood", shield: "Round Shield" };

function armed(hero: BattleParticipant): BattleParticipant {
  const rows = Object.entries(GEAR).map(([slot, name]) => ({ ...artifactRow(name), slot }));

  const gear = armourAp(rows);

  const attacks = extractWfrpAttacks({ rows: rows.map((r) => ({ row: r as never, slot: r.slot })) });

  const abilities = { ...hero.abilities, ...wfrpAbilitiesOf(readCharacteristics({ characteristics: slotChars(hero.abilities.system) }), { ap: gear.ap, flexible: gear.flexible, armourOnly: gear.armourOnly }) };

  return { ...hero, abilities, battleData: { ...hero.battleData, attacks: attacks as never, ammo: initAmmo(attacks as never) } };
}

function mage(): BattleParticipant {
  const hero = armed(heroes()[0]);

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, int: 40, wp: 40 }, skillAdvances: { "language:magick": 20 } };

  const abilities = { ...hero.abilities, ...wfrpAbilitiesOf(characteristics, { ap: slotStats(hero.abilities.system)?.ap as never, flexible: true, armourOnly: armourAp(Object.entries(GEAR).map(([slot, name]) => ({ ...artifactRow(name), slot }))).armourOnly }) };

  return { ...hero, abilities, spellcasting: { ...hero.spellcasting, spellSlots: {}, knownSpells: ["Ember Dart"] } };
}

function castBody(ctx: BattleMutationContext, casterId: string, targetId: string, castRoll: number) {
  const spell = spellOf("Ember Dart") as unknown as { dice: number; groupId: null };

  const { count } = casterSpellDice(part(ctx, casterId), { dice: spell.dice, groupId: spell.groupId, level: 1 });

  return { casterId, spellId: "Ember Dart", targetIds: [targetId], diceRolls: Array(count).fill(1), castRoll } as never;
}

const castOn = (ctx: BattleMutationContext, casterId: string) => ({ ...ctx, scene: { ...ctx.scene, turnIndex: ctx.participants.findIndex((p) => p.basicInfo.id === casterId) }, rng: () => 0.5 });

const percentile = (out: { events: { details?: unknown }[] }) => castOf((out.events[0].details as { actionDetails: { system?: SystemSlot } }).actionDetails);

describe("grim arsenal and magic end to end", () => {
  it("template gear gives the hero AP, a sword and a crossbow", () => {
    const hero = armed(heroes()[0]);

    expect(slotStats(hero.abilities.system)).toMatchObject({ ap: { head: 4, arm: 4, body: 4, leg: 2 }, flexible: true });

    const sword = must(hero.battleData.attacks.find((a) => a.name === "Arming Sword"));

    const bow = must(hero.battleData.attacks.find((a) => a.name === "Light Crossbow"));

    expect(sword).toMatchObject({ type: "melee", damageBonus: 4 });
    expect(bow).toMatchObject({ type: "ranged", range: "180 ft", ammo: { capacity: 1, reload: 1 } });
    expect(ATTACK_SLOT.read(bow.system)?.noSb).toBe(true);
  });

  it("the crossbow spends its bolt, arms reload and refuses a second shot", async () => {
    const captain = await buildUnit("Broadhelm Captain", "u0");

    const ctx = ctxOf([armed(heroes()[0]), captain]);

    const { next } = await strike(ctx, "h0", "u0", "light-crossbow", HIT);

    expect(part(next, "h0").battleData.ammo).toEqual({ "light-crossbow": 0 });
    expect(part(next, "h0").battleData.reload).toEqual({ "light-crossbow": 2 });
    await expect(strike(next, "h0", "u0", "light-crossbow", HIT)).rejects.toMatchObject({ message: expect.stringMatching(new RegExp(`${API_ERRORS.OUT_OF_AMMO}|${API_ERRORS.WEAPON_RELOADING}`)) });
  });

  it("the Broadhelm Captain shoots a crossbow and hurts the hero", async () => {
    const captain = await buildUnit("Broadhelm Captain", "u0");

    const bow = must(captain.battleData.attacks.find((a) => a.name === "Crossbow +7"));

    expect(bow).toMatchObject({ type: "ranged", range: "180 ft" });
    expect(ATTACK_SLOT.read(bow.system)?.noSb).toBeUndefined();

    const hero = armed(heroes()[0]);

    const { next } = await strike(ctxOf([hero, captain]), "u0", "h0", must(bow.id), HIT);

    expect(part(next, "h0").combatStats.currentHp).toBeLessThan(hero.combatStats.currentHp);
  });

  it("the hero casts Ember Dart on the Masked Oracle: overcast, Ablaze, flexible armour", async () => {
    const oracle = await buildUnit("Masked Oracle", "u0");

    const ctx = castOn(ctxOf([mage(), oracle]), "h0");

    const out = await cast(ctx, castBody(ctx, "h0", "u0", 5));

    const details = percentile(out);

    expect(details).toMatchObject({ outcome: "success", overcastSteps: 1 });
    expect(details?.armourSl).toBe(0);
    expect(part({ ...ctx, participants: out.participants }, "u0").combatStats.currentHp).toBeLessThan(oracle.combatStats.currentHp);

    const conditions = ruleSystemOf(rules).conditions as NonNullable<ReturnType<typeof ruleSystemOf>["conditions"]>;

    expect(conditions.list(part({ ...ctx, participants: out.participants }, "u0"))).toContainEqual(expect.objectContaining({ key: "ablaze" }));
  });

  it("a doubled failed cast takes its miscast text from the template table", async () => {
    const oracle = await buildUnit("Masked Oracle", "u0");

    const ctx = castOn(ctxOf([mage(), oracle]), "h0");

    const out = await cast(ctx, castBody(ctx, "h0", "u0", 77));

    const minor = ((data.rules?.tables as unknown as Record<string, { text: string }[]>).miscastMinor ?? []).map((r) => r.text);

    expect(percentile(out)?.miscast).toBe("minor");

    const events = JSON.stringify(out.events);

    expect(minor.some((t) => events.includes(JSON.stringify(t).slice(1, -1)))).toBe(true);
    expect(events).not.toContain("wfrpMagic.miscast.minor.");
  });

  it("the Gilded Voice casts Ember Dart at the hero", async () => {
    const voice = await buildUnit("Gilded Voice", "u0");

    const hero = armed(heroes()[0]);

    const ctx = castOn(ctxOf([voice, hero]), "u0");

    const out = await cast(ctx, castBody(ctx, "u0", "h0", 5));

    expect(percentile(out)?.outcome).toBe("success");
    expect(part({ ...ctx, participants: out.participants }, "h0").combatStats.currentHp).toBeLessThan(hero.combatStats.currentHp);
  });

  it("four armed heroes beat the Gilded Voice and the Broadhelm Captain", async () => {
    const party = heroes().slice(0, 4).map(armed);

    const foes = await Promise.all(["Gilded Voice", "Broadhelm Captain"].map((n, i) => buildUnit(n, `u${i}`)));

    let ctx = ctxOf([...party, ...foes]);

    const foesStanding = (c: BattleMutationContext) => c.participants.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY && standing(p));

    const healed = (c: BattleMutationContext): BattleMutationContext => ({ ...c, participants: c.participants.map((p) => (p.basicInfo.side === ParticipantSide.ALLY ? { ...p, combatStats: { ...p.combatStats, currentHp: p.combatStats.maxHp, status: CombatStatus.ACTIVE } } : p)) });

    const CAP = 600;

    let strikes = 0;

    while (strikes < CAP && foesStanding(ctx).length > 0) {
      const { next } = await strike(ctx, party[strikes % party.length].basicInfo.id, foesStanding(ctx)[0].basicInfo.id, "arming-sword", HIT);

      ctx = healed(next);
      strikes++;
    }

    expect(strikes).toBeLessThan(CAP);

    for (const foe of foes) {
      expect(part(ctx, foe.basicInfo.id).combatStats.currentHp, foe.basicInfo.name).toBe(0);
      expect(part(ctx, foe.basicInfo.id).combatStats.status, foe.basicInfo.name).not.toBe(CombatStatus.ACTIVE);
    }
  });
});
