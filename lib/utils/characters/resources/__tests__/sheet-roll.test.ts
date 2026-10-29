import { describe, expect, it } from "vitest";

import { makeT } from "@/lib/i18n/test/mock-t";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const rogue = (exhausted = false): BattleParticipant => {
  const p = createMockParticipant();

  return {
    ...p,
    abilities: { ...p.abilities, skillProficiencies: ["stealth"] },
    battleData: {
      ...p.battleData,
      activeEffects: exhausted ? [{ id: "ex", name: "Виснаження", type: "debuff", duration: 99, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [{ type: "exhaustion", value: 1 }] } as never] : [],
    },
  };
};

const opts = (inspiration: boolean) => ({ rules: DEFAULT_RULES, rng: seq(0.5, 0.95), inspiration, t: makeT() });

describe("rollFromSheet", () => {
  it("skill check: d20 + DEX + proficiency", () => {
    expect(rollFromSheet(rogue(), { kind: "check", skill: "stealth" }, opts(false))).toMatchObject({ rolls: [11], roll: 11, mod: 1, bonus: 2, total: 14, mode: "normal", inspirationUsed: false });
  });

  it("inspiration gives advantage", () => {
    expect(rollFromSheet(rogue(), { kind: "check", skill: "stealth" }, opts(true))).toMatchObject({ rolls: [11, 20], roll: 20, total: 23, mode: "advantage", inspirationUsed: true });
  });

  it("inspiration cancels exhaustion disadvantage (2014)", () => {
    expect(rollFromSheet(rogue(true), { kind: "check", skill: "stealth" }, opts(true))).toMatchObject({ rolls: [11], mode: "normal" });
    expect(rollFromSheet(rogue(true), { kind: "check", skill: "stealth" }, opts(false))).toMatchObject({ rolls: [11, 20], roll: 11, mode: "disadvantage" });
  });

  it("saving throw has its own label", () => {
    const r = rollFromSheet(rogue(), { kind: "save", ability: "wisdom" }, opts(false));

    expect(r.label).toBe('rest.rollLabel.save {"ability":"gameTerms.abilities.wisdom.label"}');
    expect(rollFromSheet(rogue(), { kind: "check", skill: "stealth" }, opts(false)).label).toBe("gameTerms.dndSkills.stealth");
    expect(r).toMatchObject({ total: 11, autoFail: false });
  });
});
