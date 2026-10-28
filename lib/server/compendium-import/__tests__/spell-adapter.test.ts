import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { spellCast } from "../adapters/spell-cast";
import { deriveSpell } from "../adapters/spell-derive";

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

  describe("narrative without engine changes", () => {
    const reasonOf = (row: Record<string, unknown>) => {
      const full = { ...base, ...row } as Record<string, unknown>;

      const derived = deriveSpell(full, (row.entries as string[]).join(" ").replace(/\{@\w+ ([^}|]*)[^}]*\}/g, "$1"), "", spellCast(full));

      return "native" in derived && derived.native.narrative ? derived.native.narrativeReason : "mechanical";
    };

    const rest = { entries: ["You mark a stop on a ticket. If a creature takes a short rest while traveling and regains hit points by spending Hit Dice, it regains an extra {@dice 1d10} hit points."] };

    const objectInvisible = { entries: ["An object you can see within range becomes {@condition invisible} until the spell ends. It is no larger than a 5-foot cube."] };

    it("treats hit points that only appear around rests as out of combat", () => {
      expect(reasonOf(rest)).toBe("outOfCombat");
      expect(reasonOf({ entries: ["The target regains {@dice 2d8} hit points."] })).toBe("mechanical");
      expect(reasonOf({ ...rest, entries: [`${rest.entries[0]} The target also regains {@dice 1d8} hit points right away.`] })).toBe("mechanical");
    });

    it("treats a condition on an object as narrative but keeps creatures mechanical", () => {
      expect(reasonOf(objectInvisible)).toBe("objectOnly");
      expect(reasonOf({ entries: ["A creature or object you touch becomes {@condition invisible} until the spell ends."], miscTags: ["SGT"] })).toBe("mechanical");
      expect(reasonOf({ entries: ["The target becomes {@condition invisible} for a minute."] })).toBe("mechanical");
    });

    it("treats created plain objects and summons without stats as narrative", () => {
      expect(reasonOf({ entries: ["Five mundane weapons materialize in an open space. The weapons vanish when the spell ends."] })).toBe("createdObject");
      expect(reasonOf({ entries: ["You summon a cast iron pot on the ground."], miscTags: ["SMN"] })).toBe("createdObject");
      expect(reasonOf({ entries: ["You summon a spirit with an Armor Class of 15 and 100 hit points."], miscTags: ["SMN"] })).toBe("mechanical");
      expect(reasonOf({ entries: ["You summon a bicycle with a walking speed of 60 feet."], miscTags: ["SMN"] })).toBe("mechanical");
      expect(reasonOf({ entries: ["You summon a {@creature wolf}."], miscTags: ["SMN"] })).toBe("mechanical");
    });

    it("treats a long cast with a day-long buff as out of combat", () => {
      const feast = { time: [{ number: 10, unit: "minute" }], entries: ["The feast takes 1 hour. A creature that partakes gains a +2 bonus to Dexterity saving throws. The benefits last for 24 hours."], savingThrow: ["dexterity"] };

      expect(reasonOf(feast)).toBe("outOfCombat");
      expect(reasonOf({ ...feast, damageInflict: ["fire"] })).toBe("mechanical");
      expect(reasonOf({ ...feast, time: [{ number: 1, unit: "action" }] })).toBe("mechanical");
    });
  });

  describe("composed cores", () => {
    it("derives immobilized with a save and a target cap from suspension text", () => {
      const { spell } = adapt({ level: 5, duration: [{ type: "timed", duration: { type: "minute", amount: 10 }, concentration: true }], savingThrow: ["constitution"], entries: ["Six creatures of your choice that you can see within range rise vertically and remain suspended. An unwilling creature that succeeds on a Constitution saving throw is unaffected.", "A target can move only by pushing or pulling against a fixed object."] });

      expect(spell.body).toMatchObject({ executionMode: "native", targeting: { kind: "area", maxTargets: 6, range: 60 }, resolution: { kind: "save", ability: "constitution", onSuccess: "none" }, spellEffects: [{ kind: "applyCondition", condition: "immobilized", duration: { rounds: 99 } }] });
      expect(codes(spell)).toEqual(["SPELL_RIDER_MANUAL"]);
      expect(createSpellSchema.safeParse(spell.body).success).toBe(true);
    });

    it("keeps an instantaneous enclosure with size-capped targets immobilized until dispelled", () => {
      const { spell } = adapt({ savingThrow: ["dexterity"], entries: ["A shell rapidly grows around up to four Medium or smaller creatures within range. An unwilling creature can make a Dexterity saving throw, leaping outside on a success. The shell has 100 hit points."] });

      expect(spell.body).toMatchObject({ executionMode: "native", targeting: { kind: "area", maxTargets: 4 }, spellEffects: [{ kind: "applyCondition", condition: "immobilized", duration: { rounds: 99 } }] });
    });

    it("moves a movement-only trigger into riders and derives the speed bonus", () => {
      const { spell } = adapt({ level: 2, duration: [{ type: "timed", duration: { type: "hour", amount: 1 } }], entries: ["You and up to three other willing creatures within range form a bond. For the duration, each target's speed increases by 5 feet, and whenever an affected creature ends its turn, other targets can use their reaction to move up to half their speed."], entriesHigherLevel: [{ type: "entries", entries: ["When you cast this spell using a spell slot of 3rd level or higher, you can target one additional creature for each slot level above 2nd."] }] });

      expect(spell.body).toMatchObject({ executionMode: "native", targeting: { kind: "area", side: "ally", maxTargets: 4 }, upcastTargets: 1, spellEffects: [{ kind: "modifyStat", stat: "speed", flat: 5, duration: { rounds: 99 } }] });
      expect(spell.issues.find((i) => i.code === "SPELL_RIDER_MANUAL")?.action).toContain("рух за реакцією");
    });

    it("does not read one option of a choice as the whole effect", () => {
      const { spell } = adapt({ entries: ["You gain one of the following effects of your choice: you regain {@dice 1d4} hit points; your speed increases by 15 feet until the end of your next turn."] });

      expect(spell.body.spellEffects).not.toContainEqual(expect.objectContaining({ stat: "speed" }));
    });

    it("keeps a trigger that deals damage as a zone blocker", () => {
      const { spell } = adapt({ damageInflict: ["fire"], entries: ["Whenever a creature ends its turn there, it takes {@damage 1d6} fire damage and can move up to 10 feet."] });

      expect(codes(spell)).toEqual(["MANUAL_SPELL_ZONE_OR_TRIGGER"]);
    });
  });

  it.each([
    ["SUMMON", { entries: ["You summon a guardian with an Armor Class of 15 and 100 hit points."], miscTags: ["SMN"] }],
    ["UNSUPPORTED_CONDITION", { entries: ["The target must make a Wisdom saving throw or be {@condition pacified|Book}."], savingThrow: ["wisdom"] }],
    ["VARIABLE_DAMAGE", { entries: ["The target takes {@dice 1d6} cold damage for every 10 feet it moved this turn."], damageInflict: ["cold"], spellAttack: ["R"] }],
    ["WEAPON", { entries: ["Three weapons of your choice become enveloped by water."] }],
    ["ZONE_OR_TRIGGER", { entries: ["A creature that starts its turn there takes {@damage 1d6} fire damage."], damageInflict: ["fire"] }],
    ["SELF_DAMAGE", { entries: ["You take {@damage 1d20} necrotic damage as the spell recoils."], damageInflict: ["necrotic"] }],
    ["BUFF_OR_TRANSFORM", { entries: ["Your Armor Class becomes 20."], damageImmune: ["fire"] }],
    ["UNMODELED_EFFECT", { entries: ["The target must succeed on a Wisdom saving throw or obey you."], savingThrow: ["wisdom"] }],
  ])("keeps %s spells manual with a specific reason", (reason, row) => {
    const { spell } = adapt(row);

    expect(spell.body).toMatchObject({ executionMode: "manual", dice: 0, spellEffects: [] });
    expect(codes(spell)).toEqual([`MANUAL_SPELL_${reason}`]);
    expect(spell.issues.find((i) => i.code.startsWith("MANUAL_SPELL"))?.action).toMatch(/[А-Яа-я]/);
  });

  it("labels the blocker detail in Ukrainian, not raw source values", () => {
    expect(adapt({ entries: ["The target must succeed on a Strength saving throw or obey you."], savingThrow: ["strength"] }).spell.issues.find((i) => i.code.startsWith("MANUAL_SPELL"))?.action).not.toMatch(/strength/);
    expect(adapt({ entries: ["The target must make a Wisdom saving throw or be {@condition pacified|Book}."], savingThrow: ["wisdom"] }).spell.issues.find((i) => i.code.startsWith("MANUAL_SPELL"))?.action).toContain("невідомий стан «pacified»");
  });
});
