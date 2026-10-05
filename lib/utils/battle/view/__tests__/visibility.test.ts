import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { canSeeExactStats, hiddenTargetSteps, sanitizeLogEntry } from "@/lib/utils/battle/view";
import type { BattleAction, DamageStep } from "@/types/battle";

const side = (s: ParticipantSide) => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, side: s } };
};

const player = { userId: "u", isDM: false, canSeeEnemyHp: false };

describe("видимість", () => {
  it("союзника видно точно, ворога — ні, DM і seeEnemyHp бачать усе", () => {
    expect(canSeeExactStats(side(ParticipantSide.ALLY), player)).toBe(true);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), player)).toBe(false);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), { ...player, isDM: true })).toBe(true);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), { ...player, canSeeEnemyHp: true })).toBe(true);
  });

  it("журнал для гравця без targetAC і damageBreakdown; DM бачить усе", () => {
    const e = { actionDetails: { targetAC: 15, damageBreakdown: "x", totalAttackValue: 19 } } as unknown as BattleAction;

    expect(sanitizeLogEntry(e, player).actionDetails).toEqual({ totalAttackValue: 19 });
    expect(sanitizeLogEntry(e, { ...player, isDM: true })).toBe(e);
  });

  it("кроки цілі ховаються, доки не помічені в журналі", () => {
    const steps: DamageStep[] = [
      { label: "Кубики", side: "attacker", kind: "dice", value: 6, after: 6 },
      { label: "Експертний захист", side: "target", kind: "percent", value: -20, after: 4 },
    ];

    expect(hiddenTargetSteps(steps, "t", [], false).map((s) => s.label)).toEqual(["Кубики"]);

    const seen = [{ targets: [{ participantId: "t" }], actionDetails: { damageSteps: { t: [steps[1]] } } }] as unknown as BattleAction[];

    expect(hiddenTargetSteps(steps, "t", seen, false)).toHaveLength(2);
    expect(hiddenTargetSteps(steps, "t", [], true)).toHaveLength(2);
  });
});
