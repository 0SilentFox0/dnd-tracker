import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { actorEvent, BattleRuleError, rejectAction } from "@/lib/utils/battle/store";

describe("rejectAction", () => {
  it("кидає BattleRuleError action_rejected з текстом", () => {
    expect(() => rejectAction("ні")).toThrow(BattleRuleError);

    try {
      rejectAction("ні");
    } catch (e) {
      expect(e).toMatchObject({ code: "action_rejected", message: "ні" });
    }
  });
});

describe("actorEvent", () => {
  const actor = makeParticipant({ id: "a", side: ParticipantSide.ALLY });

  const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY });

  it("подія від імені учасника, з ціллю й деталями", () => {
    expect(actorEvent(2, actor, "текст", { target, actionDetails: { mazeEvent: "spotted" } })).toEqual({
      type: "ability",
      round: 2,
      actorId: "a",
      targets: [{ participantId: "t", participantName: target.basicInfo.name }],
      resultText: "текст",
      details: { actorName: actor.basicInfo.name, actorSide: ParticipantSide.ALLY, actionDetails: { mazeEvent: "spotted" } },
    });
  });

  it("без цілі — порожній список цілей", () => {
    expect(actorEvent(1, actor, "x")).toMatchObject({ targets: [], details: { actionDetails: {} } });
  });
});
