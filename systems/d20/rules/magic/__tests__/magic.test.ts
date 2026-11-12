import { describe, expect, it } from "vitest";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const caster = (slots: Record<string, { max: number; current: number; level?: number }>, sourceType?: string): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return { ...p, basicInfo: { ...p.basicInfo, ...(sourceType && { sourceType: sourceType as never }) }, spellcasting: { ...p.spellcasting, spellSlots: slots } };
};

const { magic } = ruleSystemOf(DEFAULT_RULES);

const resource = magic.resource as NonNullable<typeof magic.resource>;

describe("d20 magic.resource", () => {
  it("cantrips pass and spend nothing", () => {
    const p = caster({});

    expect(resource.canCast(p, { level: 0 })).toEqual({ ok: true });
    expect(resource.spend(p, { level: 0 })).toBe(p);
  });

  it("the default slot must exist and be non-empty", () => {
    expect(resource.canCast(caster({ "1": { max: 2, current: 1 } }), { level: 1 })).toEqual({ ok: true });
    expect(resource.canCast(caster({ "1": { max: 2, current: 0 } }), { level: 1 })).toMatchObject({ ok: false });
    expect(resource.canCast(caster({}), { level: 1 })).toMatchObject({ ok: false });
  });

  it("an explicit slot raises the cast level and is checked against the spell level", () => {
    expect(resource.canCast(caster({ "3": { max: 1, current: 1 } }), { level: 1, slotKey: "3" })).toEqual({ ok: true, castLevel: 3 });
    expect(resource.canCast(caster({ "1": { max: 1, current: 1 } }), { level: 2, slotKey: "1" })).toMatchObject({ ok: false });
  });

  it("falls back to the pact slot once the circle slot is empty", () => {
    const p = caster({ "2": { max: 1, current: 0 }, pact: { level: 3, max: 2, current: 2 } });

    expect(resource.canCast(p, { level: 2 })).toEqual({ ok: true });
    expect(resource.spend(p, { level: 2 }).spellcasting.spellSlots.pact.current).toBe(1);
  });

  it("a unit spends the universal slot", () => {
    const p = caster({ universal: { max: 3, current: 3 } }, ParticipantSourceType.UNIT);

    expect(resource.spend(p, { level: 2 }).spellcasting.spellSlots.universal.current).toBe(2);
  });

  it("spend takes exactly one from the chosen slot", () => {
    const p = caster({ "1": { max: 2, current: 2 }, "2": { max: 2, current: 2 } });

    const after = resource.spend(p, { level: 1, slotKey: "2" }).spellcasting.spellSlots;

    expect(after["2"].current).toBe(1);
    expect(after["1"].current).toBe(2);
  });
});

describe("magic.saveDc and magic.upcast", () => {
  it("d20 derives the DC from the caster, an explicit ability overrides the stored one", () => {
    const p = caster({});

    const stored = p.spellcasting.spellSaveDC;

    expect(magic.saveDc(p, undefined, 8)).toBe(stored ?? magic.saveDc(p, "intelligence", 8));
    expect(magic.saveDc(p, "wisdom", 8)).toBe(8 + p.abilities.proficiencyBonus + p.abilities.modifiers.wisdom);
  });

  it("d20 counts steps above the spell level", () => {
    expect(magic.upcast.steps(1, 3)).toBe(2);
    expect(magic.upcast.steps(3, 1)).toBe(0);
  });

  it("wfrp has no resource and overcast raises the cast level", () => {
    const wfrp = ruleSystemOf(WFRP_RULES).magic;

    expect(wfrp.resource).toBeUndefined();
    expect(wfrp.upcast.steps(1, 5)).toBe(4);
    expect(wfrp.tested).toBeDefined();
  });
});

describe("magic.sustain", () => {
  const rulesOn = { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null } };

  it("d20 holds a concentration spell only while the rule is on", () => {
    expect(magic.sustain.holds(rulesOn, { concentration: true })).toBe(true);
    expect(magic.sustain.holds(rulesOn, {})).toBe(false);
    expect(magic.sustain.holds({ ...DEFAULT_RULES, concentration: { enabled: false, dcCap: null } }, { concentration: true })).toBe(false);
  });

  it("begin marks the caster, drop clears it with the bound effects", () => {
    const p = caster({});

    const begun = magic.sustain.begin([p], "c", "c:sp@1#0", "Spell", 3, 1);

    expect(magic.sustain.holding(begun.participants[0])).toBe(true);
    expect(magic.sustain.holding(magic.sustain.drop(begun.participants, "c", "").participants[0])).toBe(false);
  });

  it("wfrp holds nothing and leaves the participants untouched", () => {
    const { sustain } = ruleSystemOf(WFRP_RULES).magic;

    const ps = [caster({})];

    expect(sustain.holds(WFRP_RULES, { concentration: true })).toBe(false);
    expect(sustain.begin(ps, "c", "x", "Spell", 3).participants).toBe(ps);
    expect(sustain.drop(ps, "c", "").participants).toBe(ps);
    expect(sustain.dropOrphaned(ps).participants).toBe(ps);
    expect(sustain.tag(ps, ps, { casterId: "c", castId: "x" }, "a")).toBe(ps);
  });
});
