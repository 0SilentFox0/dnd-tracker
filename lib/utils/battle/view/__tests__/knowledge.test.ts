import { describe, expect, it } from "vitest";

import { formatKnownArmorClass, knownArmorClass, observedTraits } from "@/lib/utils/battle/view";
import type { BattleAction } from "@/types/battle";

const atk = (actorName: string, total: number, isHit: boolean, round = 1, extra: Partial<BattleAction["actionDetails"]> = {}): BattleAction =>
  ({
    actionIndex: Math.random(), round, actorName, actionType: "attack",
    targets: [{ participantId: "t", participantName: "Т" }],
    actionDetails: { totalAttackValue: total, isHit, isCritical: false, isCriticalFail: false, ...extra },
  }) as unknown as BattleAction;

describe("knownArmorClass", () => {
  it("кидок відсічі теж доказ AC того, по кому вона била", () => {
    const ret = { ...atk("Гоблін", 15, true), actionType: "retaliation" } as BattleAction;

    expect(knownArmorClass([ret], "t")).toMatchObject({ max: 15 });
  });

  it("нічого не відомо — ?", () => {
    expect(formatKnownArmorClass(knownArmorClass([], "t"))).toBe("?");
  });

  it("влучання 15 і промах 12 → 13–15", () => {
    const k = knownArmorClass([atk("Годрік", 15, true), atk("Фрейда", 12, false)], "t");

    expect(k).toMatchObject({ min: 13, max: 15 });
    expect(formatKnownArmorClass(k)).toBe("13–15");
    expect(k.evidence).toHaveLength(2);
  });

  it("лише промахи → ≥; лише влучання → ≤; рівні межі → одне число", () => {
    expect(formatKnownArmorClass(knownArmorClass([atk("A", 13, false)], "t"))).toBe("≥ 14");
    expect(formatKnownArmorClass(knownArmorClass([atk("A", 16, true)], "t"))).toBe("≤ 16");
    expect(formatKnownArmorClass(knownArmorClass([atk("A", 14, true), atk("B", 13, false)], "t"))).toBe("14");
  });

  it("натуральні 20 і 1 нічого не кажуть про AC; чужі цілі ігноруються", () => {
    const crit = atk("A", 9, true, 1, { isCritical: true });

    const other = { ...atk("A", 5, false), targets: [{ participantId: "x", participantName: "X" }] } as BattleAction;

    expect(formatKnownArmorClass(knownArmorClass([crit, other], "t"))).toBe("?");
  });

  it("суперечність (AC змінився) — лише останній раунд", () => {
    const k = knownArmorClass([atk("A", 12, true, 1), atk("B", 15, false, 2)], "t");

    expect(formatKnownArmorClass(k)).toBe("≥ 16");
  });
});

describe("observedTraits", () => {
  it("унікальні кроки цілі з подій", () => {
    const step = { label: "Експертний захист", side: "target" as const, kind: "percent" as const, value: -20, after: 8 };

    const log = [
      atk("A", 15, true, 1, { damageSteps: { t: [{ label: "Кубики", side: "attacker", kind: "dice", value: 6, after: 6 }, step] } }),
      atk("B", 16, true, 2, { damageSteps: { t: [step] } }),
    ];

    expect(observedTraits(log, "t")).toEqual([{ label: "Експертний захист", kind: "percent", value: -20 }]);
  });
});
