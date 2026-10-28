import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import { cancelCritIfImmune } from "@/lib/utils/battle/attack/crit-immunity";

const adamantine = resolved({ id: "crit", name: "Adamantine", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "critImmunity" }] }, { type: "artifact", id: "pl+ad" });

const crit = { isCritical: true, criticalEffect: { id: "x" } };

describe("critImmunity", () => {
  it("a crit against the owner becomes a normal hit without a critical effect", () => {
    const ps = [makeParticipant({ id: "a" }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [adamantine] })];

    expect(cancelCritIfImmune(crit, ps, "t")).toEqual({ roll: { isCritical: false, criticalEffect: undefined }, cancelled: true });
    expect(cancelCritIfImmune(crit, ps, "a")).toEqual({ roll: crit, cancelled: false });
    expect(cancelCritIfImmune({ isCritical: false }, ps, "t")).toEqual({ roll: { isCritical: false }, cancelled: false });
  });

  it("schema accepts the flag", () => {
    expect(EffectSchema.safeParse({ kind: "flag", flag: "critImmunity" }).success).toBe(true);
  });
});
