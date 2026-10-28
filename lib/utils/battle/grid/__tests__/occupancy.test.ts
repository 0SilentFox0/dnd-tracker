import { describe, expect, it } from "vitest";

import { bothOnMap, isAdjacent, isFallen, isOnMap } from "../occupancy";

import { CombatStatus } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";

describe("bothOnMap", () => {
  const a = placed("a", { at: { x: 1, y: 1 } });

  const b = placed("b", { at: { x: 2, y: 2 } });

  it("true only with a map and every participant on it", () => {
    expect(bothOnMap(testMap(), a, b)).toBe(true);
    expect(bothOnMap(null, a, b)).toBe(false);
    expect(bothOnMap(undefined, a)).toBe(false);
    expect(bothOnMap(testMap(), a, placed("c"))).toBe(false);
  });
});

describe("герой, що вмирає (5e), лишається на полі", () => {
  const down = (p: ReturnType<typeof placed>, deathSaves?: { successes: number; failures: number; stable: boolean }) => ({
    ...p,
    combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS },
    battleData: { ...p.battleData, deathSaves },
  });

  it("з кидками смерті займає клітинку й суміжний", () => {
    const dying = down(placed("a", { at: { x: 1, y: 1 } }), { successes: 0, failures: 0, stable: false });

    const foe = placed("b", { at: { x: 2, y: 1 } });

    expect(isOnMap(dying)).toBe(true);
    expect(isAdjacent(dying, foe)).toBe(true);
    expect(isFallen(dying)).toBe(false);
  });

  it("без кидків смерті (HOMM) зникає з поля", () => {
    const out = down(placed("a", { at: { x: 1, y: 1 } }));

    expect(isOnMap(out)).toBe(false);
    expect(isFallen(out)).toBe(true);
  });
});
