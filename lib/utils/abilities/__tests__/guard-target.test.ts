import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { AbilityEvent } from "@/types/abilities";

const guard = resolved({ trigger: { event: "bonusAction" }, effects: [{ kind: "guard", percent: 50, duration: { rounds: 2 }, target: "eventTarget" }] });

const cast = (targetId: string, others = [makeParticipant({ id: "ally" }), makeParticipant({ id: "foe", side: ParticipantSide.ENEMY })]) =>
  runAbilities([makeParticipant({ id: "g", abilities: [guard] }), ...others], { type: "bonusAction", actorId: "g", abilityKey: guard.key, targetId } as AbilityEvent, { round: 1, rng: seq(0) });

const guardsOn = (r: ReturnType<typeof cast>, id: string) => r.participants.find((p) => p.basicInfo.id === id)?.battleData.activeEffects.filter((e) => e.abilityKey === "guard").length;

describe("guard targets", () => {
  it("guards a same-side ally", () => {
    expect(guardsOn(cast("ally"), "ally")).toBe(1);
  });

  it("refuses the guardian themselves and enemies", () => {
    const self = cast("g");

    expect(guardsOn(self, "g")).toBe(0);
    expect(self.messages.join()).toContain("⛔");
    expect(guardsOn(cast("foe"), "foe")).toBe(0);
  });
});
