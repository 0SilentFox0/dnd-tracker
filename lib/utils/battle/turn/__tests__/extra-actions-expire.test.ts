import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { SAVE_SUCCESS_EFFECTS } from "@/lib/constants/save-critical-effects";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyCriticalEffect } from "@/lib/utils/battle/attack/critical";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import type { BattleParticipant } from "@/types/battle";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null,
};

const withPool = (p: BattleParticipant, pending: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, pendingExtraActions: pending } });

const hero = (pending: number, abilities: ReturnType<typeof resolved>[] = []) => withPool(makeParticipant({ id: "hero", abilities }), pending);

const goblin = makeParticipant({ id: "gob", side: ParticipantSide.ENEMY });

const pool = (ps: BattleParticipant[], id = "hero") => ps.find((p) => p.basicInfo.id === id)?.battleData.pendingExtraActions ?? 0;

const twoActionsPerTurn = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "actionsPerTurn", flat: 1 }] });

describe("unused extra actions expire at the end of the turn", () => {
  it("the ending participant's pool is emptied", () => {
    const out = advanceTurn({ participants: [hero(2), goblin], pending: [], scene });

    expect(pool(out.participants)).toBe(0);
  });

  it("a participant who went down on its own turn loses the pool too", () => {
    const down = { ...hero(1), combatStats: { ...hero(1).combatStats, currentHp: 0, status: "unconscious" as const } };

    const out = advanceTurn({ participants: [down, goblin, makeParticipant({ id: "ally" })], pending: [], scene });

    expect(pool(out.participants)).toBe(0);
  });

  it("other participants' pools are untouched when someone else's turn ends", () => {
    const out = advanceTurn({ participants: [hero(0), makeParticipant({ id: "ally" }), withPool(goblin, 1)], pending: [], scene });

    expect(out.scene.turnIndex).toBe(1);
    expect(pool(out.participants, "gob")).toBe(1);
  });

  it("a grant received outside the own turn does not carry into it", () => {
    const h = hero(1);

    expect(processStartOfTurn(h, 2, [h, goblin]).participant.battleData.pendingExtraActions ?? 0).toBe(0);
  });

  it("actionsPerTurn still refills the pool at the turn start", () => {
    const h = hero(0, [twoActionsPerTurn]);

    expect(processStartOfTurn(h, 2, [h, goblin]).participant.battleData.pendingExtraActions).toBe(1);
  });

  it("a morale extra turn gets the actionsPerTurn pool of a normal turn", () => {
    const marked = { ...hero(0, [twoActionsPerTurn]), actionFlags: { ...hero(0).actionFlags, hasUsedAction: true, hasExtraTurn: true } };

    const out = advanceTurn({ participants: [marked, goblin], pending: [], scene: { ...scene, turnIndex: 1 } });

    expect(out.scene.turnIndex).toBe(0);
    expect(pool(out.participants)).toBe(1);
  });

  it.each(["extra_action"] as const)("%s зі спаска: бонусна дія доживає до власного ходу цілі й згасає після нього", (type) => {
    const crit = SAVE_SUCCESS_EFFECTS.find((e) => e.effect.type === type)!;

    const target = applyCriticalEffect(makeParticipant({ id: "gob", side: ParticipantSide.ENEMY }), crit, 1, { offTurn: true });

    const toTarget = advanceTurn({ participants: [hero(0), target], pending: [], scene });

    expect(pool(toTarget.participants, "gob")).toBe(1);

    const after = advanceTurn({ participants: toTarget.participants, pending: [], scene: { ...scene, ...toTarget.scene } });

    expect(pool(after.participants, "gob")).toBe(0);
    expect(after.participants.find((p) => p.basicInfo.id === "gob")?.battleData.activeEffects).toHaveLength(0);
  });
});
