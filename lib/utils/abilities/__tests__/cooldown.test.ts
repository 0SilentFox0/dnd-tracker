import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { cooldownLeft, recordUse, withinLimits } from "@/lib/utils/abilities/engine/core/usage";
import type { ResolvedAbility } from "@/types/abilities";

const ability = { id: "a", key: "k", name: "Пікірування", trigger: { event: "action" }, limits: { cooldownRounds: 2 }, effects: [{ kind: "note", text: "x" }], source: { type: "unit", id: "u", name: "u" } } as unknown as ResolvedAbility;

describe("cooldownRounds", () => {
  it("недоступна 2 раунди після використання", () => {
    const used = recordUse(makeParticipant({ id: "g" }), ability.key, 1);

    expect(withinLimits(used, ability, 1)).toBe(false);
    expect(withinLimits(used, ability, 2)).toBe(false);
    expect(cooldownLeft(used, ability, 2)).toBe(2);
    expect(withinLimits(used, ability, 3)).toBe(false);
    expect(withinLimits(used, ability, 4)).toBe(true);
    expect(cooldownLeft(used, ability, 4)).toBe(0);
  });

  it("готова до першого використання", () => {
    expect(withinLimits(makeParticipant({ id: "g" }), ability, 1)).toBe(true);
  });
});
