import { describe, expect, it } from "vitest";

import { findFlags, findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

describe("findFlagsMany", () => {
  const owner = () =>
    grantPassive(createMockParticipant(), [
      { kind: "flag", flag: "piercingShot" },
      { kind: "flag", flag: "multiTargetFalloff", percent: 50 },
      { kind: "flag", flag: "multiTargetFalloff", percent: 25 },
    ]);

  it("groups requested flags in one pass, empty when absent", () => {
    const p = owner();

    const r = findFlagsMany([p], p.basicInfo.id, ["piercingShot", "multiTargetFalloff", "attackHitsAllEnemies"]);

    expect(r.piercingShot).toHaveLength(1);
    expect(r.multiTargetFalloff.map((f) => f.percent)).toEqual([50, 25]);
    expect(r.attackHitsAllEnemies).toEqual([]);
  });

  it("matches what findFlags returns per flag", () => {
    const p = owner();

    expect(findFlagsMany([p], p.basicInfo.id, ["multiTargetFalloff"]).multiTargetFalloff).toEqual(findFlags([p], p.basicInfo.id, "multiTargetFalloff"));
  });
});
