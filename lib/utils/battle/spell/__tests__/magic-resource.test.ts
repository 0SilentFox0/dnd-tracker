import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const spell = (resolution: CastableSpell["definition"]["resolution"]): CastableSpell => ({
  id: "sp",
  name: "Bolt",
  level: 1,
  groupId: "evo",
  definition: { dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution, effects: [], raceModifiers: [] },
});

const withSlots = (slots: Record<string, { max: number; current: number }>) => {
  const p = makeParticipant({ id: "c" });

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: slots } };
};

const target = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

const cast = (rules: typeof DEFAULT_RULES, caster: ReturnType<typeof withSlots>, resolution: CastableSpell["definition"]["resolution"], extra: object = {}) =>
  castSpell({ rules, caster, spell: spell(resolution), targetIds: ["e"], allParticipants: [caster, target], currentRound: 1, battleId: "b", diceRolls: [], saveRolls: [{ participantId: "e", roll: 20 }], rng: seq(0.5), ...extra });

describe("castSpell spends magic.resource", () => {
  it("d20 takes one slot of the spell level", () => {
    const r = cast(DEFAULT_RULES, withSlots({ "1": { max: 2, current: 2 } }), { kind: "auto" });

    expect(r.success).toBe(true);
    expect(r.casterUpdated.spellcasting.spellSlots["1"].current).toBe(1);
  });

  it("d20 refuses a cast without a free slot", () => {
    const r = cast(DEFAULT_RULES, withSlots({ "1": { max: 2, current: 0 } }), { kind: "auto" });

    expect(r.success).toBe(false);
  });

  it("a free DM cast spends nothing", () => {
    const r = cast(DEFAULT_RULES, withSlots({ "1": { max: 2, current: 1 } }), { kind: "auto" }, { isDMCast: true });

    expect(r.casterUpdated.spellcasting.spellSlots["1"].current).toBe(1);
  });
});

describe("a spell save in wfrp", () => {
  it("is an automatic failure: the system has no saving throws, whatever the preset roll", () => {
    const r = cast(WFRP_RULES, withSlots({}), { kind: "save", ability: "dexterity", onSuccess: "half" }, { isDMCast: true });

    expect(r.battleAction.actionDetails.savingThrows).toMatchObject([{ participantId: "e", result: "fail", autoFail: true }]);
  });
});
