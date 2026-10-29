import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { validateAbilities } from "@/lib/utils/abilities/editor";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { castSpell } from "@/lib/utils/battle/spell";
import { expandChosen, needsOption, optionInRange } from "@/lib/utils/battle/spell/cast/state";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { SpellDefinitionSchema,type SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const slotted = (p: BattleParticipant): BattleParticipant => ({ ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } });

const caster = () => slotted(makeParticipant({ id: "c" }));

const ally = () => makeParticipant({ id: "a", hp: 10, maxHp: 100 });

const foe = () => makeParticipant({ id: "f", side: ParticipantSide.ENEMY });

const spellOf = (effects: SpellEffect[], over: Partial<CastableSpell["definition"]> = {}): CastableSpell => ({
  id: "sp",
  name: "Синтетичний вибір",
  level: 1,
  groupId: null,
  definition: { dice: 0, cost: "action", targeting: { kind: "ally" }, resolution: { kind: "auto" }, effects, raceModifiers: [], ...over },
});

const cast = (spell: CastableSpell, targetId: string, optionIndex?: number, diceRolls: number[] = []) => {
  const c = caster();

  const target = targetId === "a" ? ally() : foe();

  return castSpell({ caster: c, spell, targetIds: [targetId], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls, rng: seq(0.5), optionIndex });
};

const of = (r: { allParticipantsUpdated: BattleParticipant[] }, id: string) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id) as BattleParticipant;

const choose = spellOf([
  { kind: "chooseOne", options: [{ kind: "heal", amount: 7 }, { kind: "modifyStat", stat: "speed", flat: 10, duration: { rounds: 3 } }] },
]);

describe("chooseOne", () => {
  it("schema accepts 2..7 options and rejects one", () => {
    expect(SpellDefinitionSchema.safeParse(choose.definition).success).toBe(true);
    expect(SpellDefinitionSchema.safeParse({ ...choose.definition, effects: [{ kind: "chooseOne", options: [{ kind: "heal", amount: 1 }] }] }).success).toBe(false);
  });

  it("an ability cannot use chooseOne", () => {
    const ability = { id: "a1", name: "X", trigger: { event: "action" }, effects: [{ kind: "chooseOne", options: [{ kind: "heal", amount: 1 }, { kind: "heal", amount: 2 }] }] };

    expect(validateAbilities([ability]).ok).toBe(false);
  });

  it("index range check", () => {
    expect(needsOption(choose.definition.effects)).toBe(true);
    expect(optionInRange(choose.definition.effects, undefined)).toBe(false);
    expect(optionInRange(choose.definition.effects, 2)).toBe(false);
    expect(optionInRange(choose.definition.effects, 1)).toBe(true);
    expect(optionInRange([{ kind: "heal", amount: 1 }], undefined)).toBe(true);
  });

  it("expandChosen swaps only the chosen option in", () => {
    expect(expandChosen(choose.definition.effects, 1)).toEqual([choose.definition.effects[0].kind === "chooseOne" ? choose.definition.effects[0].options[1] : null]);
  });

  it("option 0 heals and leaves speed alone", () => {
    const r = cast(choose, "a", 0);

    expect(of(r, "a").combatStats.currentHp).toBe(17);
    expect(of(r, "a").battleData.activeEffects ?? []).toHaveLength(0);
  });

  it("option 1 buffs speed and does not heal", () => {
    const r = cast(choose, "a", 1);

    expect(of(r, "a").combatStats.currentHp).toBe(10);
    expect(of(r, "a").battleData.activeEffects).toHaveLength(1);
  });
});

describe("help", () => {
  it("gives the ally a one-attack advantage effect", () => {
    const r = cast(spellOf([{ kind: "help" }]), "a");

    const effects = of(r, "a").battleData.activeEffects ?? [];

    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ consumeOn: "ownAttack", abilityEffects: [{ kind: "flag", flag: "advantage", attackKind: "all" }] });
  });
});

describe("damageBonus spellRoll", () => {
  const reduce = spellOf([{ kind: "damageBonus", filter: { kind: "physical" }, flat: { spellRoll: -100 }, duration: { rounds: 5 } }], { dice: 1, dieSides: 4, targeting: { kind: "enemy" } });

  it("freezes the roll into a number on the effect", () => {
    const r = cast(reduce, "f", undefined, [3]);

    const effect = (of(r, "f").battleData.activeEffects ?? [])[0];

    expect(effect.abilityEffects).toEqual([{ kind: "damageBonus", filter: { kind: "physical" }, flat: -3 }]);
  });

  it("the target's later damage is reduced by 3", () => {
    const r = cast(reduce, "f", undefined, [3]);

    const mods = collectModifiers(r.allParticipantsUpdated, "f", { damage: { kind: "melee", school: null } });

    expect(mods.flat).toBe(-3);
  });

  it("schema rejects a zero roll", () => {
    expect(SpellDefinitionSchema.safeParse({ ...reduce.definition, effects: [{ kind: "damageBonus", filter: { kind: "all" }, flat: { spellRoll: 0 } }] }).success).toBe(false);
  });
});
