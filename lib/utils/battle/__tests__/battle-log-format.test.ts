import { describe, expect, it } from "vitest";

import { BATTLE_ACTION_LABELS, formatLogEntry } from "@/lib/utils/battle/battle-log-format";
import type { BattleAction } from "@/types/battle";

describe("лог: відсіч", () => {
  it("мітка і рядок превʼю — текст події", () => {
    const e = { actionType: "retaliation", actorName: "Гоблін", targets: [{ participantId: "me", participantName: "Фрейда" }], actionDetails: { totalDamage: 4 }, hpChanges: [], resultText: "Відсіч: Гоблін → Фрейда: d20 17, 4 урону" } as unknown as BattleAction;

    expect(BATTLE_ACTION_LABELS.retaliation).toBe("Відсіч");
    expect(formatLogEntry(e)).toBe("Відсіч: Гоблін → Фрейда: d20 17, 4 урону");
  });
});
