import { describe, expect, it } from "vitest";

import { canConsumeIntent, isIntentStale } from "../attack-intent";

const intent = { targetId: "e", actorId: "h1", round: 2, turnIndex: 3 };

const turn = { heroId: "h1", round: 2, turnIndex: 3, phase: "acting", actionUsed: false, skipped: false };

describe("намір атаки з карти", () => {
  it("споживається тим самим героєм у тому самому ході у фазі дії", () => {
    expect(canConsumeIntent(intent, turn)).toBe(true);
  });

  it("інший герой, інший хід чи раунд — не споживається", () => {
    expect(canConsumeIntent(intent, { ...turn, heroId: "h2" })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, turnIndex: 4 })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, round: 3 })).toBe(false);
  });

  it("не у фазі дії, дія використана або хід пропущено — не споживається", () => {
    expect(canConsumeIntent(intent, { ...turn, phase: "morale" })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, actionUsed: true })).toBe(false);
    expect(canConsumeIntent(intent, { ...turn, skipped: true })).toBe(false);
  });

  it("застарілий при зміні ходу чи раунду", () => {
    expect(isIntentStale(intent, { round: 2, turnIndex: 3 })).toBe(false);
    expect(isIntentStale(intent, { round: 2, turnIndex: 4 })).toBe(true);
    expect(isIntentStale(intent, { round: 3, turnIndex: 3 })).toBe(true);
  });
});
