import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { moraleTriggerRolls } from "@/lib/utils/battle/morale/check";

const withMorale = (morale: number) => {
  const p = createMockParticipant();

  return { ...p, combatStats: { ...p.combatStats, morale } };
};

describe("moraleTriggerRolls", () => {
  it("позитивна мораль — значення для додаткового ходу, негативна — для пропуску, нуль — нічого", () => {
    expect(moraleTriggerRolls(withMorale(2))).toEqual({ kind: "extra", rolls: [9, 10] });
    expect(moraleTriggerRolls(withMorale(-2))).toEqual({ kind: "skip", rolls: [1, 2] });
    expect(moraleTriggerRolls(withMorale(0))).toEqual({ kind: null, rolls: [] });
  });
});
