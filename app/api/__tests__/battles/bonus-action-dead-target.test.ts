import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { bonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleParticipant } from "@/types/battle";

const feast = resolved({
  id: "f",
  trigger: { event: "bonusAction" },
  condition: { type: "targetDead" },
  limits: { perBattle: 2 },
  effects: [{ kind: "restoreSpellSlot", count: 1, target: "self" }],
});

const base = participant("hero", { controlledBy: "user-1" }, {});

const slots = { "1": { max: 2, current: 0 } };

const hero: BattleParticipant = {
  ...base,
  spellcasting: { ...base.spellcasting, spellSlots: slots },
  battleData: { ...base.battleData, resolvedAbilities: [feast] },
};

const corpse: BattleParticipant = { ...goblin, combatStats: { ...goblin.combatStats, status: "dead" } } as BattleParticipant;

const run = (ps: BattleParticipant[], targetParticipantId?: string) =>
  bonusActionMutation(context({ participants: ps }), { participantId: "hero", abilityKey: feast.key, targetParticipantId });

const rejected = expect.objectContaining({ code: "invalid_target", message: API_ERRORS.BONUS_TARGET_MUST_BE_DEAD });

describe("bonus action with targetDead", () => {
  it("dead target → effect applies, use recorded", async () => {
    const h = (await run([hero, corpse], "gob")).participants.find((p) => p.basicInfo.id === "hero");

    expect(h?.spellcasting.spellSlots["1"].current).toBe(1);
    expect(h?.battleData.abilityUsage?.[feast.key].battle).toBe(1);
    expect(h?.actionFlags.hasUsedBonusAction).toBe(true);
  });

  it("living target and missing target are rejected before anything is spent", async () => {
    await expect(run([hero, goblin], "gob")).rejects.toThrow(rejected);
    await expect(run([hero, corpse])).rejects.toThrow(rejected);
    expect(hero.spellcasting.spellSlots["1"].current).toBe(0);
    expect(hero.actionFlags.hasUsedBonusAction).toBe(false);
  });
});
