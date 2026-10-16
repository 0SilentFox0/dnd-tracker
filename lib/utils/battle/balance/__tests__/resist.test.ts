import { describe, expect, it } from "vitest";

import { SPELL_DAMAGE_KEY, unitResistances } from "../resist";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";

const aura = (target: "nearbyAllies" | "nearbyEnemies") =>
  resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: 20, target }] }, { id: "spell-res-aura" });

describe("unitResistances: аури в області", () => {
  it("власник рахує опір зони союзників, зона ворогів не додається", () => {
    expect(unitResistances(makeParticipant({ id: "u", abilities: [aura("nearbyAllies")] }))[SPELL_DAMAGE_KEY]).toBe(20);
    expect(unitResistances(makeParticipant({ id: "u", abilities: [aura("nearbyEnemies")] }))[SPELL_DAMAGE_KEY]).toBeUndefined();
  });
});
