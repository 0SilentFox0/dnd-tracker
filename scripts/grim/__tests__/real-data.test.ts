import { describe, expect, it } from "vitest";

import { grimCoverage } from "../coverage";
import { readGrimData, readGrimManifest } from "../data";
import { validateGrimData } from "../validate-data";

import { nameKey } from "@/lib/utils/content/import";

const data = readGrimData();

const MECHANICAL_STATS = ["attackBonus", "maxHp", "initiative"];

const abilitiesOf = (feat: Record<string, unknown>) => (feat.abilities ?? []) as Array<{ trigger: { event: string }; effects: Array<{ kind: string; stat: string }> }>;

describe("grim-d100 catalog", () => {
  it("passes the validator", () => {
    expect(validateGrimData(data)).toEqual({ ok: true });
  });

  it("has no coverage warnings", () => {
    expect(grimCoverage(data)).toEqual([]);
  });

  it("manifest counts match the data", () => {
    const { counts } = readGrimManifest();

    expect(counts).toEqual({ races: 4, careers: 16, feats: 50, units: 0, spells: 0, artifacts: 0, raceProfiles: 4 });
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
