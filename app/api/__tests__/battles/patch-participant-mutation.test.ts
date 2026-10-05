import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { patchParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-mutation";

const orc = participant("orc", { controlledBy: "dm" });

describe("patch-participant mutation", () => {
  it("видалення учасника перед поточним зсуває хід назад", () => {
    const out = patchParticipantMutation(context({ participants: [hero, goblin, orc], scene: { ...context().scene, turnIndex: 2 } }), "hero", { removeFromBattle: true });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["gob", "orc"]);
    expect(out.scene?.turnIndex).toBe(1);
  });

  it("видалення останнього, коли хід на ньому, — індекс обрізається", () => {
    const out = patchParticipantMutation(context({ participants: [hero, goblin], scene: { ...context().scene, turnIndex: 1 } }), "gob", { removeFromBattle: true });

    expect(out.scene?.turnIndex).toBe(0);
  });

  it("HP до 0 — unconscious і подія зі зміною HP", () => {
    const out = patchParticipantMutation(context(), "gob", { currentHp: 0 });

    const gob = out.participants.find((p) => p.basicInfo.id === "gob");

    expect(gob?.combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
    expect(out.events[0].hpChanges).toEqual([expect.objectContaining({ participantId: "gob", newHp: 0 })]);
  });

  it("немає учасника — 404", () => {
    expect(() => patchParticipantMutation(context(), "nobody", { currentHp: 3 })).toThrow(expect.objectContaining({ status: 404 }));
  });
});
