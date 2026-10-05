import { describe, expect, it } from "vitest";

import { battleActionToEvent, eventToBattleAction, systemEvent } from "@/lib/utils/battle/store/event-mapping";
import type { BattleAction } from "@/types/battle";

const action: BattleAction = {
  id: "x",
  battleId: "b1",
  round: 2,
  actionIndex: 7,
  timestamp: new Date("2026-01-01"),
  actorId: "hero",
  actorName: "Арвен",
  actorSide: "ally",
  actionType: "attack",
  targets: [{ participantId: "gob", participantName: "Гоблін" }],
  actionDetails: { weaponName: "Меч", totalDamage: 6 },
  resultText: "Арвен влучає",
  hpChanges: [{ participantId: "gob", participantName: "Гоблін", oldHp: 7, newHp: 1, change: 6 }],
  isCancelled: false,
};

describe("event mapping", () => {
  it("BattleAction → подія → BattleAction зберігає все, що бачить клієнт", () => {
    const event = battleActionToEvent(action);

    const back = eventToBattleAction({ ...event, seq: 12, actorId: event.actorId ?? null, targets: event.targets ?? [], details: event.details ?? {}, hpChanges: event.hpChanges ?? [] }, "b1", { createdAt: new Date("2026-01-01") });

    expect(back).toMatchObject({
      id: "b1-12",
      actionIndex: 12,
      round: 2,
      actorId: "hero",
      actorName: "Арвен",
      actorSide: "ally",
      actionType: "attack",
      targets: action.targets,
      actionDetails: action.actionDetails,
      resultText: "Арвен влучає",
      hpChanges: action.hpChanges,
      isCancelled: false,
    });
  });

  it("скасована подія — isCancelled", () => {
    const e = { ...battleActionToEvent(action), seq: 1, actorId: "hero", targets: [], details: {}, hpChanges: [] };

    expect(eventToBattleAction(e, "b1", { cancelledAt: new Date() }).isCancelled).toBe(true);
  });

  it("системна подія — від імені «Система»", () => {
    const e = systemEvent(3, "Тригери після зміни HP: …");

    const back = eventToBattleAction({ ...e, seq: 2, actorId: e.actorId ?? null, targets: [], details: e.details ?? {}, hpChanges: [] }, "b1");

    expect(back).toMatchObject({ actorId: "system", actorName: "Система", actionType: "ability", round: 3 });
  });
});
