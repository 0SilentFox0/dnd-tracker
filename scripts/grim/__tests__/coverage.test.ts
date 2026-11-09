import * as path from "path";
import { describe, expect, it } from "vitest";

import { grimCoverage } from "../coverage";
import { type GrimData, readGrimData } from "../data";

const load = (): GrimData => structuredClone(readGrimData(path.join(__dirname, "fixtures")));

describe("grimCoverage", () => {
  it("reports only the known fixture gaps", () => {
    const warnings = grimCoverage(load());

    expect(warnings).toHaveLength(4);
    expect(warnings).toEqual(
      expect.arrayContaining([
        'characteristic "i": no career advances it',
        'characteristic "dex": no career advances it',
        'careers "Vermin Hunter": tier 1 lists 4 items, ticksRequired[0] is 10',
        'careers "Watchman": tier 1 lists 3 items, ticksRequired[0] is 10',
      ]),
    );
  });

  it("flags an unused feat", () => {
    const data = load();

    data.feats.push({ name: "Spare", type: "general", description: "x", xpCost: 100, maxRank: 1 });
    expect(grimCoverage(data)).toContain('feats "Spare": unused');
  });

  it("flags a career outside every careerTable", () => {
    const data = load();

    data.careers.push({ ...data.careers[1], name: "Lone Wolf" });
    expect(grimCoverage(data)).toContain('careers "Lone Wolf": not in any species careerTable');
  });

  it("flags statuses that do not rise", () => {
    const data = load();

    ["Silver 1", "Brass 2", "Gold 1", "Gold 2"].forEach((status, i) => {
      data.careers[0][`tier${i + 1}_status`] = status;
    });
    expect(grimCoverage(data)).toContain('careers "Vermin Hunter": tier statuses do not rise');
  });

  it("flags a randomTalentCount above the distinct table talents", () => {
    const data = load();

    data.raceProfiles[0].profile.randomTalentCount = 3;
    expect(grimCoverage(data).some((w) => w.includes("exceeds"))).toBe(true);
  });
});
