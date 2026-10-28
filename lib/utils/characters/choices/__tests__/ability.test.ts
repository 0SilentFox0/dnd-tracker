import { describe, expect, it } from "vitest";

import { scores } from "./fixtures";

import { abilityScoreDelta, applyDelta, capIssues } from "@/lib/utils/characters/choices/ability";

describe("ASI delta", () => {
  it("add, change, remove", () => {
    expect(abilityScoreDelta([], [{ ability: "strength", max: 20 }, { ability: "strength", max: 20 }])).toEqual({ strength: 2 });
    expect(abilityScoreDelta([{ ability: "strength", max: 20 }, { ability: "strength", max: 20 }], [{ ability: "dexterity", max: 20 }, { ability: "dexterity", max: 20 }])).toEqual({ strength: -2, dexterity: 2 });
    expect(abilityScoreDelta([{ ability: "charisma", max: 20 }], [])).toEqual({ charisma: -1 });
    expect(abilityScoreDelta([{ ability: "wisdom", max: 20 }], [{ ability: "wisdom", max: 20 }])).toEqual({});
  });

  it("applyDelta returns only changed scores; cap only for raised abilities", () => {
    expect(applyDelta(scores, { strength: 2, dexterity: -1 })).toEqual({ strength: 17, dexterity: 13 });
    expect(capIssues({ ...scores, charisma: 19 }, { charisma: 2 }, [{ ability: "charisma", max: 20 }, { ability: "charisma", max: 20 }]).map((i) => i.code)).toEqual(["ABILITY_SCORE_CAP"]);
    expect(capIssues({ ...scores, charisma: 19 }, { charisma: 2 }, [{ ability: "charisma", max: 30 }, { ability: "charisma", max: 30 }])).toEqual([]);
    expect(capIssues({ ...scores, strength: 22 }, { dexterity: 1 }, [{ ability: "strength", max: 20 }, { ability: "dexterity", max: 20 }])).toEqual([]);
  });
});

describe("capIssues: cap comes from the picks added in this save", () => {
  const asi = { ability: "strength" as const, max: 20 };

  const boon = { ability: "strength" as const, max: 30 };

  it("epic boon allows 30 after earlier ASI picks capped at 20", () => {
    expect(capIssues({ ...scores, strength: 20 }, { strength: 1 }, [asi, asi, boon], [asi, asi])).toEqual([]);
  });

  it("another ASI over 20 is still rejected", () => {
    expect(capIssues({ ...scores, strength: 20 }, { strength: 1 }, [asi, asi, asi], [asi, asi]).map((i) => i.code)).toEqual(["ABILITY_SCORE_CAP"]);
  });
});
