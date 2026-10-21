import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import type { FlagEffect } from "@/lib/utils/abilities/schema";
import { checkMorale } from "@/lib/utils/battle/morale/check";

const p = (morale: number, flag?: FlagEffect) => {
  const base = makeParticipant({ id: "p", abilities: flag ? [resolved({ trigger: { event: "passive" }, effects: [flag] })] : [] });

  return { ...base, combatStats: { ...base.combatStats, morale } };
};

describe("checkMorale з прапорцями", () => {
  it("без прапорців: −3 пропускає на 1–3, не на 10; +3 і d10 = 10 → додатковий хід", () => {
    expect(checkMorale(p(-3), 3).shouldSkipTurn).toBe(true);
    expect(checkMorale(p(-3), 10).shouldSkipTurn).toBe(false);
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

  it("moraleChance: кожні повні 10 % знижують поріг d10 на грань, без прихованого кидка; мінус не страждає", () => {
    const lead: FlagEffect = { kind: "flag", flag: "moraleChance", percent: 15 };

    expect(checkMorale(p(1, lead), 9).hasExtraTurn).toBe(true);
    expect(checkMorale(p(1, lead), 8).hasExtraTurn).toBe(false);
    expect(checkMorale(p(1, lead), 8).message).toContain("лідерство +15%, кидок: 8, потрібно: >=9");
    expect(checkMorale(p(1), 9).hasExtraTurn).toBe(false);
    expect(checkMorale(p(1), 9).message).not.toContain("лідерство");
    expect(checkMorale(p(1, { kind: "flag", flag: "moraleChance", percent: 5 }), 9).hasExtraTurn).toBe(false);
    expect(checkMorale(p(-2, lead), 3).shouldSkipTurn).toBe(false);
    expect(checkMorale(p(-2, lead), 2).shouldSkipTurn).toBe(true);
  });

  it("moraleChance з аурою allAllies діє на союзників лідера, не на ворогів", () => {
    const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "moraleChance", percent: 15, target: "allAllies" }] });

    const leader = makeParticipant({ id: "l", abilities: [aura] });

    const ally = { ...makeParticipant({ id: "a" }), combatStats: { ...makeParticipant({ id: "a" }).combatStats, morale: 1 } };

    const foe = { ...makeParticipant({ id: "f", side: ParticipantSide.ENEMY }), combatStats: { ...makeParticipant({ id: "f" }).combatStats, morale: 1 } };

    expect(checkMorale(ally, 9, [leader, ally, foe]).hasExtraTurn).toBe(true);
    expect(checkMorale(foe, 9, [leader, ally, foe]).hasExtraTurn).toBe(false);
  });
});
