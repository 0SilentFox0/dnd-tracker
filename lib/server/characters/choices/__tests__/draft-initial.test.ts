import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { refs, scores } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const humanRefs = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => humanRefs.value) }));

import { draftEditInitial } from "../draft-initial";

const row = { campaignId: "c1", race: "Human", feats: [], classes: [], raceChoices: { asi: [{ id: "strength" }, { id: "strength" }] }, ...scores };

describe("draftEditInitial", () => {
  it("shows base scores (stored minus the ASI delta) with the stored picks", async () => {
    humanRefs.value = { ...refs, race: { id: "r", name: "Human", choices: [{ id: "asi", label: "ASI", level: 1, count: 1, kind: "abilityScore", points: 2, max: 20 }] } };

    const result = await draftEditInitial({ ...row, strength: 17 }, DEFAULT_RULES);

    expect(result.scores.strength).toBe(15);
    expect(result.choices?.raceChoices).toEqual({ asi: [{ id: "strength" }, { id: "strength" }] });
  });

  it("without picks nothing is loaded and scores are untouched", async () => {
    const result = await draftEditInitial({ ...row, raceChoices: {} }, DEFAULT_RULES);

    expect(result).toEqual({ choices: undefined, scores });
  });
});
