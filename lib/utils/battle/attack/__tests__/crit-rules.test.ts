import { describe, expect, it } from "vitest";

import { calculateAttackRoll } from "../roll";
import { SWORD } from "./helpers";

import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS } from "@/lib/constants/critical-effects";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { resolveAttackRoll } from "@/lib/utils/battle/common/attack-roll-helpers";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";

const attacker = createMockParticipant();

const attack = SWORD;

const rulesWith = (criticals: Partial<typeof DEFAULT_RULES.criticals>) => parseRules({ criticals });

const roll = (d20: number, rules?: ReturnType<typeof parseRules>, rng?: () => number) => calculateAttackRoll(attacker, attack, d20, undefined, undefined, { rules, rng });

describe("calculateAttackRoll: правила критів", () => {
  it("без rules і з DEFAULT_RULES: 20 крит, 19 ні, 1 провал", () => {
    for (const rules of [undefined, DEFAULT_RULES]) {
      expect(roll(20, rules).isCritical).toBe(true);
      expect(roll(19, rules).isCritical).toBe(false);
      expect(roll(1, rules).isCriticalFail).toBe(true);
    }
  });

  it("critOn 19: крит на 19", () => {
    expect(roll(19, rulesWith({ critOn: 19 })).isCritical).toBe(true);
    expect(roll(18, rulesWith({ critOn: 19 })).isCritical).toBe(false);
  });

  it("critThreshold -1 від здібності разом з critOn 19 дає 18", () => {
    const extra: StaticEffect[] = [{ kind: "modifyStat", stat: "critThreshold", flat: -1 }];

    const r = (d20: number) => calculateAttackRoll(attacker, attack, d20, undefined, undefined, { rules: rulesWith({ critOn: 19 }), extra });

    expect(r(18).isCritical).toBe(true);
    expect(r(17).isCritical).toBe(false);
  });

  it("fumbleOn 0 вимикає провал, fumbleOn 2 розширює", () => {
    expect(roll(1, rulesWith({ fumbleOn: 0 })).isCriticalFail).toBe(false);
    expect(roll(2, rulesWith({ fumbleOn: 2 })).isCriticalFail).toBe(true);
    expect(roll(3, rulesWith({ fumbleOn: 2 })).isCriticalFail).toBe(false);
  });

  it("effects false: крит і провал є, ефект не обирається", () => {
    const rules = rulesWith({ effects: false });

    expect(roll(20, rules)).toMatchObject({ isCritical: true, criticalEffect: undefined });
    expect(roll(1, rules)).toMatchObject({ isCriticalFail: true, criticalEffect: undefined });
    expect(roll(20).criticalEffect).toBeDefined();
  });

  it("disabledSuccess/disabledFail: лишається один ефект", () => {
    const keepS = CRITICAL_SUCCESS_EFFECTS[3];

    const keepF = CRITICAL_FAIL_EFFECTS[2];

    const rules = rulesWith({
      disabledSuccess: CRITICAL_SUCCESS_EFFECTS.filter((e) => e.id !== keepS.id).map((e) => String(e.id)),
      disabledFail: CRITICAL_FAIL_EFFECTS.filter((e) => e.id !== keepF.id).map((e) => String(e.id)),
    });

    for (const x of [0, 0.3, 0.99]) {
      expect(roll(20, rules, () => x).criticalEffect?.id).toBe(keepS.id);
      expect(roll(1, rules, () => x).criticalEffect?.id).toBe(keepF.id);
    }
  });

  it("усі ефекти вимкнені: без ефекту", () => {
    const rules = rulesWith({ disabledSuccess: CRITICAL_SUCCESS_EFFECTS.map((e) => String(e.id)) });

    expect(roll(20, rules).criticalEffect).toBeUndefined();
  });

  it("resolveAttackRoll збігається з сервером на d20 1..20", () => {
    for (const c of [{ critOn: 20, fumbleOn: 1 }, { critOn: 19, fumbleOn: 2 }, { critOn: 18, fumbleOn: 0 }]) {
      const rules = rulesWith(c);

      for (let d20 = 1; d20 <= 20; d20++) {
        const server = roll(d20, rules);

        const client = resolveAttackRoll({ attackRoll: d20 }, 10, 0, c);

        expect(client.crit).toBe(server.isCritical);
        expect(client.critFail).toBe(server.isCriticalFail);
      }
    }
  });

  it("resolveAttackRoll враховує critThreshold так само, як сервер", () => {
    const withMod = (flat: number) => ({
      ...attacker,
      abilities: attacker.abilities,
      battleData: { ...attacker.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "critThreshold", flat }] })] },
    });

    for (const flat of [-1, -2]) {
      const a = withMod(flat);

      const rules = rulesWith({ critOn: 20 });

      for (let d20 = 1; d20 <= 20; d20++) {
        const server = calculateAttackRoll(a, attack, d20, undefined, undefined, { rules, participants: [a] });

        const critOn = Math.max(2, 20 + collectModifiers([a], a.basicInfo.id, { stat: "critThreshold" }).flat);

        const client = resolveAttackRoll({ attackRoll: d20 }, 10, 0, { critOn, fumbleOn: 1 });

        expect(client.crit).toBe(server.isCritical);
      }
    }
  });

  it("крит і фумбл не збігаються на одному кидку", () => {
    const rules = rulesWith({ critOn: 2, fumbleOn: 1 });

    expect(roll(1, rules)).toMatchObject({ isCritical: false, isCriticalFail: true });
    expect(resolveAttackRoll({ attackRoll: 1 }, 1, 50, { critOn: 1, fumbleOn: 1 })).toMatchObject({ crit: false, critFail: true });
  });

  it("resolveAttackRoll за замовчуванням: 20 крит, 19 ні, 1 провал", () => {
    expect(resolveAttackRoll({ attackRoll: 20 }, 99, 0).crit).toBe(true);
    expect(resolveAttackRoll({ attackRoll: 19 }, 99, 0).crit).toBe(false);
    expect(resolveAttackRoll({ attackRoll: 1 }, 1, 50).critFail).toBe(true);
  });
});
