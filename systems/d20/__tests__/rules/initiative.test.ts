import { describe, expect, it } from "vitest";

import { d20Initiative, d20TieBreak } from "../../rules/initiative";

import { ParticipantSide } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { PINNED_INITIATIVE } from "@/lib/utils/battle/turn/initiative-constants";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const roll = { ...DEFAULT_RULES, initiative: { ...DEFAULT_RULES.initiative, mode: "roll" as const } };

const hero = (abilities: Record<string, number>) => {
  const p = placed("h", { side: ParticipantSide.ALLY });

  return { ...p, abilities: { ...p.abilities, ...abilities } };
};

describe("d20Initiative", () => {
  it("static mode keeps the stored base", () => {
    expect(d20Initiative(hero({ baseInitiative: 12 }), { rules: DEFAULT_RULES, rng: () => 0.5 })).toEqual({ total: 12, roll: null, die: null });
  });

  it("roll mode: d20 + dexterity modifier + initiative bonus", () => {
    expect(d20Initiative(hero({ baseInitiative: 0, dexterity: 14, initiativeBonus: 1 }), { rules: roll, rng: () => 0.5 })).toEqual({ total: 11 + 2 + 1, roll: 11, die: 20 });
  });

  it("a pinned base stays static even in roll mode", () => {
    expect(d20Initiative(hero({ baseInitiative: PINNED_INITIATIVE }), { rules: roll, rng: () => 0.5 })).toMatchObject({ roll: null });
  });

  it("tie-break is dexterity", () => {
    expect(d20TieBreak(hero({ dexterity: 17 }))).toBe(17);
  });
});
