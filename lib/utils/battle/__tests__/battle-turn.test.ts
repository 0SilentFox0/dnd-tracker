import { describe, expect, it } from "vitest";

import { processStartOfTurn } from "@/lib/utils/battle/battle-turn";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";
import type { ActiveEffect } from "@/types/battle";

const debuff = (type: string, duration: number): ActiveEffect => ({
  id: `e-${type}`,
  name: type,
  type: "debuff",
  duration,
  appliedAt: { round: 1, timestamp: new Date() },
  effects: [{ type, value: 0 }],
});

describe("processStartOfTurn", () => {
  it("дебаф на 1 раунд діє в цей хід і лише потім спливає", () => {
    const base = createMockParticipant();

    const p = createMockParticipant({
      battleData: { ...base.battleData, activeEffects: [debuff("no_bonus_action", 1), debuff("no_reaction", 1)] },
    });

    const out = processStartOfTurn(p, 2, [p]);

    expect(out.participant.actionFlags.hasUsedBonusAction).toBe(true);
    expect(out.participant.actionFlags.hasUsedReaction).toBe(true);
    expect(out.expiredEffects).toEqual(expect.arrayContaining(["no_bonus_action", "no_reaction"]));
  });

  it("без обмежень — дії доступні", () => {
    const p = createMockParticipant();

    const out = processStartOfTurn(p, 2, [p]);

    expect(out.participant.actionFlags).toMatchObject({ hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false });
  });
});
