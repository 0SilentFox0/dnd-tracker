import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { grantPassive } from "@/lib/utils/battle/__tests__/mock-participant";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";

const target = (spellIds?: string[]) =>
  grantPassive(makeParticipant({ id: "t", side: ParticipantSide.ENEMY }), [{ kind: "flag", flag: "spellImmunity", ...(spellIds && { spellIds }) }]);

describe("spellImmunity без spellIds", () => {
  it("імунітет до будь-якого закляття", () => {
    const t = target();

    expect(participantImmuneToSpell(t, "any", [t])).toBe(true);
  });

  it("зі spellIds — лише до перелічених", () => {
    const t = target(["a"]);

    expect(participantImmuneToSpell(t, "a", [t])).toBe(true);
    expect(participantImmuneToSpell(t, "b", [t])).toBe(false);
  });
});
