import { describe, expect, it } from "vitest";

import { isUnmet, type RequirementCtx,requirementsOf } from "@/lib/utils/characters/choices/requirements";
import { featPrerequisiteMet } from "@/lib/utils/characters/choices/validate";
import type { ChoiceOption, FeatData } from "@/types/choices";

const scores = { strength: 10, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };

const ctx = (over: Partial<RequirementCtx> = {}): RequirementCtx => ({ totalLevel: 3, level: 3, scores, ...over });

const feat = (prerequisite: FeatData["prerequisite"]): FeatData => ({ id: "f", name: "F", icon: null, type: "general", prerequisite, repeatable: false, description: null, abilities: [], choices: [] });

const option = (over: Partial<ChoiceOption>): ChoiceOption => ({ id: "o", name: "O", abilities: [], ...over });

describe("requirementsOf", () => {
  it("feat level is checked against the total level", () => {
    expect(requirementsOf(feat({ level: 4 }), ctx())).toEqual([{ kind: "level", need: 4, have: 3, met: false }]);
  });

  it("ability requirement uses the best of the listed scores", () => {
    expect(requirementsOf(feat({ scores: { abilities: ["strength", "dexterity"], min: 13 } }), ctx())).toEqual([{ kind: "ability", abilities: ["strength", "dexterity"], need: 13, have: 14, met: true }]);
  });

  it("reports each unmet requirement separately", () => {
    const list = requirementsOf(feat({ level: 4, scores: { abilities: ["strength"], min: 13 } }), ctx({ totalLevel: 4 }));

    expect(list.map((r) => r.met)).toEqual([true, false]);
    expect(list.filter(isUnmet)).toHaveLength(1);
  });

  it("a missing score counts as 0", () => {
    const partial = { ...scores } as Partial<typeof scores>;

    delete partial.wisdom;

    expect(requirementsOf(feat({ scores: { abilities: ["wisdom"], min: 1 } }), ctx({ scores: partial as typeof scores }))).toEqual([{ kind: "ability", abilities: ["wisdom"], need: 1, have: 0, met: false }]);
  });

  it("manual and text lines are informational", () => {
    expect(requirementsOf(feat({ manualText: ["a", "b"], text: "t" }), ctx())).toEqual([
      { kind: "manual", text: "a", met: true },
      { kind: "manual", text: "b", met: true },
      { kind: "text", text: "t", met: true },
    ]);
  });

  it("an empty prerequisite gives nothing", () => {
    expect(requirementsOf(feat({}), ctx())).toEqual([]);
  });

  it("option minLevel is checked against the owner level", () => {
    expect(requirementsOf(option({ minLevel: 5 }), ctx())).toEqual([{ kind: "level", need: 5, have: 3, met: false }]);
  });

  it("option requires lists the not yet picked ids", () => {
    expect(requirementsOf(option({ requires: ["a", "b"] }), ctx({ picked: new Set(["a"]) }))).toEqual([{ kind: "option", missing: ["b"], met: false }]);
  });

  it("featPrerequisiteMet agrees with the requirements", () => {
    expect(featPrerequisiteMet(feat({ level: 4 }), { totalLevel: 3, scores })).toBe(false);
    expect(featPrerequisiteMet(feat({ level: 3, scores: { abilities: ["dexterity"], min: 14 } }), { totalLevel: 3, scores })).toBe(true);
  });
});
