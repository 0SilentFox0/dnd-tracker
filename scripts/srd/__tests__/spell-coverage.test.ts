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
