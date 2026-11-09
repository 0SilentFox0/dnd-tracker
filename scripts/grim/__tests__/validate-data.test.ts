import * as path from "path";
import { describe, expect, it } from "vitest";

import { type GrimData, readGrimData } from "../data";
import { validateGrimData } from "../validate-data";

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
    expect(data.spells).toEqual([]);
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

    data.careers[1].name = "ratcatcher";
    expect(issuesOf(data).some((i) => i.includes("careers #2") && i.includes("duplicate name"))).toBe(true);
  });

  it("rejects a tier talent that is not a feat", () => {
    const data = load();

    data.careers[0].tier2_talents = ["Missing Talent"];
    expect(issuesOf(data)).toContain('careers #1 "Ratcatcher": unknown talent "Missing Talent"');
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

    data.raceProfiles[0].profile = { ...data.raceProfiles[0].profile, careerTable: [{ max: 50, careerId: "Ratcatcher" }] };
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
});
