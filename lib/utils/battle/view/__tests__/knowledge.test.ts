import { describe, expect, it } from "vitest";

import { BattleActionType } from "@/lib/constants/battle";
import { formatKnownArmorClass, type KnownArmorClass, knownArmorClass, mergeKnownArmorClass, mergeObservedTraits, observedTraits, summarizeKnowledge } from "@/lib/utils/battle/view";
import { KNOWLEDGE_EVENT_TYPES } from "@/lib/utils/battle/view/knowledge";
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

describe("mergeKnownArmorClass", () => {
  const ac = (min: number | undefined, max: number | undefined, evidence: KnownArmorClass["evidence"] = []): KnownArmorClass => ({ min, max, evidence });

  it("звужує межі: найбільший min і найменший max", () => {
    expect(mergeKnownArmorClass(ac(13, 18), ac(14, 16))).toMatchObject({ min: 14, max: 16 });
    expect(mergeKnownArmorClass(ac(13, undefined), ac(undefined, 16))).toMatchObject({ min: 13, max: 16 });
  });

  it("без серверних знань повертає клієнтські", () => {
    const b = ac(14, 16);

    expect(mergeKnownArmorClass(undefined, b)).toBe(b);
  });

  it("суперечність (AC змінився) — віддає свіжіші клієнтські межі", () => {
    expect(mergeKnownArmorClass(ac(10, 12), ac(16, undefined))).toMatchObject({ min: 16, max: undefined });
  });

  it("докази без дублікатів", () => {
    const e = { actorName: "A", total: 15, hit: true, round: 1 };

    expect(mergeKnownArmorClass(ac(undefined, 15, [e]), ac(undefined, 15, [e])).evidence).toEqual([e]);
  });
});

describe("mergeObservedTraits", () => {
  it("об'єднує за назвою", () => {
    const a = { label: "Захист", kind: "percent" as const, value: -20 };

    const b = { label: "Опір", kind: "percent" as const, value: -50 };

    expect(mergeObservedTraits([a], [a, b])).toEqual([a, b]);
  });
});

describe("summarizeKnowledge", () => {
  it("лише цілі з відомим AC або рисами; докази обрізано", () => {
    const log = Array.from({ length: 8 }, (_, i) => atk("A", 10 + i, true, 1));

    const summary = summarizeKnowledge(log);

    expect(Object.keys(summary)).toEqual(["t"]);
    expect(summary.t.ac.max).toBe(10);
    expect(summary.t.ac.evidence).toHaveLength(5);
  });
});

describe("знання з заклинань", () => {
  const step = { label: "Опір вогню", side: "target" as const, kind: "percent" as const, value: -50, after: 5 };

  const spell = { ...atk("Маг", 30, true, 1, { damageSteps: { t: [step] } }), actionType: BattleActionType.SPELL } as BattleAction;

  it("підсумок бере риси з заклинань, але AC — лише з атак", () => {
    const summary = summarizeKnowledge([spell]);

    expect(summary.t.traits).toEqual([{ label: "Опір вогню", kind: "percent", value: -50 }]);
    expect(summary.t.ac).toMatchObject({ min: undefined, max: undefined });
  });

  it("сервер читає події заклинань для знання", () => {
    expect(KNOWLEDGE_EVENT_TYPES).toEqual(expect.arrayContaining([BattleActionType.ATTACK, BattleActionType.RETALIATION, BattleActionType.SPELL]));
  });
});
