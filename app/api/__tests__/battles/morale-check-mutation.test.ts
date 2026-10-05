import { describe, expect, it } from "vitest";

import { context, hero } from "./fixtures";

import { moraleCheckMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/morale-check/morale-check-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";

describe("morale-check mutation", () => {
  it("зберігає результат у pendingMoraleCheck і повертає moraleResult", () => {
    const out = moraleCheckMutation(context(), { participantId: "hero", d10Roll: 5 });

    expect(out.events).toEqual([]);
    expect(out.scene?.pendingMoraleCheck).toMatchObject({ participantId: "hero", d10Roll: 5 });
    expect(out.response?.moraleResult).toBeDefined();
    expect(out.participants).toEqual([hero, expect.anything()]);
  });

  it("чужий учасник — 403, немає — 404", () => {
    expect(() => moraleCheckMutation(context({ userId: "someone" }), { participantId: "hero", d10Roll: 5 })).toThrow(BattleAccessError);
    expect(() => moraleCheckMutation(context(), { participantId: "nobody", d10Roll: 5 })).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });

  it("повторна перевірка моралі тим самим учасником у цьому ході — action_used", () => {
    const pending = { participantId: "hero", d10Roll: 5, moraleResult: { shouldSkipTurn: false, hasExtraTurn: false, message: "", moralePositive: true } };

    expect(() => moraleCheckMutation(context({ scene: { ...context().scene, pendingMoraleCheck: pending } }), { participantId: "hero", d10Roll: 10 })).toThrow(
      expect.objectContaining({ code: "action_used" }),
    );
  });
});
