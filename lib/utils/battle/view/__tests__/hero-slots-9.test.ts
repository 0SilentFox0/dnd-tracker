import { describe, expect, it } from "vitest";

import { pactSlot, slotLevels, spellTier } from "@/lib/utils/battle/view/hero";
import type { BattleParticipant } from "@/types/battle";

const withSlots = (spellSlots: Record<string, { max: number; current: number; level?: number }>) => ({ spellcasting: { spellSlots } }) as unknown as BattleParticipant;

describe("slot levels 0–9", () => {
  it("keeps levels 1–5 always (HOMM unchanged)", () => {
    expect(slotLevels(withSlots({})).map((s) => s.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("adds 6–9 only when they have slots", () => {
    const levels = slotLevels(withSlots({ "6": { max: 1, current: 1 }, "9": { max: 1, current: 0 } })).map((s) => s.level);

    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 9]);
  });

  it("tiers clamp at 9", () => {
    expect(spellTier(5)).toBe("platinum");
    expect(spellTier(9)).not.toBe(spellTier(5));
    expect(spellTier(12)).toBe(spellTier(9));
  });

  it("reads pact slot", () => {
    expect(pactSlot(withSlots({ pact: { level: 3, max: 2, current: 1 } }))).toEqual({ level: 3, max: 2, current: 1 });
    expect(pactSlot(withSlots({}))).toBeNull();
  });
});
