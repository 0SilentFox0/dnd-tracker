import { describe, expect, it, vi } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { BattleAccess, guardBattleContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { LoadedBattle } from "@/lib/utils/battle/store";
import * as victory from "@/lib/utils/battle/turn/victory";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const loaded = {
  scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 3, eventSeq: 4, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, map: null, createdAt: new Date("2026-01-01") },
  participants: [createMockParticipant()],
  pending: [],
  isDM: true,
  isMember: true,
} as unknown as LoadedBattle & { isMember: boolean };

describe("guardBattleContext", () => {
  it("checkVictoryConditions і dryRun викликаються по одному разу", () => {
    const spy = vi.spyOn(victory, "checkVictoryConditions");

    const dryRun = vi.fn(() => false);

    const result = guardBattleContext("u1", loaded, {}, undefined, { params: { id: "c1", battleId: "b1" }, access: BattleAccess.MEMBER, dryRun, mutate: () => ({ participants: [], pending: [], events: [] }) });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(dryRun).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ isDryRun: false, awaiting: null, ctx: { userId: "u1" } });

    spy.mockRestore();
  });
});
