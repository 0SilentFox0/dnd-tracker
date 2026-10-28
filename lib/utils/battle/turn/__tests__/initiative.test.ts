import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { calculateInitiative, sortByInitiative } from "@/lib/utils/battle/turn/initiative";
import { ALWAYS_FIRST_ABILITY } from "@/scripts/constructor/backfill/always-first";

const withBase = (id: string, baseInitiative: number, abilities = [] as ReturnType<typeof resolved>[]) => {
  const p = makeParticipant({ id, abilities });

  return { ...p, abilities: { ...p.abilities, baseInitiative, initiative: baseInitiative } };
};

describe("calculateInitiative", () => {
  it("does not special-case names any more", () => {
    const p = withBase("Файдаен", 12);

    expect(calculateInitiative(p)).toBe(12);
  });

  it("the always-first ability puts a participant first", () => {
    const first = bakePassives(withBase("a", 12, [resolved(ALWAYS_FIRST_ABILITY)]));

    const other = withBase("b", 20);

    expect(first.abilities.baseInitiative).toBe(1011);
    expect(sortByInitiative([other, first])[0].basicInfo.id).toBe("a");
  });
});
