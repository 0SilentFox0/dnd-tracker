import { describe, expect, it } from "vitest";

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
});
