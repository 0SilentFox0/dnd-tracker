import * as path from "path";
import { describe, expect, it } from "vitest";

import { type GrimData, readGrimData } from "../data";
import { careerSkillIssue, validateGrimData } from "../validate-data";

const fixtures = path.join(__dirname, "fixtures");

const load = (): GrimData => structuredClone(readGrimData(fixtures));

const issuesOf = (data: GrimData) => {
  const result = validateGrimData(data);

  return result.ok ? [] : result.issues;
};

describe("readGrimData", () => {
  it("reads present files and treats missing ones as empty", () => {
    const data = load();

    expect(data.races).toHaveLength(1);
    expect(data.careers).toHaveLength(2);
    expect(data.feats).toHaveLength(2);
    expect(data.units).toHaveLength(1);
    expect(data.spells).toHaveLength(1);
    expect(data.artifacts).toEqual([]);
    expect(data.raceProfiles).toHaveLength(1);
  });
});

describe("validateGrimData", () => {
  it("accepts the good fixture", () => {
    expect(validateGrimData(load())).toEqual({ ok: true });
  });

  it("rejects a duplicate career name", () => {
    const data = load();

    data.careers[1].name = "vermin hunter";
    expect(issuesOf(data).some((i) => i.includes("careers #2") && i.includes("duplicate name"))).toBe(true);
  });

  it("rejects a tier talent that is not a feat", () => {
    const data = load();

    data.careers[0].tier2_talents = ["Missing Talent"];
    expect(issuesOf(data)).toContain('careers #1 "Vermin Hunter": unknown tier2_talents "Missing Talent"');
  });

  it("rejects a unit linking to a spell or race that is not in the data", () => {
    const data = load();

    data.units[0].knownSpells = ["Ghost Bolt"];
    data.units[0].raceId = "Nobody";

    const issues = issuesOf(data);

    expect(issues).toContain('units #1 "Giant Rat": unknown knownSpells "Ghost Bolt"');
    expect(issues).toContain('units #1 "Giant Rat": unknown raceId "Nobody"');
  });

  it("rejects a nested spell link in a unit that is not in the data", () => {
    const data = load();

    data.units[0].abilities = [{ name: "Cast", description: "x", spellId: "Ghost Bolt" }];
    expect(issuesOf(data).some((i) => i.startsWith("units #1") && i.includes('"Ghost Bolt"'))).toBe(true);
  });

  it("rejects a profile pointing at an unknown race, career or talent", () => {
    const data = load();

    data.raceProfiles[0] = { race: "Nobody", profile: { ...data.raceProfiles[0].profile, talents: ["Nope"], careerTable: [{ max: 100, careerId: "Ghost" }] } };

    const issues = issuesOf(data);

    expect(issues.some((i) => i.includes("unknown race"))).toBe(true);
    expect(issues.some((i) => i.includes('unknown feat "Nope"'))).toBe(true);
    expect(issues.some((i) => i.includes('unknown career "Ghost"'))).toBe(true);
  });

  it("rejects a profile that breaks its own schema", () => {
    const data = load();

    data.raceProfiles[0].profile = { ...data.raceProfiles[0].profile, careerTable: [{ max: 50, careerId: "Vermin Hunter" }] };
    expect(issuesOf(data).some((i) => i.includes("race-profiles #1") && i.includes("creation.tableEnd"))).toBe(true);
  });

  it("names the row that fails the resource schema or has an unknown column", () => {
    const data = load();

    data.units[0].maxHp = -5;
    data.feats[1].bogusColumn = 1;

    const issues = issuesOf(data);

    expect(issues.some((i) => i.startsWith('units #1 "Giant Rat"'))).toBe(true);
    expect(issues.some((i) => i.startsWith('feats #2 "Sharp Eyed"') && i.includes("bogusColumn"))).toBe(true);
  });

  it("rejects a row without a name", () => {
    const data = load();

    delete data.races[0].name;
    expect(issuesOf(data).some((i) => i.startsWith("races #1") && i.includes("name is required"))).toBe(true);
  });

  it("rejects an invalid rules patch", () => {
    const data = load();

    data.rules = { morale: { enabled: "yes" } } as never;
    expect(issuesOf(data).some((i) => i.startsWith("rules:"))).toBe(true);
  });

  it.each([
    ["melee", "needs a specialisation"],
    ["perception:x", "takes no specialisation"],
    ["melee:spear", "unknown specialisation"],
    ["sailing", "unknown skill"],
  ])("rejects career skill %s", (skill, reason) => {
    const data = load();

    data.careers[0].tier1_skills = [skill];
    expect(issuesOf(data)).toContain(`careers #1 "Vermin Hunter": tier1_skills "${skill}" ${reason}`);
  });

  it("accepts open and fixed specialisations", () => {
    expect(careerSkillIssue("lore:herbs")).toBeNull();
    expect(careerSkillIssue("ranged:bow")).toBeNull();
    expect(careerSkillIssue("perception")).toBeNull();
  });

  it("rejects a malformed tier status", () => {
    const data = load();

    data.careers[0].tier1_status = "Copper 2";
    expect(issuesOf(data).some((i) => i.includes("tier1_status"))).toBe(true);
  });

  it.each(["talents", "careerTable"] as const)("rejects a profile without %s", (key) => {
    const data = load();

    delete (data.raceProfiles[0].profile as Partial<typeof data.raceProfiles[0]["profile"]>)[key];
    expect(issuesOf(data).some((i) => i.includes(`profile missing "${key}"`))).toBe(true);
  });

  it("rejects a non-ascending careerTable", () => {
    const data = load();

    data.raceProfiles[0].profile.careerTable = [
      { max: 60, careerId: "Vermin Hunter" },
      { max: 40, careerId: "Watchman" },
      { max: 100, careerId: "Watchman" },
    ];
    expect(issuesOf(data).some((i) => i.includes("creation.tableAscending"))).toBe(true);
  });

  it("rejects forbidden terms in deep strings, by word boundary", () => {
    const data = load();

    data.feats[0].description = "Blessed by SIGMAR.";
    data.races[0].passiveAbility = { name: "Stubborn", description: "From the old world" };
    data.careers[0].tier3_trappings = ["Warpstone shard"];

    const issues = issuesOf(data);

    expect(issues).toContain('feats #1 "Hardy": forbidden term "Sigmar"');
    expect(issues).toContain('races #1 "Hollander": forbidden term "Old World"');
    expect(issues).toContain('careers #1 "Vermin Hunter": forbidden term "Warpstone"');
  });

  it("does not flag substrings of forbidden terms", () => {
    const data = load();

    data.feats[0].description = "Tomorrow, chaotic";
    expect(issuesOf(data)).toEqual([]);
  });

  it("rejects a mechanical talent with broken abilities", () => {
    const data = load();

    data.feats[0].abilities = [{ name: "x", trigger: { event: "passive" }, effects: [] }];
    expect(issuesOf(data).some((i) => i.startsWith('feats #1 "Hardy": abilities'))).toBe(true);
  });
});
