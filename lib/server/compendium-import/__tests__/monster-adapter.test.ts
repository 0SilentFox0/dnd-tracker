import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";

import { AttackType } from "@/lib/constants/battle";
import { proficiencyForChallenge } from "@/lib/constants/challenge";
import { createUnitSchema } from "@/lib/schemas/units";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { attackDamageModifier } from "@/lib/utils/battle/attack/ability";
import { calculateAttackBonus } from "@/lib/utils/battle/attack/bonus";
import { parseDice } from "@/lib/utils/common/dice";
import type { BattleAttack } from "@/types/battle";

const base = { name: "Synthetic", source: "Test", ac: [12], hp: { average: 20 }, str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10, cr: "1" };

const adapt = (row: Record<string, unknown>) => adaptCompendium({ _meta: { edition: "classic" }, monster: [{ ...base, ...row }] }).entries[0];

type Row = { name: string; type: string; attackBonus: number; damageDice: string; damageType: string; traits?: BattleAttack["traits"]; range?: string; maxTargets?: number; properties?: string };

const attacks = (entry: ReturnType<typeof adapt>) => entry.body.attacks as Row[];

function engineTotals(entry: ReturnType<typeof adapt>, index = 0) {
  const body = entry.body as Record<string, number>;

  const row = attacks(entry)[index];

  const b = makeParticipant({ id: "m" });

  const participant = { ...b, abilities: { ...b.abilities, strength: body.strength, dexterity: body.dexterity, proficiencyBonus: proficiencyForChallenge(Number(body.cr)), damageModel: "5e" as const } };

  const attack: BattleAttack = { id: "a", name: row.name, type: row.type === "ranged" ? AttackType.RANGED : AttackType.MELEE, attackBonus: row.attackBonus, damageDice: row.damageDice, damageType: row.damageType, ...(row.traits && { traits: row.traits }) };

  return { toHit: calculateAttackBonus(participant, attack), damageFlat: (parseDice(row.damageDice)?.flat ?? 0) + attackDamageModifier(participant, attack) };
}

