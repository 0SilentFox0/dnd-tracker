import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { bonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { BattleAccessError } from "@/lib/utils/battle/store";

const rally = resolved({ id: "r", trigger: { event: "bonusAction" }, limits: { perBattle: 1 }, effects: [{ kind: "changeMorale", delta: 1, target: "eventTarget" }] });

const hero = participant("hero", { controlledBy: "user-1" }, {});

const heroWith = { ...hero, battleData: { ...hero.battleData, resolvedAbilities: [rally] } };

describe("bonusActionMutation", () => {
  it("виконує обране вміння, витрачає бонусну дію і ліміт", async () => {
    const r = await bonusActionMutation(context({ participants: [heroWith, goblin] }), { participantId: "hero", abilityKey: rally.key, targetParticipantId: "hero" });

    const h = r.participants.find((p) => p.basicInfo.id === "hero");

    if (!h) throw new Error("hero missing");

    expect(h.combatStats.morale).toBe(1);
    expect(h.actionFlags.hasUsedBonusAction).toBe(true);
    expect(h.battleData.abilityUsage?.[rally.key].battle).toBe(1);
    expect(r.events[0]).toMatchObject({ type: "ability", details: { actionDetails: { abilityKey: rally.key, skillName: rally.name } } });
  });

  it("ліміт вичерпано → ability_limit", async () => {
    const used = { ...heroWith, battleData: { ...heroWith.battleData, abilityUsage: { [rally.key]: { battle: 1, round: 1, turn: 1 } } } };

    await expect(bonusActionMutation(context({ participants: [used, goblin] }), { participantId: "hero", abilityKey: rally.key })).rejects.toThrow(/ліміт/i);
  });

  it("невідоме вміння → action_rejected", async () => {
    await expect(bonusActionMutation(context({ participants: [heroWith, goblin] }), { participantId: "hero", abilityKey: "nope" })).rejects.toThrow();
  });

  it("чужий учасник — 403; бонусна дія вже використана — action_used", async () => {
    await expect(bonusActionMutation(context({ participants: [heroWith, goblin], userId: "someone" }), { participantId: "hero", abilityKey: rally.key })).rejects.toThrow(
      BattleAccessError,
    );

    const used = { ...heroWith, actionFlags: { ...heroWith.actionFlags, hasUsedBonusAction: true } };

    await expect(bonusActionMutation(context({ participants: [used, goblin] }), { participantId: "hero", abilityKey: rally.key })).rejects.toThrow(
      expect.objectContaining({ code: "action_used" }),
    );
  });

  it("учасник у паніці — action_used", async () => {
    const panic = { participantId: "hero", d10Roll: 1, moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, moralePositive: false, message: "" } };

    const ctx = context({ participants: [heroWith, goblin] });

    await expect(bonusActionMutation({ ...ctx, scene: { ...ctx.scene, pendingMoraleCheck: panic } }, { participantId: "hero", abilityKey: rally.key })).rejects.toThrow(
      expect.objectContaining({ code: "action_used" }),
    );
  });
});
