import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";

describe("лікування союзників", () => {
  it("у повідомленні видно, чиє вміння лікує", () => {
    const lifeForce = resolved({ name: "Сила життя", trigger: { event: "roundStart" }, effects: [{ kind: "heal", amount: { value: 3, percentOf: "maxHp" }, target: "allAllies" }] });

    const ivan = makeParticipant({ id: "Айвен", abilities: [lifeForce] });

    const agrail = makeParticipant({ id: "Аграїл", hp: 10, maxHp: 171 });

    const r = runAbilities([ivan, agrail], { type: "roundStart" }, { round: 2, rng: seq(0) });

    expect(r.messages).toContain("💚 Сила життя (Айвен): Аграїл +5 HP");
  });
});
