import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";

describe("spellSaveDc з базою кампанії", () => {
  const p = createMockParticipant();

  it("dcAbility використовує передану базу", () => {
    const prof = p.abilities.proficiencyBonus;

    const mod = p.abilities.modifiers.wisdom;

    expect(spellSaveDc(p, "wisdom", 8)).toBe(8 + prof + mod);
    expect(spellSaveDc(p, "wisdom", 10)).toBe(10 + prof + mod);
  });
});
