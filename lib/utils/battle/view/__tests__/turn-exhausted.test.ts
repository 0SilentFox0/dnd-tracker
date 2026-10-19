import { describe, expect, it } from "vitest";

import { createMockParticipant } from "../../__tests__/fixtures/mock-participant";
import { turnExhausted } from "../turn-exhausted";

const used = () => {
  const p = createMockParticipant();

  return { ...p, actionFlags: { ...p.actionFlags, hasUsedAction: true, hasUsedBonusAction: true } };
};

describe("turnExhausted", () => {
  it("дію витрачено, нічого не лишилось — вичерпано", () => {
    expect(turnExhausted(used(), [])).toBe(true);
  });

  it("дію не витрачено — не вичерпано", () => {
    expect(turnExhausted(createMockParticipant(), [])).toBe(false);
  });

  it("можливе повернення на старт — не вичерпано, без нього знову вичерпано", () => {
    expect(turnExhausted(used(), [], true)).toBe(false);
    expect(turnExhausted(used(), [], false)).toBe(true);
  });
});
