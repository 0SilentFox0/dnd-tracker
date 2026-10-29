import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { statblockOf } from "@/lib/utils/battle/view";

describe("statblockOf", () => {
  it("null без жодного поля статблока", () => {
    const p = createMockParticipant();

    expect(statblockOf({ ...p, abilities: { ...p.abilities, creatureType: undefined }, battleData: { ...p.battleData, senses: undefined, movement: undefined, languages: undefined, telepathy: undefined } })).toBeNull();
  });

  it("збирає поля, телепатія 0 рахується", () => {
    const p = createMockParticipant();

    expect(statblockOf({ ...p, abilities: { ...p.abilities, creatureType: "fiend" }, battleData: { ...p.battleData, telepathy: 0 } })).toMatchObject({ creatureType: "fiend", telepathy: 0 });
  });
});
