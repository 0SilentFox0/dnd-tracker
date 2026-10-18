import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { dropBattleFlag, isReserved, reserveOf, summonsOf, toReserve } from "@/lib/utils/battle/participant/reserve";

const base = createMockParticipant();

const wolf = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "wolf" } });

const imp = toReserve(createMockParticipant({ basicInfo: { ...base.basicInfo, id: "imp" } }));

describe("reserve helpers", () => {
  it("розділяє pending на резерв і саммонів", () => {
    expect(isReserved(imp)).toBe(true);
    expect(reserveOf([wolf, imp]).map((p) => p.basicInfo.id)).toEqual(["imp"]);
    expect(summonsOf([wolf, imp]).map((p) => p.basicInfo.id)).toEqual(["wolf"]);
  });

  it("dropBattleFlag прибирає ключ, а не ставить false", () => {
    const out = dropBattleFlag(imp, "reserved");

    expect("reserved" in out.battleData).toBe(false);
    expect(isReserved(out)).toBe(false);
  });
});
