import { describe, expect, it, vi } from "vitest";

import { noSaves } from "../none";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { castSpell } from "@/lib/utils/battle/spell";
import { finishTurnEffects } from "@/lib/utils/battle/turn/end-turn-cleanup";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const hooks = vi.hoisted(() => ({ roll: vi.fn(), rollEnds: vi.fn() }));

vi.mock("@/lib/utils/rules/systems", async (importOriginal) => {
  const { D6POOL_SYSTEM: base } = await import("@/lib/__tests__/fixtures/d6pool/definition");

  const { noSaves: none } = await import("../none");

  const system = { ...base, combat: { ...base.combat, saves: { ...none, roll: hooks.roll, rollEnds: hooks.rollEnds } } };

  return { ...(await importOriginal<object>()), ruleSystemOf: () => system, ruleSystemByKey: () => system };
});

const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const spell: CastableSpell = {
  id: "sp",
  name: "Fireball",
  level: 1,
  groupId: "evo",
  definition: { dice: 2, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [fire], raceModifiers: [], },
};

const failedSave = { roll: 1, rolls: [1], mod: 0, bonus: 0, total: 1, success: false, mode: "normal", autoFail: false };

describe("saves go through combat.saves, not through the d20 rules", () => {
  it("a spell save of a d6pool base is the hook's answer even when the preset roll would pass a d20 save", () => {
    hooks.roll.mockReturnValue(failedSave);

    const caster = makeParticipant({ id: "c" });

    const target = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

    const r = castSpell({ rules: DEFAULT_RULES, caster: { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } }, spell, targetIds: ["e"], allParticipants: [caster, target], currentRound: 1, battleId: "b", diceRolls: [3, 3], saveRolls: [{ participantId: "e", roll: 20 }], rng: seq(0.5) });

    expect(hooks.roll).toHaveBeenCalledTimes(1);
    expect(hooks.roll.mock.calls[0][0]).toMatchObject({ ability: "dexterity", presetRoll: 20, vsSpell: true });
    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "e")?.combatStats.currentHp).toBe(194);
  });

  it("end-of-turn saves of effects ask the hook", () => {
    const p = makeParticipant({ id: "t" });

    hooks.rollEnds.mockImplementation((participant) => ({ participant, messages: [] }));

    finishTurnEffects(p, { participants: [p], rules: DEFAULT_RULES, rng: seq(0.5) });

    expect(hooks.rollEnds).toHaveBeenCalledWith(p, [p], DEFAULT_RULES, expect.any(Function));
  });
});

describe("noSaves", () => {
  it("nobody may save and nothing ends by a save", () => {
    const p = makeParticipant({ id: "t" });

    const effect = makeEffect("held", { saveEnds: { ability: "wisdom", dc: 10 } });

    const held = { ...p, battleData: { ...p.battleData, activeEffects: [effect] } };

    expect(noSaves.roll({ target: p, ability: "wisdom", dc: 1, participants: [p], rules: DEFAULT_RULES, rng: seq(0.9), presetRoll: 20 })).toMatchObject({ success: false, autoFail: true });
    expect(noSaves.rollEnds(held, [held], DEFAULT_RULES, seq(0.9))).toEqual({ participant: held, messages: [] });
    expect(noSaves.evasion.has([p], p)).toBe(false);
  });
});
