import { describe, expect, it } from "vitest";

import type { CriticalEffect, CriticalEffectType } from "@/lib/constants/critical-effects";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { applyCriticalEffect } from "@/lib/utils/battle/attack";
import { processStartOfRound, processStartOfTurn } from "@/lib/utils/battle/battle-turn";
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

describe("critical effects at the start of turn", () => {
  const crit = (type: CriticalEffectType): CriticalEffect => ({ id: 1, name: "Е", description: "о", type: "success", flavor: [], effect: { type, duration: type === "lose_action" ? 1 : 2 } });

  const hit = (type: CriticalEffectType) => applyCriticalEffect(createMockParticipant(), crit(type), 1);

  it("lose_action takes the action on the next turn", () => {
    const p = hit("lose_action");

    expect(processStartOfTurn(p, 2, [p], () => 0.5).participant.actionFlags.hasUsedAction).toBe(true);
  });

  it("lose_reaction is spent at once and restored next turn", () => {
    const p = hit("lose_reaction");

    expect(p.actionFlags.hasUsedReaction).toBe(true);
    expect(processStartOfTurn(p, 2, [p]).participant.actionFlags.hasUsedReaction).toBe(false);
  });

  it("block_bonus_action takes the bonus action on the next turn", () => {
    const p = hit("block_bonus_action");

    expect(processStartOfTurn(p, 2, [p]).participant.actionFlags.hasUsedBonusAction).toBe(true);
  });
});

describe("processStartOfRound", () => {
  it("сортує за ініціативою, далі базовою ініціативою, далі спритністю", () => {
    const base = createMockParticipant();

    const make = (id: string, baseInitiative: number, dexterity: number) =>
      createMockParticipant({ basicInfo: { ...base.basicInfo, id }, abilities: { ...base.abilities, initiative: baseInitiative, baseInitiative, dexterity } });

    const out = processStartOfRound([make("a", 10, 12), make("b", 15, 10), make("c", 10, 16)], 2);

    expect(out.updatedInitiativeOrder.map((p) => p.basicInfo.id)).toEqual(["b", "c", "a"]);
  });
});