describe("monster attack parsing (B1/B2)", () => {
  it("drops the modifier the engine adds itself: 1d4 + 2 with STR 14 -> 1d4", () => {
    const entry = adapt({ action: [{ name: "Poke", entries: ["{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}4 ({@damage 1d4 + 2}) piercing damage."] }] });

    expect(attacks(entry)[0]).toMatchObject({ name: "Poke", type: "melee", damageDice: "1d4", damageType: "piercing" });
    expect(engineTotals(entry)).toEqual({ toHit: 4, damageFlat: 2 });
  });

  it("keeps a residual when the statblock bonus differs from the engine modifier", () => {
    const entry = adapt({ action: [{ name: "Smash", entries: ["{@atk mw} {@hit 6} to hit, reach 5 ft., one target. {@h}8 ({@damage 1d6 + 5}) bludgeoning damage."] }] });

    expect(attacks(entry)[0].damageDice).toBe("1d6+3");
    expect(engineTotals(entry)).toEqual({ toHit: 6, damageFlat: 5 });
  });

  it("removes the modifier from damage the statblock does not boost and flat damage", () => {
    const entry = adapt({ action: [{ name: "Push", entries: ["{@atk mw} {@hit 2} to hit, reach 5 ft., one target. {@h}3 ({@damage 1d4}) bludgeoning damage."] }, { name: "Kick", entries: ["{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}1 bludgeoning damage."] }] });

    expect(attacks(entry)[0].damageDice).toBe("1d4-2");
    expect(engineTotals(entry, 0)).toEqual({ toHit: 2, damageFlat: 0 });
    expect(engineTotals(entry, 1)).toEqual({ toHit: 4, damageFlat: 1 });
  });

  it("uses DEX for ranged attacks and finesse when the statblock hit follows DEX", () => {
    const entry = adapt({ dex: 16, action: [{ name: "Bow", entries: ["{@atk rw} {@hit 5} to hit, range 80/320 ft., one target. {@h}6 ({@damage 1d6 + 3}) piercing damage."] }, { name: "Dagger", entries: ["{@atk mw} {@hit 5} to hit, reach 5 ft., one target. {@h}6 ({@damage 1d4 + 3}) piercing damage."] }] });

    expect(attacks(entry)[0]).toMatchObject({ type: "ranged", range: "80/320", damageDice: "1d6" });
    expect(attacks(entry)[1]).toMatchObject({ traits: ["finesse"], damageDice: "1d4" });
    expect(engineTotals(entry, 0)).toEqual({ toHit: 5, damageFlat: 3 });
    expect(engineTotals(entry, 1)).toEqual({ toHit: 5, damageFlat: 3 });
  });

  it("recognizes one creature, reach 10, extra damage, multiple targets and saving-throw riders", () => {
    const entry = adapt({ action: [
      { name: "Touch", entries: ["{@atk mw} {@hit 6} to hit, reach 10 ft., one creature. {@h}13 ({@damage 2d6 + 2}) psychic damage, and it must make a {@dc 12} Wisdom saving throw. On a failed save, it is {@condition frightened}."] },
      { name: "Spike", entries: ["{@atk mw} {@hit 5} to hit, reach 5 ft., one target. {@h}6 ({@damage 1d6 + 2}) piercing damage plus 3 ({@damage 1d6}) necrotic damage."] },
      { name: "Spew {@recharge 5}", entries: ["{@atk rw} {@hit 7} to hit, range 30/90 ft., three targets. {@h}18 ({@damage 2d12 + 5}) fire damage."] },
    ] });

    const [touch, spike, spew] = attacks(entry);

    expect(touch).toMatchObject({ traits: ["reach"], damageDice: "2d6", damageType: "psychic" });
    expect(touch.properties).toContain("Wisdom saving throw");
    expect(spike).toMatchObject({ damageDice: "1d6+1d6", damageType: "piercing" });
    expect(spike.properties).toContain("necrotic");
    expect(spew).toMatchObject({ name: "Spew", maxTargets: 3, range: "30/90" });
    expect(spew.properties).toContain("Recharge 5-6");
    expect(entry.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["MANUAL_ATTACK_RIDER", "MONSTER_ATTACK_MIXED_DAMAGE"]));
  });

  it("reports unrecognized actions by name instead of dropping them", () => {
    const entry = adapt({ action: [{ name: "Odd Gaze", entries: ["A fictional effect needing the DM."] }, { name: "Bite", entries: ["{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}3 damage of the type associated with the spirit."] }] });

    expect(attacks(entry)).toEqual([]);

    const manual = entry.issues.filter((i) => i.code === "MANUAL_MONSTER_ACTION");

    expect(manual.map((i) => i.action).join()).toContain("Odd Gaze");
    expect(manual.map((i) => i.action).join()).toContain("Bite");
    expect(entry.notes).toContain("Odd Gaze");
  });

  it("turns Multiattack into the structured attack count and flags alternatives", () => {
    const entry = adapt({ action: [{ name: "Multiattack", entries: ["The creature makes three attacks: one with its Bite and two with its Claw."] }] });

    expect(entry.body.multiattack).toBe(3);
    expect(entry.issues.some((i) => i.code === "MANUAL_MULTIATTACK_DETAIL")).toBe(false);
    expect(adapt({ action: [{ name: "Multiattack", entries: ["The creature makes two attacks, or it uses its Roar."] }] }).issues.some((i) => i.code === "MANUAL_MULTIATTACK_DETAIL")).toBe(true);
  });

  it("produces units the create schema accepts", () => {
    const entry = adapt({ action: [{ name: "Poke", entries: ["{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}4 ({@damage 1d4 + 2}) piercing damage."] }], resist: ["fire"], legendary: [{ name: "Bite", entries: ["The creature makes a Poke attack."] }] });

    expect(createUnitSchema.safeParse(entry.body).success).toBe(true);
  });
});

