import { describe, expect, it } from "vitest";

import { grimCoverage } from "../coverage";
import { readGrimData, readGrimManifest } from "../data";
import { validateGrimData } from "../validate-data";

import { mulberry32 } from "@/lib/utils/common/rng";
import { nameKey } from "@/lib/utils/content/import";
import { mergeRules } from "@/lib/utils/rules/schema";
import { CHARACTERISTIC_KEYS } from "@/lib/utils/rules/systems/wfrp/characteristics/keys";
import { planDraft } from "@/lib/utils/rules/systems/wfrp/creation/plan";
import { rollCreation } from "@/lib/utils/rules/systems/wfrp/creation/roll";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const data = readGrimData();

const MECHANICAL_STATS = ["attackBonus", "maxHp", "initiative"];

const abilitiesOf = (feat: Record<string, unknown>) => (feat.abilities ?? []) as Array<{ trigger: { event: string }; effects: Array<{ kind: string; stat: string }> }>;

const ROSTER = [["Bog Leech Swarm", "Beasts", 1], ["Ash Hound", "Beasts", 2], ["Thornback Boar", "Beasts", 2], ["Dusk Stalker", "Beasts", 3], ["Cinder Drake", "Beasts", 4], ["Ditch Cutthroat", "Raiders", 1], ["Ridge Reaver", "Raiders", 2], ["Scarred Brute", "Raiders", 2], ["Broadhelm Captain", "Raiders", 3], ["Red Banner Warlord", "Raiders", 4], ["Mire Skeleton", "Restless Dead", 1], ["Barrow Shambler", "Restless Dead", 2], ["Lantern Wraith", "Restless Dead", 3], ["Oathbound Revenant", "Restless Dead", 3], ["Hollow Queen", "Restless Dead", 4], ["Ember Acolyte", "Cultists", 1], ["Ashen Zealot", "Cultists", 2], ["Brand Bearer", "Cultists", 2], ["Masked Oracle", "Cultists", 3], ["Gilded Voice", "Cultists", 4], ["Clay Drudge", "Constructs", 1], ["Copper Hound", "Constructs", 2], ["Iron Watchman", "Constructs", 2], ["Stonebound Sentinel", "Constructs", 3], ["Forge Colossus", "Constructs", 4], ["Gloom Mite Swarm", "Horrors", 1], ["Pallid Crawler", "Horrors", 2], ["Many-Mouthed Thing", "Horrors", 3], ["Veil Stalker", "Horrors", 3], ["Hunger Below", "Horrors", 4]];

describe("grim-d100 catalog", () => {
  it("passes the validator", () => {
    expect(validateGrimData(data)).toEqual({ ok: true });
  });

  it("has no coverage warnings", () => {
    expect(grimCoverage(data)).toEqual([]);
  });

  it("units follow the plan roster: name, theme and level in file order", () => {
    expect(data.units.map((u) => [u.name, (u.statblock as { creatureType: string }).creatureType, u.level])).toEqual(ROSTER);
  });

  it("units carry no spells, race, attacks or avatar yet", () => {
    for (const unit of data.units) for (const key of ["knownSpells", "raceId", "attacks", "avatar"]) expect(unit, `${String(unit.name)}.${key}`).not.toHaveProperty(key);
  });

  it("manifest counts match the data", () => {
    const { counts } = readGrimManifest();

    expect(counts).toEqual({ races: 4, careers: 16, feats: 50, units: 30, spells: 0, artifacts: 0, raceProfiles: 4 });
    expect(counts).toEqual({ races: data.races.length, careers: data.careers.length, feats: data.feats.length, units: data.units.length, spells: data.spells.length, artifacts: data.artifacts.length, raceProfiles: data.raceProfiles.length });
  });

  it("feat abilities are passive modifyStat on stats that act on a wfrp hero", () => {
    for (const feat of data.feats)
      for (const ability of abilitiesOf(feat)) {
        expect(ability.trigger.event).toBe("passive");

        for (const effect of ability.effects) {
          expect(effect.kind).toBe("modifyStat");
          expect(MECHANICAL_STATS).toContain(effect.stat);
        }
      }
  });

  it("has 20 mechanical feats and 7 origin feats without xpCost", () => {
    expect(data.feats.filter((f) => abilitiesOf(f).length > 0)).toHaveLength(20);

    const origin = data.feats.filter((f) => f.type === "origin");

    expect(origin).toHaveLength(7);
    expect(origin.every((f) => f.xpCost === undefined || f.xpCost === null)).toBe(true);
  });

  it("species career tables cover all careers and Lowlander lists every one", () => {
    const tables = data.raceProfiles.map((p) => new Set((p.profile.careerTable ?? []).map((r) => nameKey(r.careerId))));

    const all = new Set(data.careers.map((c) => nameKey(String(c.name))));

    expect(new Set(tables.flatMap((t) => [...t]))).toEqual(all);

    const lowlander = data.raceProfiles.find((p) => p.race === "Lowlander");

    expect(new Set((lowlander?.profile.careerTable ?? []).map((r) => nameKey(r.careerId)))).toEqual(all);
  });
});

describe("creation e2e", () => {
  const merged = mergeRules(WFRP_RULES, (data.rules ?? {}) as Parameters<typeof mergeRules>[1]);

  if (!merged.ok) throw new Error("rules patch invalid");

  const rules = merged.rules.advancement;

  const careerIds = new Set(data.careers.map((c) => String(c.name)));

  const featIds = new Set(data.feats.map((f) => String(f.name)));

  const ctxOf = (profile: (typeof data.raceProfiles)[number]["profile"]) => ({ profile, rules, careerIds, featIds });

  it.each(data.raceProfiles.map((p, i) => [p.race, i] as const))("%s: every table career plans with rolled stats", (_race, speciesIndex) => {
    const { profile } = data.raceProfiles[speciesIndex];

    profile.careerTable.forEach(({ careerId }, rowIndex) => {
      const rolls = rollCreation(mulberry32(1000 * speciesIndex + rowIndex), profile);

      const plan = planDraft({ career: { mode: "choice", careerId }, stats: { mode: "rolled", rolls: rolls.statRolls }, talents: rolls.randomTalents }, ctxOf(profile));

      if (!plan.ok) throw new Error(`${careerId}: ${plan.errors.join(",")}`);

      expect(plan.experience).toBe(rules.creation.careerBonus.choice + rules.creation.statBonus.rolled);

      CHARACTERISTIC_KEYS.forEach((k, i) => expect(plan.characteristics.base[k]).toBe(20 + (profile.mods[k] ?? 0) + rolls.statRolls[i]));

      expect(plan.characteristics.career.careerId).toBe(careerId);

      for (const talent of [...profile.talents, ...rolls.randomTalents]) expect(plan.characteristics.talents[talent]).toBeGreaterThan(0);
    });
  });

  it.each(data.raceProfiles.map((p, i) => [p.race, i] as const))("%s: rolled career and free stats plan", (_race, speciesIndex) => {
    const { profile } = data.raceProfiles[speciesIndex];

    const rolls = rollCreation(mulberry32(1000 * speciesIndex), profile);

    expect(planDraft({ career: { mode: "rolled", careerId: rolls.careerRolls[0].careerId }, stats: { mode: "rolled", rolls: rolls.statRolls }, talents: rolls.randomTalents }, ctxOf(profile)).ok).toBe(true);

    const free = planDraft({ career: { mode: "choice", careerId: profile.careerTable[0].careerId }, stats: { mode: "free", points: Array(10).fill(rules.creation.freeBudget / 10) }, talents: [] }, ctxOf(profile));

    expect(free.ok).toBe(true);
  });
});
