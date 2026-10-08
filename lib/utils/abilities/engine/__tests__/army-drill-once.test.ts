import { describe, expect, it } from "vitest";

import { RACE_PASSIVES } from "@/data/library/race-passives";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { Ability } from "@/lib/utils/abilities/schema";

describe("Вишкіл війська", () => {
  it("дає +1 до моралі раз на сторону, а не на кожного юніта раси", () => {
    const drill = RACE_PASSIVES.humans.trait[0] as Ability;

    const ps = ["a", "b", "c"].map((id) => makeParticipant({ id, abilities: [resolved(drill, { type: "race", id: "humans" })] }));

    const { participants } = runAbilities(ps, { type: "battleStart" }, { round: 1, rng: seq(0.5) });

    for (const p of participants) expect(collectModifiers(participants, p.basicInfo.id, { stat: "morale" }).flat).toBe(1);
  });
});
