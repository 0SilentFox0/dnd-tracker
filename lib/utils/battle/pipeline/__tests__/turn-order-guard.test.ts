import { describe, expect, it, vi } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { guardTurnOrder } from "@/lib/utils/battle/pipeline/turn-order-guard";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { logger } from "@/lib/utils/common/logger";

const scene: BattleSceneState = { id: "b", campaignId: "c", status: "active", round: 2, turnIndex: 1, version: 1, eventSeq: 0, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null };

const p = (id: string) => makeParticipant({ id });

const order = (r: { participants: { basicInfo: { id: string } }[] }) => r.participants.map((x) => x.basicInfo.id);

describe("guardTurnOrder", () => {
  it("повертає порядок, якщо дія переставила учасників, і пише помилку", () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});

    const r = guardTurnOrder(scene, [p("a"), p("b"), p("c")], { participants: [p("b"), p("a"), p("c")], pending: [], events: [] }, "spell");

    expect(order(r)).toEqual(["a", "b", "c"]);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it("вставлені й видалені учасники лишаються на своїх місцях", () => {
    const r = guardTurnOrder(scene, [p("a"), p("b"), p("c")], { participants: [p("c"), p("new"), p("a")], pending: [], events: [] });

    expect(order(r)).toEqual(["a", "new", "c"]);
  });

  it("новий раунд і history (старт/відкат) можуть міняти порядок", () => {
    const swapped = { participants: [p("b"), p("a")], pending: [], events: [] };

    expect(order(guardTurnOrder(scene, [p("a"), p("b")], { ...swapped, scene: { round: 3 } }))).toEqual(["b", "a"]);
    expect(order(guardTurnOrder(scene, [p("a"), p("b")], { ...swapped, history: { clear: true } }))).toEqual(["b", "a"]);
  });
});