describe("monster defenses and resources (B3)", () => {
  it("maps resist, immune, vulnerable and condition immunities to passive abilities", () => {
    const entry = adapt({ resist: ["fire", { resist: ["bludgeoning", "piercing", "slashing"], note: "from Nonmagical Attacks", cond: true }], immune: ["poison"], vulnerable: ["cold"], conditionImmune: ["poisoned", "charmed"] });

    const abilities = entry.body.abilities as Array<{ id: string; effects: Array<Record<string, unknown>> }>;

    const byId = Object.fromEntries(abilities.map((a) => [a.id, a.effects]));

    expect(byId["damage-resistances"]).toEqual(expect.arrayContaining([{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }, { kind: "flag", flag: "resistance", damageType: "slashing", percent: 50 }]));
    expect(byId["damage-immunities"]).toEqual([{ kind: "flag", flag: "resistance", damageType: "poison", percent: 100 }]);
    expect(byId["damage-vulnerabilities"]).toEqual([{ kind: "flag", flag: "resistance", damageType: "cold", percent: -100 }]);
    expect(byId["condition-immunities"]).toEqual([{ kind: "flag", flag: "conditionImmunity", conditions: ["poisoned", "charmed"] }]);
    expect(entry.issues.some((i) => i.code === "MONSTER_NONMAGICAL_APPROX")).toBe(true);
    expect(createUnitSchema.safeParse(entry.body).success).toBe(true);
  });

  it("keeps unknown defenses as named manual issues", () => {
    const entry = adapt({ immune: [{ special: "All" }] });

    expect(entry.issues.some((i) => i.code === "MANUAL_MONSTER_DEFENSE")).toBe(true);
  });

  it("derives save proficiencies only where the total exceeds the modifier", () => {
    expect(adapt({ save: { str: "+2", dex: "+2", con: "+4" } }).body.saveProficiencies).toEqual(["dexterity", "constitution"]);
  });

  it("imports legendary actions, costs, attack links and legendary resistance", () => {
    const entry = adapt({
      action: [{ name: "Claw", entries: ["{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}4 ({@damage 1d4 + 2}) slashing damage."] }],
      trait: [{ name: "Legendary Resistance (3/Day, or 4/Day in Lair)", entries: ["Saves."] }],
      legendary: [{ name: "Claw", entries: ["The creature makes a Claw attack."] }, { name: "Roar (Costs 2 Actions)", entries: ["A loud roar."] }],
    });

    expect(entry.body).toMatchObject({ legendaryActions: 3, legendaryResistances: 3, statblock: { lairResistances: 4 } });
    expect(entry.body.abilities).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Claw", perform: { kind: "attack", attack: "Claw" }, limits: { legendaryCost: 1 } }), expect.objectContaining({ name: "Roar", limits: { legendaryCost: 2 } })]));
    expect(entry.issues.filter((i) => i.code === "MANUAL_MONSTER_ACTION").map((i) => i.action).join()).toContain("Roar");
    expect(createUnitSchema.safeParse(entry.body).success).toBe(true);
  });

  it("structures spellcasting with refs to imported spells instead of raw JSON", () => {
    const entry = adapt({
      spellcasting: [{ name: "Innate Spellcasting", type: "spellcasting", headerEntries: ["Its innate spellcasting ability is Wisdom (spell save {@dc 13}, {@hit 5} to hit with spell attacks)."], will: ["{@spell Druidcraft}"], daily: { "1e": ["{@spell Fog Cloud|Test}"], "2": ["{@spell Sleep}"] }, ability: "wis" }],
      action: [{ name: "Bubble (1/Day)", entries: ["The creature casts the {@spell Bubble Lift|Test} spell, using Wisdom as its spellcasting ability."] }],
    });

    const spells = (entry.body.spellcasting as { spells: Array<{ spellId: string }> }).spells;

    expect(entry.body.spellcasting).toMatchObject({ ability: "wisdom", dc: 13, attackBonus: 5 });
    expect(spells).toEqual(expect.arrayContaining([{ spellId: "Druidcraft" }, { spellId: "Fog Cloud", perBattle: 1 }, { spellId: "Sleep", perBattle: 2 }, { spellId: "Bubble Lift", perBattle: 1 }]));
    expect(entry.refs.map((r) => [r.path[2], r.kind, r.name, r.source]).sort()).toEqual([[0, "spell", "Bubble Lift", "Test"], [1, "spell", "Druidcraft", "PHB"], [2, "spell", "Sleep", "PHB"], [3, "spell", "Fog Cloud", "Test"]].sort());
    expect(entry.refs.every((r, i) => spells[r.path[2] as number].spellId === r.name && i >= 0)).toBe(true);
    expect(entry.notes).not.toContain("\"will\"");
    expect(createUnitSchema.safeParse(entry.body).success).toBe(true);
  });
});
