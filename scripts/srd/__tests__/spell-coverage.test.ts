import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SpellRow } from "../lib/types";
import dmResolved from "./fixtures/dm-resolved-spells.json";

import { SpellEffectSchema } from "@/lib/utils/spells/model/schema";

const spells: SpellRow[] = JSON.parse(readFileSync(join(process.cwd(), "data/templates/srd-5.2/spells.json"), "utf8"));

const spell = (slug: string) => {
  const s = spells.find((x) => x.slug === `srd-2024_${slug}`);

  if (!s) throw new Error(slug);

  return s;
};

describe("SRD spell effect coverage", () => {
  it("spells without effects are exactly the explicit DM-resolved list", () => {
    const bare = spells.filter((s) => s.spellEffects.length === 0).map((s) => s.slug.replace("srd-2024_", ""));

    expect(bare.sort()).toEqual([...dmResolved].sort());
  });

  it("ritual flag is set on the 29 SRD ritual spells only", () => {
    const rituals = spells.filter((s) => s.ritual === true).map((s) => s.slug);

    expect(rituals).toHaveLength(29);
    expect(rituals).toContain("srd-2024_detect-magic");
    expect(spell("fireball").ritual).toBeFalsy();
  });

  it("material components: flags on every spell, parsed ingredients, explicit list of multi-cost spells left unparsed", () => {
    const withIngredients = spells.filter((s) => (s.ingredients ?? []).length > 0);

    const unparsed = spells.filter((s) => s.componentFlags?.m && (s.ingredients ?? []).length === 0).map((s) => s.slug.replace("srd-2024_", ""));

    expect(spells.filter((s) => s.lists.length > 0).every((s) => s.componentFlags)).toBe(true);
    expect(withIngredients).toHaveLength(183);
    expect(unparsed.sort()).toEqual(["astral-projection", "clone", "jump", "legend-lore", "secret-chest", "true-strike"]);
    expect(spell("revivify").ingredients).toEqual([{ name: "diamond", qty: 1, consumed: true, minGp: 300, focus: false }]);
  });

  it("ingredients are consumed only when the material text says so", () => {
    const wrong = spells.flatMap((s) => {
      const text = /Components: [^·]*?M \((.*?)\) · Duration/.exec(s.description)?.[1] ?? "";

      return (s.ingredients ?? []).length > 0 && (s.ingredients ?? []).some((i) => i.consumed) !== /consum/i.test(text) ? [s.slug] : [];
    });

    expect(wrong).toEqual([]);
    expect(spell("bless").ingredients?.[0].consumed).toBe(false);
    expect(spell("chromatic-orb").ingredients?.[0].consumed).toBe(false);
    expect(spell("revivify").ingredients?.[0].consumed).toBe(true);
    expect(spell("true-strike").ingredients).toEqual([]);
    expect(spell("warding-bond").ingredients).toEqual([{ name: "Platinum rings", qty: 2, minGp: 50, consumed: false, focus: false }]);
  });

  it("every override effect passes the spell schema", () => {
    const failed = spells.flatMap((s) => s.spellEffects.map((e) => ({ slug: s.slug, ok: SpellEffectSchema.safeParse(e).success }))).filter((r) => !r.ok);

    expect(failed).toEqual([]);
  });

  it("orbs pick their damage type at cast time", () => {
    for (const slug of ["chromatic-orb", "sorcerous-burst"]) {
      const [effect] = spell(slug).spellEffects;

      expect(effect.kind).toBe("chooseOne");
      expect(spell(slug).resolution).toEqual({ kind: "attack" });
    }

    expect(spell("chromatic-orb")).toMatchObject({ dice: 3, dieSides: 8, upcastDice: 1 });
  });

  it("smites ride on the next melee hit of the turn", () => {
    expect(spell("divine-smite").spellEffects).toEqual([{ kind: "hitRider", attackKind: "melee", extraDice: "2d8", damageType: "radiant", charges: 1, duration: { rounds: 1 }, expireAtTurnEnd: true }]);
    expect(spell("shining-smite").spellEffects).toMatchObject([{ kind: "hitRider", extraDice: "2d6" }]);
  });

  it("Power Word Heal restores full HP and Regenerate heals 4d8+15 then 1 per round", () => {
    expect(spell("power-word-heal").spellEffects[0]).toEqual({ kind: "heal", amount: { percentOf: "maxHp", value: 100 } });
    expect(spell("regenerate").spellEffects.map((e) => e.kind)).toEqual(["heal", "heal", "hot"]);
  });

  it("fog, darkness and spikes are map zones", () => {
    expect(spell("fog-cloud").targeting).toMatchObject({ kind: "template", size: 20, zone: { terrain: ["obscured"] } });
    expect(spell("darkness").targeting).toMatchObject({ size: 15, zone: { terrain: ["obscured"] } });
    expect(spell("spike-growth").targeting).toMatchObject({ zone: { terrain: ["difficult"], onEnter: { effects: [{ kind: "dealDamage", amount: "2d4", damageType: "piercing" }] } } });
  });

  it("Chain Lightning adds a bolt per slot level", () => {
    expect(spell("chain-lightning").upcastTargets).toBe(1);
  });
});
