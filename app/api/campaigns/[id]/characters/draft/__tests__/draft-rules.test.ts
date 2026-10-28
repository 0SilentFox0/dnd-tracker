import { describe, expect, it } from "vitest";

import { draftRejection } from "../draft-rules";

import { API_ERRORS } from "@/lib/constants/api-errors";

const scores = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };

describe("draftRejection", () => {
  it("accepts a player without a character", () => {
    expect(draftRejection({ role: "player", existing: 0, method: "standard", scores })).toBeNull();
  });

  it("rejects DM, second character and invented scores", () => {
    expect(draftRejection({ role: "dm", existing: 0, method: "standard", scores })).toBe(API_ERRORS.DRAFT_PLAYERS_ONLY);
    expect(draftRejection({ role: "player", existing: 1, method: "standard", scores })).toBe(API_ERRORS.DRAFT_ALREADY_EXISTS);
    expect(draftRejection({ role: "player", existing: 0, method: "pointBuy", scores: { ...scores, strength: 18 } })).toBe(API_ERRORS.DRAFT_INVALID_SCORES);
  });
});
