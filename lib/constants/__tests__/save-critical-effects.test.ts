import { describe, expect, it } from "vitest";

import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS } from "@/lib/constants/critical-effects";
import { SAVE_FAIL_EFFECTS, SAVE_SUCCESS_EFFECTS } from "@/lib/constants/save-critical-effects";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyCriticalEffect } from "@/lib/utils/battle/attack/critical";
import { critEffectsFor, getCritEffect, randomCritEffect } from "@/lib/utils/battle/crit-choice/catalog";

const HANDLED_IN_SPELL = ["negate_damage", "negate_effects", "double_damage"];

describe("таблиці ефектів спасків", () => {
  it.each([
    ["success", SAVE_SUCCESS_EFFECTS],
    ["fail", SAVE_FAIL_EFFECTS],
  ] as const)("%s: id 1..N унікальні, тип збігається, flavor >= 2", (kind, table) => {
    expect(table.map((e) => e.id)).toEqual(table.map((_, i) => i + 1));
    expect(table).toHaveLength(6);

    for (const e of table) {
      expect(e.type).toBe(kind);
      expect(e.flavor.length).toBeGreaterThanOrEqual(2);
      expect(e.flavor.some((f) => f.includes("{attacker}") || f.includes("{target}"))).toBe(true);
    }
  });

  it("містить задуману розкладку типів", () => {
    expect(SAVE_SUCCESS_EFFECTS.map((e) => e.effect.type)).toEqual(["negate_damage", "advantage_next_attack", "extra_action", "ac_buff", "negate_effects", "extra_action"]);
    expect(SAVE_FAIL_EFFECTS.map((e) => e.effect.type)).toEqual(["double_damage", "prone", "disadvantage_next_attack", "ac_debuff", "lose_reaction", "block_bonus_action"]);
  });
});

describe("catalog", () => {
  it("critEffectsFor вибирає таблицю за джерелом і видом", () => {
    expect(critEffectsFor("attack", "success")).toBe(CRITICAL_SUCCESS_EFFECTS);
    expect(critEffectsFor("attack", "fail")).toBe(CRITICAL_FAIL_EFFECTS);
    expect(critEffectsFor("save", "success")).toBe(SAVE_SUCCESS_EFFECTS);
    expect(critEffectsFor("save", "fail")).toBe(SAVE_FAIL_EFFECTS);
  });

  it("getCritEffect шукає за id", () => {
    expect(getCritEffect("save", "fail", 2)?.effect.type).toBe("prone");
    expect(getCritEffect("save", "fail", 99)).toBeUndefined();
  });

  it.each([
    ["attack", "success"],
    ["attack", "fail"],
    ["save", "success"],
    ["save", "fail"],
  ] as const)("randomCritEffect(%s, %s) споживає рівно один rng()", (source, kind) => {
    let calls = 0;

    const rng = () => {
      calls++;

      return 0.99;
    };

    const effect = randomCritEffect(source, kind, rng);

    expect(calls).toBe(1);
    expect(effect).toBe(critEffectsFor(source, kind).at(-1));
    expect(randomCritEffect(source, kind, () => 0)).toBe(critEffectsFor(source, kind)[0]);
  });

  it("кожен не-спелівський тип змінює учасника в applyCriticalEffect", () => {
    const target = createMockParticipant();

    for (const e of [...SAVE_SUCCESS_EFFECTS, ...SAVE_FAIL_EFFECTS]) {
      if (HANDLED_IN_SPELL.includes(e.effect.type)) {
        expect(applyCriticalEffect(target, e, 1)).toEqual(target);
      } else {
        expect(applyCriticalEffect(target, e, 1), e.name).not.toEqual(target);
      }
    }
  });
});
