import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { type QueueEntry, queueKeys, turnQueue, turnsUntil } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const p = (id: string, over: { extra?: boolean; active?: boolean; down?: boolean } = {}): BattleParticipant => {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id },
    combatStats: { ...b.combatStats, status: over.down ? "dead" : "active", currentHp: over.down ? 0 : 10 },
    actionFlags: { ...b.actionFlags, hasExtraTurn: over.extra ?? false },
    battleData: { ...b.battleData, extraTurnActive: over.active ?? false },
  };
};

const shape = (q: QueueEntry[]) => q.map((e) => (e.kind === "round" ? `|${e.round}` : `${e.kind === "extra" ? "+" : ""}${e.participant.basicInfo.id}${e.current ? "*" : ""}`));

describe("turnQueue", () => {
  it("решта раунду → межа → наступний раунд", () => {
    expect(shape(turnQueue([p("a"), p("b"), p("c")], 1, 3))).toEqual(["b*", "c", "|4", "a", "b", "c"]);
  });

  it("додаткові ходи — наприкінці раунду, у порядку ініціативи", () => {
    const order = [p("a", { extra: true }), p("b"), p("c", { extra: true })];

    expect(shape(turnQueue(order, 1, 3))).toEqual(["b*", "c", "+a", "+c", "|4", "a", "b", "c"]);
  });

  it("повалений не отримує додаткового ходу", () => {
    expect(shape(turnQueue([p("a", { extra: true, down: true }), p("b")], 1, 1))).toEqual(["b*", "|2", "b"]);
  });

  it("додатковий хід триває — він поточний", () => {
    const order = [p("a", { active: true }), p("b"), p("c", { extra: true })];

    expect(shape(turnQueue(order, 0, 3))).toEqual(["+a*", "+c", "|4", "a", "b", "c"]);
  });

  it("повалені зникають зі шкали; ключі стабільні за номером появи", () => {
    const q = turnQueue([p("a"), p("x", { down: true }), p("b")], 2, 1);

    expect(shape(q)).toEqual(["b*", "|2", "a", "b"]);
    expect(queueKeys(q)).toEqual(["b#0", "round", "a#0", "b#1"]);
  });

  it("turnsUntil: моя черга, повалені не рахуються, мій хід = 0, кілька моїх — найближчий", () => {
    const q = turnQueue([p("a"), p("x", { down: true }), p("b"), p("me"), p("me2")], 0, 1);

    expect(turnsUntil(q, ["me"])).toBe(2);
    expect(turnsUntil(q, ["me2", "me"])).toBe(2);
    expect(turnsUntil(q, ["a"])).toBe(0);
    expect(turnsUntil(q, ["nobody"])).toBeNull();
  });
});
