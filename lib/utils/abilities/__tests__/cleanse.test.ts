import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "./fixtures";

import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { AbilityEvent } from "@/types/abilities";
import type { ActiveEffect } from "@/types/battle";

const fx = (id: string, type: ActiveEffect["type"]): ActiveEffect => ({ id, name: id, type, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [] });

const cleanse = (includeConditions?: boolean) => {
  const ability = resolved({ trigger: { event: "bonusAction" }, effects: [{ kind: "cleanse", includeConditions }] });

  const base = makeParticipant({ id: "a", abilities: [ability] });

  const p = { ...base, battleData: { ...base.battleData, activeEffects: [fx("d", "debuff"), fx("c", "condition"), fx("b", "buff")] } };

  const event = { type: "bonusAction", actorId: "a", abilityKey: ability.key } as AbilityEvent;

  return runAbilities([p], event, { round: 1, rng: seq(0) });
};

describe("cleanse", () => {
  it("by default removes only debuffs", () => {
    expect(cleanse().participants[0].battleData.activeEffects.map((e) => e.id)).toEqual(["c", "b"]);
  });

  it("includeConditions also removes conditions", () => {
    const r = cleanse(true);

    expect(r.participants[0].battleData.activeEffects.map((e) => e.id)).toEqual(["b"]);
    expect(r.messages.join()).toContain("знято дебафи та стани");
  });
});
