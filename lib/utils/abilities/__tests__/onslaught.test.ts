import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "./fixtures";

import { onslaught } from "@/data/library/units/mages";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { withinLimits } from "@/lib/utils/abilities/engine/core/usage";

describe("Натиск", () => {
  const ability = resolved(onslaught, { type: "unit", id: "kshatriya" });

  const fire = (round: number, ps = [makeParticipant({ id: "a", abilities: [ability] })]) =>
    runAbilities(ps, { type: "bonusAction", actorId: "a", abilityKey: ability.key, targetIds: [] }, { round, rng: seq(0) });

  it("дає +2 до атаки і +3 до ініціативи", () => {
    const { participants } = fire(1);

    expect(collectModifiers(participants, "a", { stat: "attackBonus" }).flat).toBe(2);
    expect(collectModifiers(participants, "a", { stat: "initiative" }).flat).toBe(3);
  });

  it("перезарядка 3 раунди", () => {
    const { participants } = fire(1);

    const a = participants[0];

    expect([2, 3, 4].map((r) => withinLimits(a, ability, r))).toEqual([false, false, false]);
    expect(withinLimits(a, ability, 5)).toBe(true);
  });
});
