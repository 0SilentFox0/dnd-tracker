import { describe, expect, it } from "vitest";

import { logTextOf } from "@/lib/i18n/test/text";
import { textRef } from "@/lib/i18n/text-ref";
import { actionLines } from "@/lib/utils/battle/log/lines";
import { battleActionToEvent, dmEvent, eventToBattleAction, systemEvent } from "@/lib/utils/battle/store/event-mapping";
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

  it("подія ДМ — від імені ДМ, з цілями", () => {
    const e = dmEvent(2, "ДМ щось зробив", [{ participantId: "p", participantName: "П" }]);

    expect(e).toMatchObject({ type: "ability", round: 2, targets: [{ participantId: "p", participantName: "П" }], resultText: "ДМ щось зробив" });
    expect(dmEvent(2, "x")).not.toHaveProperty("targets");
  });
});

describe("fallback-текст у resultText", () => {
  const log = [textRef("battleCommon.actors.dm"), "Гоблін"];

  const stored = (resultText: string, details: Record<string, unknown>) => ({ seq: 1, type: "ability", round: 1, actorId: null, targets: [], hpChanges: [], resultText, details });

  it("з log клієнту віддається порожній resultText", () => {
    expect(eventToBattleAction(stored("fallback | text", { log }), "b1").resultText).toBe("");
  });

  it("без log лишається legacy-рядок", () => {
    expect(eventToBattleAction(stored("legacy", {}), "b1").resultText).toBe("legacy");
  });
});

describe("структурований лог", () => {
  const log = [textRef("battleCommon.actors.dm"), "Гоблін"];

  it("log іде в details.log, resultText порожній", () => {
    const event = battleActionToEvent({ ...action, resultText: "", log });

    expect(event.resultText).toBe("");
    expect(event.details).toMatchObject({ log });
  });

  it("round-trip зберігає log", () => {
    const event = battleActionToEvent({ ...action, resultText: "", log });

    const back = eventToBattleAction({ ...event, seq: 3, actorId: "hero", targets: [], details: event.details ?? {}, hpChanges: [] }, "b1");

    expect(back.log).toEqual(log);
    expect(back.resultText).toBe("");
  });

  it("legacy-подія без log: actionLines = старі сегменти", () => {
    const e = { ...battleActionToEvent({ ...action, resultText: "a | b" }), seq: 1, actorId: "hero", targets: [], details: {}, hpChanges: [] };

    const back = eventToBattleAction(e, "b1");

    expect(back.log).toBeUndefined();
    expect(actionLines(back)).toEqual(["a", "b"]);
  });

  it("системна подія з ref пише log у details", () => {
    const ref = textRef("battleCommon.actors.system");

    expect(systemEvent(1, ref)).toMatchObject({ resultText: "", details: { log: [ref] } });
    expect(systemEvent(1, "текст")).toMatchObject({ resultText: "текст" });
    expect(systemEvent(1, "текст").details).not.toHaveProperty("log");
  });

  it("logTextOf на події з log дає ДМ/DM за мовою глядача", () => {
    expect(logTextOf({ resultText: "", log: [textRef("battleCommon.actors.dm")] }, "uk")).toBe("DM");
    expect(logTextOf({ resultText: "", log: [textRef("battleCommon.actors.system")] }, "en")).toBe("System");
  });
});
