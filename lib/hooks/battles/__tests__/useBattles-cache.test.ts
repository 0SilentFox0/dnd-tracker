import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { mergeBattleCache } from "@/lib/hooks/battles/useBattles-cache";
import type { BattleScene } from "@/types/api";

const key = ["battle", "c1", "b1"];

const entry = (actionIndex: number) => ({ actionIndex, resultText: `#${actionIndex}` }) as BattleScene["battleLog"][number];

function seeded(prev: Partial<BattleScene>) {
  const qc = new QueryClient();

  qc.setQueryData(key, { id: "b1", battleLog: [], ...prev });

  return qc;
}

describe("mergeBattleCache", () => {
  it("append доклеює нові записи до наявного журналу", () => {
    const qc = seeded({ version: 1, battleLog: [entry(1), entry(2)] });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 2, battleLogMode: "append", battleLog: [entry(3)] } as unknown as BattleScene);

    expect(merged.battleLog.map((e) => e.actionIndex)).toEqual([1, 2, 3]);
  });

  it("старіша версія не відкочує кеш", () => {
    const qc = seeded({ version: 5, currentTurnIndex: 3 });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 4, currentTurnIndex: 1, battleLog: [] } as unknown as unknown as BattleScene);

    expect(merged.currentTurnIndex).toBe(3);
  });

  it("відкат прибирає скасовані записи", () => {
    const qc = seeded({ version: 1, battleLog: [entry(1), entry(2), entry(3)] });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 2, battleLogMode: "append", battleLogCancelledFrom: 2, battleLog: [] } as unknown as BattleScene);

    expect(merged.battleLog.map((e) => e.actionIndex)).toEqual([1]);
  });

  it("повна відповідь (GET) замінює журнал", () => {
    const qc = seeded({ version: 1, battleLog: [entry(1)] });

    const merged = mergeBattleCache(qc, "c1", "b1", { id: "b1", version: 2, battleLog: [entry(7)] } as unknown as BattleScene);

    expect(merged.battleLog.map((e) => e.actionIndex)).toEqual([7]);
  });
});
