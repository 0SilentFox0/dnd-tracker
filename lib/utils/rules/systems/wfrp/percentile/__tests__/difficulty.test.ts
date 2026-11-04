import { describe, expect, it } from "vitest";

import { DIFFICULTY_KEYS, DIFFICULTY_MODIFIER } from "../difficulty";

describe("difficulty table", () => {
  it("lists seven keys in order", () => {
    expect(DIFFICULTY_KEYS).toEqual(["veryEasy", "easy", "average", "challenging", "difficult", "hard", "veryHard"]);
  });

  it("has a target modifier for every key", () => {
    expect(DIFFICULTY_MODIFIER).toEqual({ veryEasy: 60, easy: 40, average: 20, challenging: 0, difficult: -10, hard: -20, veryHard: -30 });
  });
});
