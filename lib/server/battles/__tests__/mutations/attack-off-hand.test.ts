import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema, attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const base = createMockParticipant();

const main: BattleAttack = { id: "d", name: "Кинджал", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d4", damageType: "piercing", traits: ["light"] };

const off: BattleAttack = { ...main, id: "d:off", name: "Кинджал (друга рука)", hand: "off" };

const hero = (fiveE: boolean): BattleParticipant => ({
  ...base,
  basicInfo: { ...base.basicInfo, id: "hero", controlledBy: "user-1" },
  abilities: { ...base.abilities, ...(fiveE ? { damageModel: "5e" as const } : {}) },
  actionFlags: { ...base.actionFlags, hasUsedAction: true },
  battleData: { ...base.battleData, attacks: [main, off], attackedWithLight: true, attacksLeft: 0 },
});

const goblin = createMockParticipant({
  basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" },
  combatStats: { ...base.combatStats, maxHp: 100, currentHp: 100 },
});

const ctx = (h: BattleParticipant) =>
  ({
    scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
    participants: [h, goblin],
    pending: [],
    meta: { map: null },
    userId: "user-1",
    isDM: false,
  }) as unknown as BattleMutationContext;

const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "d:off", offHand: true, d20Roll: 15, damageRolls: [3], ...over });

const failure = (run: Promise<unknown>) => run.then(() => undefined, (e: { code?: string; message?: string }) => ({ code: e.code, message: e.message }));

describe("off-hand attack mutation", () => {
  it("5e hero: bonus action spent, main action untouched", async () => {
    const out = await attackMutation(ctx(hero(true)), body());

    const self = out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

    expect(out.events[0].type).toBe("attack");
    expect(self.actionFlags).toMatchObject({ hasUsedAction: true, hasUsedBonusAction: true });
    expect(self.battleData.attacksLeft).toBe(0);
  });

  it("HOMM hero with offHand: 422 rule error", async () => {
    expect(await failure(attackMutation(ctx(hero(false)), body()))).toEqual({ code: "action_rejected", message: API_ERRORS.OFF_HAND_NOT_ALLOWED });
  });

  it("off attack without offHand: rejected", async () => {
    const fresh = hero(true);

    fresh.actionFlags.hasUsedAction = false;

    expect(await failure(attackMutation(ctx(fresh), body({ offHand: undefined })))).toMatchObject({ message: API_ERRORS.OFF_HAND_NEEDS_ATTACK });
  });
});
