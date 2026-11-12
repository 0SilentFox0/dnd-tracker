import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, pendingChoice: null, startedAt: null, completedAt: null,
};

const base = createMockParticipant();

const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } });

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } });

const homm: Ruleset = DEFAULT_RULES;

const bare: Ruleset = { ...DEFAULT_RULES, system: { key: "dnd5e" } };

const stored = (participantId: string, moraleResult: { shouldSkipTurn: boolean; hasExtraTurn: boolean; message: string; moralePositive: boolean }) => ({ participantId, d10Roll: 10, moraleResult });

const advance = (rules: Ruleset, pendingMoraleCheck: unknown) => advanceTurn({ rules, participants: [hero, goblin], pending: [], scene: { ...scene, pendingMoraleCheck } });

describe("pendingMoraleCheck stored before Ch8 (D9)", () => {
  it("homm: a positive result marks the hero for an extra turn and logs the roll", () => {
    const out = advance(homm, stored("hero", { shouldSkipTurn: false, hasExtraTurn: true, message: "Додатковий хід", moralePositive: true }));

    expect(out.participants[0].actionFlags).toMatchObject({ hasExtraTurn: true });
    expect(out.scene).toMatchObject({ turnIndex: 1, round: 1, pendingMoraleCheck: null });
    expect(out.actions[0]).toMatchObject({ actionType: "ability", actionDetails: { d10Roll: 10 } });
  });

  it("homm: a negative result skips the turn, blocks reactions and logs morale_skip", () => {
    const out = advance(homm, stored("hero", { shouldSkipTurn: true, hasExtraTurn: false, message: "Пропуск", moralePositive: false }));

    expect(out.participants[0].actionFlags).toMatchObject({ hasUsedReaction: true, hasExtraTurn: false });
    expect(out.scene.pendingMoraleCheck).toBeNull();
    expect(out.actions[0]).toMatchObject({ actionType: "morale_skip", actorId: "hero", actionDetails: { d10Roll: 10 } });
  });

  it("homm: a payload for a missing participant logs battleLog.morale.notFound and changes nobody", () => {
    const out = advance(homm, stored("ghost", { shouldSkipTurn: true, hasExtraTurn: false, message: "", moralePositive: false }));

    expect(out.actions[0]).toMatchObject({ actionType: "ability", actorName: "?", actionDetails: { d10Roll: 10, morale: 0 } });
    expect(JSON.stringify(out.actions[0])).toContain("battleLog.morale.notFound");
    expect(out.participants.map((p) => p.actionFlags)).toEqual([hero.actionFlags, goblin.actionFlags]);
  });

  it("dnd5e without the module: the payload is ignored and the field is cleared (D9)", () => {
    const out = advance(bare, stored("hero", { shouldSkipTurn: true, hasExtraTurn: false, message: "Пропуск", moralePositive: false }));

    expect(out.scene.pendingMoraleCheck).toBeNull();
    expect(out.participants[0].actionFlags).toEqual(hero.actionFlags);
    expect(out.actions.some((a) => a.actionType === "morale_skip" || a.actionDetails?.d10Roll !== undefined)).toBe(false);
  });
});
