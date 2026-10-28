import { describe, expect, it } from "vitest";

import { CHALLENGE_OPTIONS, CHALLENGE_RATINGS, challengeLabel, isChallengeRating, proficiencyForChallenge, xpForChallenge } from "@/lib/constants/challenge";

describe("CR tables", () => {
  it("34 значення: 0, дроби, 1–30", () => {
    expect(CHALLENGE_RATINGS).toHaveLength(34);
    expect(CHALLENGE_RATINGS.slice(0, 5)).toEqual([0, 0.125, 0.25, 0.5, 1]);
    expect(CHALLENGE_RATINGS.at(-1)).toBe(30);
  });

  it("XP за CR (SRD)", () => {
    const expected: Array<[number, number]> = [
      [0, 10], [0.125, 25], [0.25, 50], [0.5, 100], [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800], [6, 2300], [7, 2900], [8, 3900], [9, 5000], [10, 5900],
      [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000], [16, 15000], [17, 18000], [18, 20000], [19, 22000], [20, 25000],
      [21, 33000], [22, 41000], [23, 50000], [24, 62000], [25, 75000], [26, 90000], [27, 105000], [28, 120000], [29, 135000], [30, 155000],
    ];

    for (const [cr, xp] of expected) expect(xpForChallenge(cr)).toBe(xp);
    expect(xpForChallenge(0.3)).toBe(0);
  });

  it("майстерність за CR", () => {
    const expected: Array<[number, number]> = [[0, 2], [0.125, 2], [0.5, 2], [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6], [21, 7], [24, 7], [25, 8], [28, 8], [29, 9], [30, 9]];

    for (const [cr, prof] of expected) expect(proficiencyForChallenge(cr)).toBe(prof);
  });

  it("підписи й валідація", () => {
    expect([0, 0.125, 0.25, 0.5, 7].map(challengeLabel)).toEqual(["0", "1/8", "1/4", "1/2", "7"]);
    expect(isChallengeRating(0.25)).toBe(true);
    expect(isChallengeRating(0.3)).toBe(false);
    expect(isChallengeRating(31)).toBe(false);
    expect(CHALLENGE_OPTIONS[1]).toEqual({ value: "0.125", label: "1/8" });
  });
});
