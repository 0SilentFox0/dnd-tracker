import { describe, expect, it } from "vitest";

import { buildSpellResultFx, hpTotals } from "../spell-result";

describe("hpTotals", () => {
  it("сумує зміни по учаснику й відкидає нульові", () => {
    const out = hpTotals([
      { participantId: "a", participantName: "Гоблін", change: 4 },
      { participantId: "a", participantName: "Гоблін", change: 3 },
      { participantId: "b", participantName: "Орк", change: 5 },
      { participantId: "b", participantName: "Орк", change: -5 },
    ]);

    expect(out).toEqual([{ name: "Гоблін", change: 7 }]);
  });
});

describe("buildSpellResultFx", () => {
  it("передає назву й підсумок цілей", () => {
    expect(buildSpellResultFx("Вогняна куля", [], 2)).toEqual({ kind: "spell", spellName: "Вогняна куля", changes: [], targetCount: 2 });
  });
});
