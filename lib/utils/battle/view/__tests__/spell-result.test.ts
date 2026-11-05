import { describe, expect, it } from "vitest";

import { buildSpellResultFx, castDetailsOf, hpTotals } from "../spell-result";

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

describe("castDetailsOf", () => {
  const cast = { roll: 20, target: 50, sl: 3, cn: 3, channelled: 0, armourSl: 0, doubles: false, outcome: "success" as const, overcastSteps: 0, miscast: null };

  const entry = (actionIndex: number, actorId: string, details: object) => ({ actionIndex, actorId, actionDetails: details }) as never;

  it("reads the caster's unseen entry", () => {
    const log = [entry(1, "c", { percentileCast: { ...cast, roll: 5 } }), entry(2, "c", { percentileCast: cast }), entry(3, "x", { percentileCast: { ...cast, roll: 9 } })];

    expect(castDetailsOf(log, new Set([1]), "c")).toEqual(cast);
    expect(castDetailsOf(log, new Set([1, 2]), "c")).toBeUndefined();
  });
});
