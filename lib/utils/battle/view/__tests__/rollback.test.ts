import { describe, expect, it } from "vitest";

import { BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE } from "@/lib/constants/battle";
import { canRollbackEntry } from "@/lib/utils/battle/view/rollback";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

const entry = (actionIndex: number, isCancelled = false) => ({ actionIndex, isCancelled }) as BattleAction;

const battle = (status: BattleScene["status"], count: number) =>
  ({ status, battleLog: Array.from({ length: count }, (_, i) => entry(i + 1)) }) as BattleScene;

describe("canRollbackEntry", () => {
  it("активний бій — будь-який запис", () => {
    const b = battle("active", 40);

    expect(canRollbackEntry(b, b.battleLog[0])).toBe(true);
  });

  it("завершений бій — лише записи, для яких лишився знімок (останні N)", () => {
    const b = battle("completed", 40);

    const oldestKept = 40 - BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE + 1;

    expect(canRollbackEntry(b, entry(oldestKept))).toBe(true);
    expect(canRollbackEntry(b, entry(oldestKept - 1))).toBe(false);
  });

  it("завершений короткий бій — усі записи", () => {
    const b = battle("completed", 5);

    expect(canRollbackEntry(b, entry(1))).toBe(true);
  });

  it("скасовані записи не рахуються й не відкочуються", () => {
    const b = { ...battle("completed", 30), battleLog: [...battle("completed", 30).battleLog, entry(31, true)] };

    expect(canRollbackEntry(b, entry(31, true))).toBe(false);
    expect(canRollbackEntry(b, entry(30 - BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE + 1))).toBe(true);
  });
});
