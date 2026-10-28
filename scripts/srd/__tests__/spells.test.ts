import { describe, expect, it } from "vitest";

import { convertSpellGroups } from "../convert/spell-groups";
import { convertSpells, durationRounds } from "../convert/spells";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const spells = convertSpells(loadOpen5e(FIXTURE_DIR));

const spell = (slug: string) => {
  const s = spells.find((x) => x.slug === `srd-2024_${slug}`);

  if (!s) throw new Error(slug);

  return s;
};

describe("spell groups", () => {
  it("8 schools and a separate Monster Actions group with icon keys and colours", () => {
    const groups = convertSpellGroups();

    expect(groups.map((g) => g.name)).toEqual(["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation", "Monster Actions"]);
    expect(groups.map((g) => g.icon)).toEqual(["shield", "portal", "eye", "heart", "flame", "mask", "skull", "vortex", "skull"]);
    expect(groups.every((g) => /^#[0-9a-f]{6}$/.test(g.color) && g.slug.startsWith("srd-2024_"))).toBe(true);
  });
});

describe("convertSpells", () => {
  it("Fireball: circle 20 at 150 ft, Dex save half, 8d6 fire, +1d6 per slot", () => {
    expect(spell("fireball")).toMatchObject({
      name: "Fireball",
      level: 3,
      groupId: "Evocation",
      cost: "action",
      dice: 8,
      dieSides: 6,
      concentration: false,
      upcastDice: 1,
      targeting: { kind: "template", shape: "circle", size: 20, side: "enemy", maxTargets: 20, range: 150 },
      resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
      spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }],
    });
    expect(spell("fireball").description.startsWith("Level 3 Evocation · Casting Time: Action · Range: 150 feet · Components: V, S, M (a ball of bat guano and sulfur) · Duration: Instantaneous · Classes: Sorcerer, Wizard\n\n")).toBe(true);
    expect(spell("fireball").description).toContain("Using a Higher-Level Spell Slot. The damage increases by 1d6");
  });

  it("Cure Wounds: touch ally heal 2d8 + mod, +2d8 per slot", () => {
    expect(spell("cure-wounds")).toMatchObject({ targeting: { kind: "ally", range: 5 }, resolution: { kind: "auto" }, dice: 2, dieSides: 8, upcastDice: 2, addAbilityMod: true, spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }] });
  });

  it("Lightning Bolt: 100-ft line from self; Fire Bolt: spell attack 1d10 at 120 ft, no upcast", () => {
    expect(spell("lightning-bolt").targeting).toEqual({ kind: "template", shape: "line", size: 100, side: "enemy", maxTargets: 20 });
    expect(spell("fire-bolt")).toMatchObject({ targeting: { kind: "enemy", range: 120 }, resolution: { kind: "attack" }, dice: 1, dieSides: 10 });
    expect(spell("fire-bolt").upcastDice).toBeUndefined();
  });

  it("Hold Person: save condition paralyzed with save-ends, +1 target per slot", () => {
    expect(spell("hold-person")).toMatchObject({
      targeting: { kind: "enemy", range: 60 },
      resolution: { kind: "save", ability: "wisdom", onSuccess: "none" },
      spellEffects: [{ kind: "applyCondition", condition: "paralyzed", duration: { rounds: 10 }, saveEnds: { ability: "wisdom" } }],
      upcastTargets: 1,
      concentration: true,
    });
  });

  it("Spirit Guardians is a self-centered emanation; all SRD circles are exact", () => {
    expect(spell("spirit-guardians")).toMatchObject({ targeting: { kind: "template", shape: "emanation", size: 15, side: "enemy" }, resolution: { kind: "save", ability: "wisdom", onSuccess: "half" }, dice: 3, dieSides: 8, upcastDice: 1 });
    expect(spell("spirit-guardians").targeting).not.toHaveProperty("range");
    expect(spells.filter((s) => s.targeting.kind === "template" && s.targeting.shape === "circle").every((s) => s.targeting.kind === "template" && s.targeting.exact === true)).toBe(true);
  });

  it("Hex deals no damage on cast; Teleport (d100) has no dice; Sacred Flame cantrip has no upcast", () => {
    expect(spell("hex")).toMatchObject({ dice: 0, cost: "bonusAction", targeting: { kind: "enemy", range: 90 } });
    expect(spell("teleport")).toMatchObject({ dice: 0, spellEffects: [] });
    expect(spell("teleport").dieSides).toBeUndefined();
    expect(spell("sacred-flame")).toMatchObject({ resolution: { kind: "save", ability: "dexterity", onSuccess: "none" }, dice: 1, dieSides: 8 });
    expect(spell("sacred-flame").upcastDice).toBeUndefined();
  });

  it("overrides win: Bless, Magic Missile, Web, Dimension Door, Shield", () => {
    expect(spell("bless")).toMatchObject({ dice: 0, targeting: { kind: "area", side: "ally", maxTargets: 3, range: 30 }, resolution: { kind: "auto" }, upcastTargets: 1 });
    expect(spell("bless").spellEffects).toEqual([
      { kind: "modifyStat", stat: "attackBonus", flat: 2, duration: { rounds: 10 } },
      { kind: "modifyStat", stat: "savingThrow", flat: 2, duration: { rounds: 10 } },
    ]);
    expect(spell("magic-missile")).toMatchObject({ dice: 1, dieSides: 4, targeting: { kind: "area", side: "enemy", maxTargets: 3, range: 120 }, upcastTargets: 1 });
    expect(spell("web").spellEffects).toEqual([{ kind: "applyCondition", condition: "restrained", duration: { rounds: 10 }, saveEnds: { ability: "strength" } }]);
    expect(spell("web").dieSides).toBeUndefined();
    expect(spell("dimension-door")).toMatchObject({ dice: 0, targeting: { kind: "self" }, spellEffects: [] });
    expect(spell("shield")).toMatchObject({ targeting: { kind: "self" }, spellEffects: [{ kind: "modifyStat", stat: "armor", flat: 5, duration: { rounds: 1 } }] });
  });

  it("Mass Cure Wounds: 30-ft circle of allies, up to six", () => {
    expect(spell("mass-cure-wounds")).toMatchObject({ targeting: { kind: "template", shape: "circle", size: 30, side: "ally", maxTargets: 6, range: 60 }, addAbilityMod: true, dice: 5, dieSides: 8, upcastDice: 1 });
  });

  it("durationRounds", () => {
    expect(durationRounds("1 minute")).toBe(10);
    expect(durationRounds("1 round")).toBe(1);
    expect(durationRounds("6 rounds")).toBe(6);
    expect(durationRounds("instantaneous")).toBe(1);
    expect(durationRounds("8 hours")).toBe(99);
    expect(durationRounds("until dispelled")).toBe(99);
  });

  it("slugs are unique and sorted", () => {
    const slugs = spells.map((s) => s.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect([...slugs].sort()).toEqual(slugs);
  });
});

it("preserves reaction triggers and minute/hour casting times as executable timing", () => {
  const source = loadOpen5e(FIXTURE_DIR);

  const base = source.spells[0];

  const data = { ...source, spells: [
    { ...base, pk: "srd-2024_reaction-test", fields: { ...base.fields, casting_time: "reaction", reaction_condition: "when hit" } },
    { ...base, pk: "srd-2024_long-test", fields: { ...base.fields, casting_time: "10minutes" } },
  ] };

  const out = convertSpells(data);

  expect(out.find((s) => s.slug === "srd-2024_reaction-test")).toMatchObject({ cost: "reaction", casting: { trigger: "when hit" } });
  expect(out.find((s) => s.slug === "srd-2024_long-test")).toMatchObject({ cost: "long", casting: { rounds: 100, text: "10minutes" } });
});
