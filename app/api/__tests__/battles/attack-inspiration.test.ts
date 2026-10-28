import { describe, expect, it } from "vitest";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const base = createMockParticipant();

const sword: BattleAttack = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

const bow: BattleAttack = { ...sword, id: "b", name: "Лук", type: AttackType.RANGED, maxTargets: 2 };

const hero = (inspiration: boolean, maxTargets = 1, attacks = [sword]): BattleParticipant => ({
  ...base,
  basicInfo: { ...base.basicInfo, id: "hero", controlledBy: "user-1" },
  combatStats: { ...base.combatStats, maxTargets },
  battleData: { ...base.battleData, attacks, inspiration },
});

const goblin = (id: string) =>
  createMockParticipant({ basicInfo: { ...base.basicInfo, id, side: ParticipantSide.ENEMY, controlledBy: "dm" }, combatStats: { ...base.combatStats, maxHp: 100, currentHp: 100 } });

const RULES = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration: true } };

const ctx = (h: BattleParticipant, rules = RULES, foes = [goblin("gob")]) =>
  ({
    scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, startedAt: null, completedAt: null },
    participants: [h, ...foes],
    pending: [],
    meta: { map: null, rules },
    userId: "user-1",
    isDM: false,
  }) as unknown as BattleMutationContext;

const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "s", d20Roll: 2, advantageRoll: 19, damageRolls: [4], ...over });

const failure = (run: Promise<unknown>) => run.then(() => undefined, (e: { code?: string; message?: string }) => ({ code: e.code, message: e.message }));

const advantageNotes = (events: unknown) => (JSON.stringify(events).match(/перевага/g) ?? []).length;

describe("attack with inspiration", () => {
  it("advantage from inspiration; the flag is spent", async () => {
    const out = await attackMutation(ctx(hero(true)), body({ useInspiration: true }));

    const self = out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

    expect(advantageNotes(out.events)).toBeGreaterThan(0);
    expect(self.battleData.inspiration).toBe(false);
  });

  it("without useInspiration the flag stays and no advantage", async () => {
    const out = await attackMutation(ctx(hero(true)), body());

    expect(advantageNotes(out.events)).toBe(0);
    expect((out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant).battleData.inspiration).toBe(true);
  });

  it("no inspiration or rule off → 422, nothing happens", async () => {
    expect(await failure(attackMutation(ctx(hero(false)), body({ useInspiration: true })))).toEqual({ code: "action_rejected", message: API_ERRORS.NO_INSPIRATION });
    expect(await failure(attackMutation(ctx(hero(true), DEFAULT_RULES), body({ useInspiration: true })))).toEqual({ code: "action_rejected", message: API_ERRORS.NO_INSPIRATION });
  });

  it("multi-target: only the first strike gets advantage", async () => {
    const out = await attackMutation(
      ctx(hero(true, 2, [bow]), RULES, [goblin("gob"), goblin("gob2")]),
      attackBodySchema.parse({ attackerId: "hero", targetIds: ["gob", "gob2"], attackId: "b", attackRolls: [2, 2], secondRolls: [19, 19], damageRolls: [4], useInspiration: true }),
    );

    expect(advantageNotes(out.events)).toBe(1);
  });
});
