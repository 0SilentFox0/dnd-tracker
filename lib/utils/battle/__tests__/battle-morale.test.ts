import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { FlagEffect } from "@/lib/utils/abilities/schema";
import { checkMorale } from "@/lib/utils/battle/battle-morale";

const p = (morale: number, flag?: FlagEffect) => {
  const base = makeParticipant({ id: "p", abilities: flag ? [resolved({ trigger: { event: "passive" }, effects: [flag] })] : [] });

  return { ...base, combatStats: { ...base.combatStats, morale } };
};

describe("checkMorale з прапорцями", () => {
  it("без прапорців: −3 і d10 = 10 → пропуск; +3 і d10 = 10 → додатковий хід", () => {
    expect(checkMorale(p(-3), 10).shouldSkipTurn).toBe(true);
    expect(checkMorale(p(3), 10).hasExtraTurn).toBe(true);
  });

  it("noNegativeMorale: −3 не дає паніки", () => {
    expect(checkMorale(p(-3, { kind: "flag", flag: "noNegativeMorale" }), 10)).toMatchObject({ shouldSkipTurn: false, hasExtraTurn: false });
  });

  it("ignoreMorale: +3 не дає додаткового ходу, повідомлення про це", () => {
    const r = checkMorale(p(3, { kind: "flag", flag: "ignoreMorale" }), 10);

    expect(r).toMatchObject({ shouldSkipTurn: false, hasExtraTurn: false });
    expect(r.message).toContain("мораль не діє");
  });

  it("moraleChance: додає шанс додаткового ходу; невдалий d10 добирається другим кидком, мінус не страждає", () => {
    const lead: FlagEffect = { kind: "flag", flag: "moraleChance", percent: 15 };

    expect(checkMorale(p(1, lead), 1, undefined, () => 0).hasExtraTurn).toBe(true);
    expect(checkMorale(p(1, lead), 1, undefined, () => 0.99).hasExtraTurn).toBe(false);
    expect(checkMorale(p(1), 1, undefined, () => 0).hasExtraTurn).toBe(false);
    expect(checkMorale(p(-2, lead), 1, undefined, () => 0).shouldSkipTurn).toBe(false);
    expect(checkMorale(p(-2, lead), 9, undefined, () => 0).shouldSkipTurn).toBe(true);
  });

  it("moraleChance: сумарний шанс = мораль·10 % + бонус", () => {
    const lead: FlagEffect = { kind: "flag", flag: "moraleChance", percent: 15 };

    const rolls = Array.from({ length: 10 }, (_, i) => i + 1);

    const draws = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 100);

    const hits = rolls.flatMap((r) => draws.map((d) => checkMorale(p(1, lead), r, undefined, () => d).hasExtraTurn)).filter(Boolean).length;

    expect(hits / 1000).toBeCloseTo(0.25, 2);
  });

  it("moraleChance з аурою allAllies діє на союзників лідера, не на ворогів", () => {
    const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "moraleChance", percent: 15, target: "allAllies" }] });

    const leader = makeParticipant({ id: "l", abilities: [aura] });

    const ally = { ...makeParticipant({ id: "a" }), combatStats: { ...makeParticipant({ id: "a" }).combatStats, morale: 1 } };

    const foe = { ...makeParticipant({ id: "f", side: ParticipantSide.ENEMY }), combatStats: { ...makeParticipant({ id: "f" }).combatStats, morale: 1 } };

    expect(checkMorale(ally, 1, [leader, ally, foe], () => 0).hasExtraTurn).toBe(true);
    expect(checkMorale(foe, 1, [leader, ally, foe], () => 0).hasExtraTurn).toBe(false);
  });
});
