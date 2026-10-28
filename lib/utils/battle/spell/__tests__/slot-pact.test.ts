import { describe, expect, it } from "vitest";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { spellSlotKey } from "@/lib/utils/battle/spell/slot";
import type { BattleParticipant } from "@/types/battle";

const caster = (spellSlots: BattleParticipant["spellcasting"]["spellSlots"], sourceType: BattleParticipant["basicInfo"]["sourceType"] = ParticipantSourceType.CHARACTER): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, sourceType }, spellcasting: { ...base.spellcasting, spellSlots } };
};

describe("spellSlotKey: слот пакту", () => {
  it("звичайний слот є — коло", () => {
    expect(spellSlotKey(caster({ "2": { max: 1, current: 1 }, pact: { level: 3, max: 2, current: 2 } }), 2)).toBe("2");
  });

  it("звичайного немає, пакт рівня 3 ≥ 2 — pact", () => {
    expect(spellSlotKey(caster({ "2": { max: 1, current: 0 }, pact: { level: 3, max: 2, current: 2 } }), 2)).toBe("pact");
    expect(spellSlotKey(caster({ pact: { level: 3, max: 2, current: 2 } }), 2)).toBe("pact");
  });

  it("пакт нижчого кола або вичерпаний — коло", () => {
    expect(spellSlotKey(caster({ pact: { level: 1, max: 2, current: 2 } }), 2)).toBe("2");
    expect(spellSlotKey(caster({ pact: { level: 3, max: 2, current: 0 } }), 2)).toBe("2");
  });

  it("юніт — universal; герой без pact — коло", () => {
    expect(spellSlotKey(caster({ universal: { max: 3, current: 3 } }, ParticipantSourceType.UNIT), 2)).toBe("universal");
    expect(spellSlotKey(caster({ "2": { max: 1, current: 0 } }), 2)).toBe("2");
  });
});
