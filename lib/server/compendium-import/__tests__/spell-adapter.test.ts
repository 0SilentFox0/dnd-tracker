import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";

import { createSpellSchema } from "@/lib/schemas/spells";

const base = { name: "Synthetic Spell", source: "Test", level: 2, school: "V", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "instant" }], entries: ["Synthetic text."] };

const adapt = (row: Record<string, unknown>) => {
  const result = adaptCompendium({ _meta: { edition: "one" }, spell: [{ ...base, ...row }] });

  return { spell: result.entries.find((e) => e.kind === "spells")!, groups: result.entries.filter((e) => e.kind === "spell-groups") };
};

describe("spell cast fields", () => {
  it("maps time, range, components and duration into cost, casting and the description head", () => {
    const { spell } = adapt({ time: [{ number: 10, unit: "minute" }], components: { v: true, s: true, m: "a pinch of salt" }, duration: [{ type: "timed", duration: { type: "hour", amount: 8 }, concentration: true }], classes: { fromClassList: [{ name: "Wizard", source: "PHB" }] } });

    expect(spell.body).toMatchObject({ cost: "long", casting: { rounds: 100, text: "10minutes" }, concentration: true, lists: ["Wizard"] });
    expect(spell.body.description).toContain("Level 2 Evocation · Casting Time: 10 minutes · Range: 60 feet · Components: V, S, M (a pinch of salt) · Duration: Concentration, up to 8 hours · Classes: Wizard");
    expect(spell.notes).not.toContain("time");
    expect(spell.issues.map((i) => i.code)).not.toContain("UNSUPPORTED_FIELD");
  });

  it("keeps the reaction trigger and bonus action cost", () => {
    expect(adapt({ time: [{ number: 1, unit: "reaction", condition: "which you take when hit" }] }).spell.body).toMatchObject({ cost: "reaction", casting: { trigger: "which you take when hit", text: "reaction" } });
    expect(adapt({ time: [{ number: 1, unit: "bonus" }] }).spell.body).toMatchObject({ cost: "bonusAction", casting: { text: "bonus-action" } });
  });

  it("maps school codes to full school groups with colour and icon", () => {
    const { spell, groups } = adapt({ school: "T" });

    expect(groups).toHaveLength(1);
    expect(groups[0].body).toMatchObject({ name: "Transmutation", color: expect.stringMatching(/^#/), icon: "vortex" });
    expect(spell.refs).toMatchObject([{ path: ["groupId"], kind: "spellSchool", name: "Transmutation" }]);
    expect(adapt({ school: "P" }).groups[0].body.name).toBe("Psionic");
    expect(adapt({ school: "Z" }).groups[0].body).toEqual({ name: "Z" });
  });
});

const codes = (spell: { issues: Array<{ code: string }> }) => spell.issues.map((i) => i.code).filter((c) => /^(MANUAL_SPELL|SPELL_)/.test(c));

describe("native spell mechanics", () => {
  it("derives a ranged spell attack with damage and upcast dice", () => {
    const { spell } = adapt({ entries: ["Make a ranged spell attack. On a hit, the target takes {@damage 2d12} bludgeoning damage."], entriesHigherLevel: [{ type: "entries", entries: ["When you cast this spell using a spell slot of 3rd level or higher, the damage increases by {@dice 1d12} for each slot level above 2nd."] }], damageInflict: ["bludgeoning"], spellAttack: ["R"] });

    expect(spell.body).toMatchObject({ executionMode: "native", dice: 2, dieSides: 12, upcastDice: 1, targeting: { kind: "enemy", range: 60 }, resolution: { kind: "attack" }, spellEffects: [{ kind: "dealDamage", damageType: "bludgeoning" }] });
    expect(codes(spell)).toEqual([]);
    expect(createSpellSchema.safeParse(spell.body).success).toBe(true);
  });

  it("derives a saving throw line with half damage on success", () => {
    const { spell } = adapt({ range: { type: "point", distance: { type: "self" } }, entries: ["Each creature in a 5-foot-wide, 30-foot-long line must make a Dexterity saving throw, taking {@damage 2d10} fire damage on a failed save, or half as much damage on a successful one."], damageInflict: ["fire"], savingThrow: ["dexterity"] });

    expect(spell.body).toMatchObject({ executionMode: "native", dice: 2, dieSides: 10, targeting: { kind: "template", shape: "line", size: 30, side: "enemy" }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" } });
    expect(createSpellSchema.safeParse(spell.body).success).toBe(true);
  });

  it("derives a condition on a spell attack and a self-applied condition reaction", () => {
    const snare = adapt({ entries: ["Make a ranged spell attack against the target. On a hit, the target is {@condition restrained}."], spellAttack: ["R"], conditionInflict: ["restrained"] }).spell;

    expect(snare.body).toMatchObject({ executionMode: "native", resolution: { kind: "attack" }, spellEffects: [{ kind: "applyCondition", condition: "restrained" }] });

    const own = adapt({ time: [{ number: 1, unit: "reaction", condition: "when seen" }], range: { type: "point", distance: { type: "self" } }, duration: [{ type: "timed", duration: { type: "round", amount: 1 } }], entries: ["You temporarily become {@condition invisible}."] }).spell;

    expect(own.body).toMatchObject({ executionMode: "native", cost: "reaction", targeting: { kind: "self" }, spellEffects: [{ kind: "applyCondition", condition: "invisible", duration: { rounds: 1 } }] });
    expect(createSpellSchema.safeParse(own.body).success).toBe(true);
  });

  it("derives a speed reduction without a roll", () => {
    const { spell } = adapt({ level: 0, entries: ["The creature's speed is reduced by 10 feet until the start of your next turn."] });

    expect(spell.body).toMatchObject({ executionMode: "native", targeting: { kind: "enemy", range: 60 }, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: -10 }] });
    expect(createSpellSchema.safeParse(spell.body).success).toBe(true);
  });

  it("keeps spells without combat mechanics native and flags them as narrative", () => {
    const { spell } = adapt({ entries: ["You duplicate a simple object you can see."] });

    expect(spell.body).toMatchObject({ executionMode: "native", spellEffects: [], dice: 0 });
    expect(codes(spell)).toEqual(["SPELL_NARRATIVE_ONLY"]);
  });

  it("reports riders that the native effect leaves to the description", () => {
    const { spell } = adapt({ entries: ["Make a ranged spell attack. On a hit, the target takes {@damage 1d6} cold damage and is pushed 10 feet."], damageInflict: ["cold"], spellAttack: ["R"] });

    expect(spell.body.executionMode).toBe("native");
    expect(codes(spell)).toEqual(["SPELL_RIDER_MANUAL"]);
  });

  it.each([
    ["SUMMON", { entries: ["You summon a pot."], miscTags: ["SMN"] }],
    ["UNSUPPORTED_CONDITION", { entries: ["The target must make a Wisdom saving throw or be {@condition pacified|Book}."], savingThrow: ["wisdom"] }],
    ["VARIABLE_DAMAGE", { entries: ["Make a ranged spell attack. On a hit the target takes damage by distance. 1-10 feet: {@dice 5d6} 11-60 feet: {@dice 4d6}"], damageInflict: ["cold"], spellAttack: ["R"] }],
    ["WEAPON", { entries: ["Three weapons of your choice become enveloped by water."] }],
    ["ZONE_OR_TRIGGER", { entries: ["A creature that starts its turn there takes {@damage 1d6} fire damage."], damageInflict: ["fire"] }],
    ["SELF_DAMAGE", { entries: ["You take {@damage 1d20} necrotic damage, and the target regains hit points equal to the damage."], damageInflict: ["necrotic"] }],
    ["BUFF_OR_TRANSFORM", { entries: ["Your Armor Class becomes 20."], damageImmune: ["fire"] }],
    ["UNMODELED_EFFECT", { entries: ["The target must succeed on a Wisdom saving throw or obey you."], savingThrow: ["wisdom"] }],
  ])("keeps %s spells manual with a specific reason", (reason, row) => {
    const { spell } = adapt(row);

    expect(spell.body).toMatchObject({ executionMode: "manual", dice: 0, spellEffects: [] });
    expect(codes(spell)).toEqual([`MANUAL_SPELL_${reason}`]);
    expect(spell.issues.find((i) => i.code.startsWith("MANUAL_SPELL"))?.action).toMatch(/[А-Яа-я]/);
  });
});
