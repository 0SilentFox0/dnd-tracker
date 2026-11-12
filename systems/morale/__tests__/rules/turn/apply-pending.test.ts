import { describe, expect, it } from "vitest";

import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { applyPendingMoraleCheck } from "@/systems/morale/rules/turn/apply-pending";

const p = createMockParticipant();

const payload = (shouldSkipTurn: boolean) => ({
  participantId: p.basicInfo.id,
  d10Roll: 10,
  moraleResult: { shouldSkipTurn, hasExtraTurn: false, message: "", moralePositive: false },
});

const check = (participants: Parameters<typeof applyPendingMoraleCheck>[0]["participants"], pending: ReturnType<typeof payload>, rng?: () => number) =>
  applyPendingMoraleCheck({ participants, payload: pending, scene: { round: 1, id: "b1", eventSeq: 0 }, rng, rules: DEFAULT_RULES, run: runAbilities });

describe("applyPendingMoraleCheck", () => {
  it("паніка: до власного наступного ходу учасник не відповідає на удари", () => {
    expect(check([p], payload(true), seq(0.5)).updatedInitiativeOrder[0].actionFlags.hasUsedReaction).toBe(true);
    expect(check([p], payload(false), seq(0.5)).updatedInitiativeOrder[0].actionFlags.hasUsedReaction).toBe(false);
  });

  it("у лог іде ефективна мораль з тимчасовим бонусом", () => {
    const boosted = {
      ...p,
      combatStats: { ...p.combatStats, morale: 0 },
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "m", name: "Клич", type: "buff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], abilityEffects: [{ kind: "modifyStat" as const, stat: "morale" as const, flat: 1 }] }],
      },
    };

    const { moraleLogEntry } = check([boosted], payload(false), seq(0.5));

    expect(moraleLogEntry.actionDetails?.morale).toBe(1);
  });

  it("у лог пишеться d10Roll без diceRolls (кубик грає при зміні pending)", () => {
    const { moraleLogEntry } = check([p], payload(false), seq(0.5));

    expect(moraleLogEntry.actionDetails?.d10Roll).toBe(10);
    expect(moraleLogEntry.actionDetails?.diceRolls).toBeUndefined();
    expect(check([], payload(false)).moraleLogEntry.actionDetails?.diceRolls).toBeUndefined();
  });

  it("у польоті додатковий хід за мораль не видається", () => {
    const flying = { ...p, battleData: { ...p.battleData, airborne: { since: 1, percent: 200, name: "Пікірування" } } };

    const extra = { ...payload(false), moraleResult: { ...payload(false).moraleResult, hasExtraTurn: true } };

    expect(check([flying], extra, seq(0.5)).updatedInitiativeOrder[0].actionFlags.hasExtraTurn).toBe(false);
    expect(check([p], extra, seq(0.5)).updatedInitiativeOrder[0].actionFlags.hasExtraTurn).toBe(true);
  });
});
