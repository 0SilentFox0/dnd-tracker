import { describe, expect, it } from "vitest";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { spellBlockedBySlots } from "@/lib/utils/battle/flows/spell-flow";
import type { BattleParticipant } from "@/types/battle";

const caster = (sourceType: BattleParticipant["basicInfo"]["sourceType"], slots: Record<string, { current: number; max: number }>): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return {
    ...p,
    basicInfo: { ...p.basicInfo, sourceType },
    abilities: { ...p.abilities, damageModel: "5e" },
    spellcasting: { ...(p.spellcasting ?? {}), spellSlots: slots } as BattleParticipant["spellcasting"],
  };
};

describe("spellBlockedBySlots", () => {
  it("5e-монстр (юніт) з універсальним слотом може кастувати коло 1+", () => {
    const monster = caster(ParticipantSourceType.UNIT, { universal: { current: 2, max: 2 } });

    expect(spellBlockedBySlots(monster, 1, false)).toBe(false);
    expect(spellBlockedBySlots(monster, 3, false)).toBe(false);
  });

  it("5e-герой без слотів заблокований, зі слотом — ні; free і кантрип — ні", () => {
    const empty = caster(ParticipantSourceType.CHARACTER, { "1": { current: 0, max: 2 } });

    const full = caster(ParticipantSourceType.CHARACTER, { "1": { current: 1, max: 2 } });

    expect(spellBlockedBySlots(empty, 1, false)).toBe(true);
    expect(spellBlockedBySlots(full, 1, false)).toBe(false);
    expect(spellBlockedBySlots(empty, 1, true)).toBe(false);
    expect(spellBlockedBySlots(empty, 0, false)).toBe(false);
  });
});
