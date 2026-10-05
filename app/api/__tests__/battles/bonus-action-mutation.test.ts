import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { bonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";

const skilled = participant("hero", { controlledBy: "user-1" }, {
  battleData: {
    ...hero.battleData,
    activeSkills: [{ skillId: "sk1", name: "Ривок", effects: [], skillTriggers: [{ type: "simple", trigger: "bonusAction" }] } as never],
  },
});

describe("bonus-action mutation", () => {
  it("виконує скіл і пише одну подію від імені учасника", () => {
    const out = bonusActionMutation(context({ participants: [skilled, goblin] }), { participantId: "hero", skillId: "sk1" });

    expect(out.events).toHaveLength(1);
    expect(out.events[0]).toMatchObject({ type: "ability", actorId: "hero" });
  });

  it("контролер може діяти поза своїм ходом (як зараз)", () => {
    const out = bonusActionMutation(context({ participants: [goblin, skilled] }), { participantId: "hero", skillId: "sk1" });

    expect(out.events).toHaveLength(1);
  });

  it("чужий учасник — 403", () => {
    expect(() =>
      bonusActionMutation(context({ participants: [skilled, goblin], userId: "someone" }), { participantId: "hero", skillId: "sk1" }),
    ).toThrow(BattleAccessError);
  });

  it("немає скіла — action_rejected; бонусна дія використана — action_used", () => {
    expect(() => bonusActionMutation(context({ participants: [skilled, goblin] }), { participantId: "hero", skillId: "nope" })).toThrow(
      expect.objectContaining({ code: "action_rejected" }),
    );

    const used = { ...skilled, actionFlags: { ...skilled.actionFlags, hasUsedBonusAction: true } };

    expect(() => bonusActionMutation(context({ participants: [used, goblin] }), { participantId: "hero", skillId: "sk1" })).toThrow(
      expect.objectContaining({ code: "action_used" }),
    );
  });
});
