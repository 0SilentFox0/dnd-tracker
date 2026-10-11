import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { downedHeroes } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const base = createMockParticipant();

function make(id: string, info: Partial<BattleParticipant["basicInfo"]>, stats: Partial<BattleParticipant["combatStats"]> = {}) {
  return createMockParticipant({ basicInfo: { ...base.basicInfo, id, ...info }, combatStats: { ...base.combatStats, ...stats } });
}

describe("downedHeroes", () => {
  it("лише полеглі герої-союзники", () => {
    const list = [
      make("alive", { side: "ally", sourceType: "character" }),
      make("dead", { side: "ally", sourceType: "character" }, { currentHp: 0, status: "dead" }),
      make("ko", { side: "ally", sourceType: "character" }, { currentHp: 0, status: "unconscious" }),
      make("unit", { side: "ally", sourceType: "unit" }, { currentHp: 0, status: "dead" }),
      make("enemy", { side: "enemy", sourceType: "character" }, { currentHp: 0, status: "dead" }),
    ];

    expect(downedHeroes(list).map((p) => p.basicInfo.id)).toEqual(["dead", "ko"]);
  });
});
