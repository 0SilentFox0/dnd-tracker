import { describe, expect, it } from "vitest";

import { initialTurnFlow, moraleOutcome, turnFlow, type TurnFlowAction, type TurnFlowState } from "@/lib/utils/battle/flows";

const run = (...a: TurnFlowAction[]) => a.reduce<TurnFlowState>(turnFlow, initialTurnFlow);

describe("turnFlow", () => {
  it("BEGIN із моралью → morale; без → acting", () => {
    expect(run({ type: "BEGIN", needsMorale: true }).phase).toBe("morale");
    expect(run({ type: "BEGIN", needsMorale: false }).phase).toBe("acting");
  });

  it("паніка — хід закінчується; інші результати — до дій", () => {
    expect(run({ type: "BEGIN", needsMorale: true }, { type: "MORALE_RESULT", result: "skip" })).toMatchObject({ phase: "ended", moraleResult: "skip" });
    expect(run({ type: "BEGIN", needsMorale: true }, { type: "MORALE_RESULT", result: "extra" })).toMatchObject({ phase: "acting", moraleResult: "extra" });
  });

  it("дії вичерпано → відлік; «Залишитись» → дії, і повторне вичерпання відлік не запускає", () => {
    const c = run({ type: "BEGIN", needsMorale: false }, { type: "EXHAUSTED" });

    expect(c.phase).toBe("countdown");

    const stayed = turnFlow(c, { type: "STAY" });

    expect(stayed).toMatchObject({ phase: "acting", stayed: true });
    expect(turnFlow(stayed, { type: "EXHAUSTED" }).phase).toBe("acting");
  });

  it("EXHAUSTED поза діями ігнорується; END завжди закінчує", () => {
    expect(run({ type: "EXHAUSTED" }).phase).toBe("waiting");
    expect(run({ type: "BEGIN", needsMorale: false }, { type: "END" }).phase).toBe("ended");
  });
});

describe("turnFlow — RECOVER", () => {
  it("із ended повертає до дій без автовідліку; з інших фаз нічого не робить", () => {
    const ended = run({ type: "BEGIN", needsMorale: false }, { type: "END" });

    expect(turnFlow(ended, { type: "RECOVER" })).toMatchObject({ phase: "acting", stayed: true });
    expect(turnFlow(initialTurnFlow, { type: "RECOVER" })).toBe(initialTurnFlow);
  });
});

describe("moraleOutcome", () => {
  it("extra / skip / none", () => {
    expect(moraleOutcome({ hasExtraTurn: true, shouldSkipTurn: false })).toBe("extra");
    expect(moraleOutcome({ hasExtraTurn: false, shouldSkipTurn: true })).toBe("skip");
    expect(moraleOutcome({ hasExtraTurn: false, shouldSkipTurn: false })).toBe("none");
    expect(moraleOutcome(null)).toBe("none");
  });
});
