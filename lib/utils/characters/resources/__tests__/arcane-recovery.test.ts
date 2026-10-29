import { describe, expect, it } from "vitest";

import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyArcaneRecovery, type ArcaneRecoveryOffer, arcaneRecoveryOffer } from "@/lib/utils/characters/resources/arcane-recovery";

const ability = resolved({ trigger: { event: "passive" }, effects: [{ kind: "restoreSpellSlotLevels", budget: { formula: "ceil(5 / 2)" }, maxSlotLevel: 5 }] }, { type: "class", id: "wizard" });

const wizard = (() => {
  const base = createMockParticipant();

  return {
    ...base,
    spellcasting: { ...base.spellcasting, spellSlots: { "1": { max: 4, current: 0 }, "2": { max: 3, current: 0 }, "3": { max: 2, current: 0 }, "6": { max: 1, current: 0 }, pact: { max: 1, current: 0, level: 1 } } },
    battleData: { ...base.battleData, resolvedAbilities: [ability] },
  };
})();

const spent = { "1": 4, "2": 3, "3": 2, "6": 1, pact: 1 };

const offer = arcaneRecoveryOffer(wizard, { slotsSpent: spent }) as ArcaneRecoveryOffer;

describe("arcaneRecoveryOffer", () => {
  it("budget from the formula, only slots up to the cap, no pact", () => {
    expect(offer.budget).toBe(3);
    expect(offer.maxSlotLevel).toBe(5);
    expect(offer.slots).toEqual([{ level: 1, spent: 4 }, { level: 2, spent: 3 }, { level: 3, spent: 2 }]);
    expect(offer.used).toBe(false);
  });

  it("null without the ability", () => {
    expect(arcaneRecoveryOffer({ ...wizard, battleData: { ...wizard.battleData, resolvedAbilities: [] } }, {})).toBeNull();
  });

  it("used once the day charge exists", () => {
    expect(arcaneRecoveryOffer(wizard, { slotsSpent: spent, charges: { [offer.key]: { used: 1, rest: "long" } } })?.used).toBe(true);
  });
});

describe("applyArcaneRecovery", () => {
  const r = { slotsSpent: spent };

  it("restores picked slots within the budget and marks the day", () => {
    const out = applyArcaneRecovery(r, offer, { "1": 1, "2": 1 });

    expect(out).toEqual({ ok: true, resources: { slotsSpent: { "1": 3, "2": 2, "3": 2, "6": 1, pact: 1 }, charges: { [offer.key]: { used: 1, rest: "long" } } } });
  });

  it("drops a level entry when nothing is spent any more", () => {
    const out = applyArcaneRecovery({ slotsSpent: { "3": 1 } }, offer, { "3": 1 });

    expect(out.ok && out.resources.slotsSpent).toEqual({});
  });

  it("rejects a total above the budget", () => {
    expect(applyArcaneRecovery(r, offer, { "2": 1, "1": 2 })).toEqual({ ok: false, reason: "budget" });
  });

  it("rejects level 6+ and unknown keys", () => {
    expect(applyArcaneRecovery(r, offer, { "6": 1 })).toEqual({ ok: false, reason: "level" });
    expect(applyArcaneRecovery(r, offer, { pact: 1 })).toEqual({ ok: false, reason: "level" });
  });

  it("rejects slots that are not spent", () => {
    expect(applyArcaneRecovery({ slotsSpent: { "1": 1 } }, offer, { "1": 2 })).toEqual({ ok: false, reason: "notSpent" });
    expect(applyArcaneRecovery({}, offer, { "1": 1 })).toEqual({ ok: false, reason: "notSpent" });
  });

  it("rejects a second use before the long rest", () => {
    expect(applyArcaneRecovery(r, { ...offer, used: true }, { "1": 1 })).toEqual({ ok: false, reason: "used" });
  });

  it("empty picks are rejected as nothing to restore", () => {
    expect(applyArcaneRecovery(r, offer, {})).toEqual({ ok: false, reason: "empty" });
  });
});
