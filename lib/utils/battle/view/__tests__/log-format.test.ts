import { describe, expect, it } from "vitest";

import { getLogEntryDetailLines } from "@/lib/utils/battle/view/log-format";
import type { BattleAction } from "@/types/battle";

describe("лог: фраза криту", () => {
  const entry = (flavor?: string) => ({ actionType: "attack", actorName: "A", targets: [], actionDetails: { criticalEffect: { id: 3, name: "Ефект", description: "опис", type: "success", flavor } }, hpChanges: [], resultText: "" }) as unknown as BattleAction;

  it("без фрази — як раніше", () => {
    expect(getLogEntryDetailLines(entry())).toEqual(["Ефект [d10: 3]: Ефект — опис"]);
  });

  it("фраза не дублюється в деталях — вона вже в resultText", () => {
    expect(getLogEntryDetailLines(entry("Фраза."))).toEqual(["Ефект [d10: 3]: Ефект — опис"]);
  });
});
