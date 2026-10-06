import { describe, expect, it } from "vitest";

import { AbilitySchema, parseAbilities } from "@/lib/utils/abilities/schema";

const base = { id: "a1", name: "Лють" };

describe("AbilitySchema", () => {
  it("приймає пасивку з бонусом шкоди", () => {
    const r = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "passive" },
      effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }],
    });

    expect(r.success).toBe(true);
  });

  it("пасивка не може мати лімітів і нестатичних ефектів", () => {
    const r = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "passive" },
      limits: { perBattle: 1 },
      effects: [{ kind: "heal", amount: 5 }],
    });

    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(expect.arrayContaining(["limits", "effects.0"]));
  });

  it("запечений стат — лише в пасивці і без умови", () => {
    const timed = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "hit", role: "attacker" },
      effects: [{ kind: "modifyStat", stat: "maxHp", flat: 5, duration: { rounds: 2 } }],
    });

    const conditional = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "passive" },
      condition: { type: "hpBelow", who: "self", percent: 50 },
      effects: [{ kind: "modifyStat", stat: "maxHp", flat: 5 }],
    });

    expect(timed.success).toBe(false);
    expect(conditional.success).toBe(false);
  });

  it("статичний ефект без duration дозволений лише у фазі before", () => {
    const before = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" },
      effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }],
    });

    const hit = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "hit", role: "attacker" },
      effects: [{ kind: "flag", flag: "advantage", attackKind: "all" }],
    });

    expect(before.success).toBe(true);
    expect(hit.success).toBe(false);
  });

  it("dot вимагає duration, randomOf не вкладається", () => {
    expect(
      AbilitySchema.safeParse({
        ...base,
        trigger: { event: "hit", role: "attacker" },
        effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed" }],
      }).success,
    ).toBe(false);
    expect(
      AbilitySchema.safeParse({
        ...base,
        trigger: { event: "hit", role: "attacker" },
        effects: [
          {
            kind: "randomOf",
            options: [
              { kind: "randomOf", options: [] },
              { kind: "heal", amount: 1 },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("рекурсивні умови", () => {
    const r = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "turnStart" },
      condition: {
        type: "any",
        conditions: [
          { type: "hpBelow", who: "anyAlly", percent: 15 },
          { type: "all", conditions: [{ type: "attackKind", kind: "magic" }] },
        ],
      },
      effects: [{ kind: "heal", amount: "2d4", target: "allAllies" }],
    });

    expect(r.success).toBe(true);
  });

  it("parseAbilities: null для null і для невалідних даних", () => {
    expect(parseAbilities(null)).toBeNull();
    expect(parseAbilities([{ id: "x" }])).toBeNull();
    expect(parseAbilities([])).toEqual([]);
  });
});

describe("counterAttack", () => {
  it("magic відкидається: заклинання відсічі не викликають", () => {
    const r = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "passive" },
      effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee", "magic"], bonusPercent: 15 }],
    });

    expect(r.success).toBe(true);
    expect(r.success && r.data.effects[0]).toEqual({ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 15 });
  });

  it("збережене лише magic не губить вміння: лишається бонус без розширення на дальні", () => {
    const r = AbilitySchema.safeParse({ ...base, trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["magic"], bonusPercent: 10 }] });

    expect(r.success && r.data.effects[0]).toMatchObject({ attackKinds: [], bonusPercent: 10 });
  });
});
