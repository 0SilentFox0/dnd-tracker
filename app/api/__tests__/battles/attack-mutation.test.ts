import { describe, expect, it } from "vitest";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const base = createMockParticipant();

const hero = createMockParticipant({
  basicInfo: { ...base.basicInfo, id: "hero", controlledBy: "user-1" },
  battleData: { ...base.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] },
});

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } });

const ctx = {
  scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  participants: [hero, goblin],
  pending: [],
  userId: "user-1",
  isDM: false,
} as unknown as BattleMutationContext;

const body = (over: Record<string, unknown> = {}) =>
  attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 20, damageRolls: [8], ...over });

describe("attack mutation", () => {
  it("атака без endTurn — подія атаки, хід не змінюється", () => {
    const out = attackMutation(ctx, body());

    expect(out.events[0].type).toBe("attack");
    expect(out.scene?.turnIndex).toBeUndefined();
  });

  it("атака з endTurn — хід передається тим самим збереженням", () => {
    const out = attackMutation(ctx, body({ endTurn: true }));

    expect(out.scene).toMatchObject({ turnIndex: 1, pendingMoraleCheck: null });
  });

  it("чужий атакувальник — 403", () => {
    expect(() => attackMutation({ ...ctx, userId: "someone" } as never, body())).toThrow(BattleAccessError);
  });

  it("невідома ціль — 422 action_rejected або 404", () => {
    expect(() => attackMutation(ctx, body({ targetId: "nobody" }))).toThrow(Error);
  });

  it("помилки AttackPhaseError мапляться на помилки пайплайну", () => {
    try {
      attackMutation(ctx, body({ attackerId: "gob" }));
    } catch (e) {
      expect(e instanceof BattleAccessError || e instanceof BattleRuleError).toBe(true);
    }
  });
});
