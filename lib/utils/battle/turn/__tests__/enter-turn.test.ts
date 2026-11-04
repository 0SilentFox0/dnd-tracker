import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { enterChangedTurn } from "@/lib/utils/battle/turn/enter-turn";

const spent = (id: string) => {
  const p = makeParticipant({ id });

  return { ...p, actionFlags: { ...p.actionFlags, hasUsedAction: true, hasUsedBonusAction: true } };
};

describe("enterChangedTurn", () => {
  it("gives the actor who lands on the current index a fresh turn", () => {
    const before = [makeParticipant({ id: "a" }), spent("b")];

    const after = [before[1], before[0]];

    const res = enterChangedTurn({ before, after, fromIndex: 0, toIndex: 0, round: 2, rng: () => 0.99 });

    expect(res.turnIndex).toBe(0);
    expect(res.participants[0].basicInfo.id).toBe("b");
    expect(res.participants[0].actionFlags.hasUsedAction).toBe(false);
    expect(res.participants[0].actionFlags.hasUsedBonusAction).toBe(false);
  });

  it("changes nothing when the same actor stays current", () => {
    const before = [spent("a"), makeParticipant({ id: "b" })];

    const res = enterChangedTurn({ before, after: before, fromIndex: 0, toIndex: 0, round: 2 });

    expect(res.participants[0].actionFlags.hasUsedAction).toBe(true);
  });
});
