import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "./fixtures";

import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";

const bonusAction = (key: string) => ({ type: "bonusAction", actorId: "a", abilityKey: key, targetIds: ["t"] }) as AbilityEvent;

const timedMorale = (flat: number) =>
  resolved({ trigger: { event: "bonusAction" }, effects: [{ kind: "modifyStat", stat: "morale", flat, duration: { rounds: 2 }, target: "eventTarget" }] });

describe("timed morale", () => {
  it("needs a duration in a bonus action", () => {
    const base = { id: "a", name: "Клич", trigger: { event: "bonusAction" } };

    const bad = AbilitySchema.safeParse({ ...base, effects: [{ kind: "modifyStat", stat: "morale", flat: 1 }] });

    expect(bad.success).toBe(false);
    expect(JSON.stringify(bad.error?.issues)).toContain("Тимчасова мораль потребує duration");
  });

  it("negative timed morale respects fear immunity", () => {
    const ability = timedMorale(-1);

    const immune = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["fear"] }] }, { id: "i" });

    const run = (target: ReturnType<typeof makeParticipant>) =>
      runAbilities([makeParticipant({ id: "a", abilities: [ability] }), target], bonusAction(ability.key), { round: 1, rng: seq(0) });

    const hit = run(makeParticipant({ id: "t" }));

    expect(hit.participants[1].battleData.activeEffects).toHaveLength(1);

    const blocked = run(makeParticipant({ id: "t", abilities: [immune] }));

    expect(blocked.participants[1].battleData.activeEffects).toHaveLength(0);
    expect(blocked.messages.join()).toContain("імунітет");
  });
});
