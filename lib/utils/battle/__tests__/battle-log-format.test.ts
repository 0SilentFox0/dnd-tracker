import { describe, expect, it } from "vitest";

import { BATTLE_ACTION_LABELS, formatLogEntry, getLogEntryDetailLines } from "@/lib/utils/battle/battle-log-format";
import type { BattleAction } from "@/types/battle";

describe("лог: відсіч", () => {
  it("мітка і рядок превʼю — текст події", () => {
    const e = { actionType: "retaliation", actorName: "Гоблін", targets: [{ participantId: "me", participantName: "Фрейда" }], actionDetails: { totalDamage: 4 }, hpChanges: [], resultText: "Відсіч: Гоблін → Фрейда: d20 17, 4 урону" } as unknown as BattleAction;

    expect(BATTLE_ACTION_LABELS.retaliation).toBe("Відсіч");
    expect(formatLogEntry(e)).toBe("Відсіч: Гоблін → Фрейда: d20 17, 4 урону");
  });
});

describe("лог: фраза криту", () => {
  const entry = (flavor?: string) => ({ actionType: "attack", actorName: "A", targets: [], actionDetails: { criticalEffect: { id: 3, name: "Ефект", description: "опис", type: "success", flavor } }, hpChanges: [], resultText: "" }) as unknown as BattleAction;

  it("без фрази — як раніше", () => {
    expect(getLogEntryDetailLines(entry())).toEqual(["Ефект [d10: 3]: Ефект — опис"]);
  });

  it("фраза не дублюється в деталях — вона вже в resultText", () => {
    expect(getLogEntryDetailLines(entry("Фраза."))).toEqual(["Ефект [d10: 3]: Ефект — опис"]);
  });
});
