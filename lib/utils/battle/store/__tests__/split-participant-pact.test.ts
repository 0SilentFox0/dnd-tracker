import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";

describe("splitParticipant: слот пакту", () => {
  it("level переживає поділ і склеювання", () => {
    const base = createMockParticipant();

    const p = { ...base, spellcasting: { ...base.spellcasting, spellSlots: { "1": { max: 2, current: 1 }, pact: { level: 3, max: 2, current: 1 } } } };

    const back = joinParticipant(splitParticipant(p, { orderIndex: 0, isPending: false }), p.basicInfo.battleId);

    expect(back.spellcasting.spellSlots).toEqual(p.spellcasting.spellSlots);
  });
});
