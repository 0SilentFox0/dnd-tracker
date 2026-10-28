import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import { pushAway } from "@/lib/utils/battle/grid/push";
import { castSpell } from "@/lib/utils/battle/spell";
import { expandChosen, flatEffects, inputDiceOf } from "@/lib/utils/battle/spell/cast/state";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { SpellDefinitionSchema, type SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 40, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const caster = () => at({ ...makeParticipant({ id: "c" }), spellcasting: { ...makeParticipant({ id: "c" }).spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } }, { x: 0, y: 5 });

const foe = (x: number, over: Partial<BattleParticipant> = {}) => ({ ...at(makeParticipant({ id: "f", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }), { x, y: 5 }), ...over });

const RANGES = [
  { maxFeet: 10, dice: "5d6" },
  { maxFeet: 60, dice: "4d6" },
  { maxFeet: 120, dice: "3d6" },
];

const spellOf = (effects: SpellEffect[], over: Partial<CastableSpell["definition"]> = {}): CastableSpell => ({
  id: "sp",
  name: "Синтетичний",
  level: 1,
  groupId: null,
  definition: { dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects, raceModifiers: [], ...over },
});

// усі кубики = 3 (rng 0.4 на d6): сума = кількість кубиків × 3
const cast = (spell: CastableSpell, target: BattleParticipant, extra: Partial<Parameters<typeof castSpell>[0]> = {}) => {
  const c = caster();

  return castSpell({ caster: c, spell, targetIds: ["f"], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.4, map, ...extra });
};

const hpLost = (r: ReturnType<typeof castSpell>) => 200 - (r.allParticipantsUpdated.find((p) => p.basicInfo.id === "f")?.combatStats.currentHp ?? 0);

const byDistance = spellOf([{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "cold", byDistance: RANGES }]);

describe("dealDamage.byDistance", () => {
  it.each([
    [1, 15],
    [6, 12],
    [17, 9],
  ])("target at %i cells (%i dice x3)", (cells, damage) => {
    expect(hpLost(cast(byDistance, foe(cells)))).toBe(damage);
  });

  it("logs the distance and the band", () => {
    expect(cast(byDistance, foe(6)).messages.join(" ")).toContain("дистанція 30 фт → 4d6");
  });

  it("falls back to the first range without a map", () => {
    const r = cast(byDistance, foe(17), { map: undefined });

    expect(hpLost(r)).toBe(15);
    expect(r.messages.join(" ")).toContain("без мапи");
  });

  it("upcast adds dice to every range", () => {
    const up = spellOf(byDistance.definition.effects, { upcastDice: 1 });

    expect(hpLost(cast(up, foe(6), { castLevel: 3 }))).toBe(18);
  });

  it("schema: ascending maxFeet, multiples of 5", () => {
    const bad = (byDistance: unknown) => EffectSchema.safeParse({ kind: "dealDamage", amount: 1, byDistance }).success;

    expect(bad(RANGES)).toBe(true);
    expect(bad([...RANGES].reverse())).toBe(false);
    expect(bad([{ maxFeet: 7, dice: "1d6" }, { maxFeet: 20, dice: "1d6" }])).toBe(false);
    expect(bad([RANGES[0]])).toBe(false);
  });
});

describe("inputDice", () => {
  const effects: SpellEffect[] = [{ kind: "inputDice", label: "Висота", max: 20 }, { kind: "dealDamage", amount: { spellRoll: 100 } }];

  it("is a spell-only marker the engine never sees", () => {
    expect(SpellDefinitionSchema.safeParse({ dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects, raceModifiers: [] }).success).toBe(true);
    expect(inputDiceOf(effects)).toEqual({ label: "Висота", max: 20 });
    expect(expandChosen(effects)).toHaveLength(1);
    expect(flatEffects(effects)).toHaveLength(1);
  });

  it("an ability cannot use it", () => {
    expect(EffectSchema.safeParse(effects[0]).success).toBe(false);
  });
});

describe("pushAway / push effect", () => {
  it("moves away from the caster and stops before a wall", () => {
    const wall: BattleMapConfig = { ...map, terrain: { "5:5": { kind: "wall" } } };

    expect(pushAway(map, [], { x: 0, y: 5 }, foe(2), 2)).toEqual({ position: { x: 4, y: 5 }, steps: 2 });
    expect(pushAway(wall, [], { x: 0, y: 5 }, foe(2), 5)).toEqual({ position: { x: 4, y: 5 }, steps: 2 });
  });

  const push = spellOf([{ kind: "push", feet: 10, from: "caster" }]);

  it("pushes the target 10 ft", () => {
    const r = cast(push, foe(2));

    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "f")?.battleData.position).toEqual({ x: 4, y: 5 });
  });

  it("without a map it only logs", () => {
    const r = cast(push, foe(2), { map: undefined });

    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "f")?.battleData.position).toEqual({ x: 2, y: 5 });
    expect(r.messages.join(" ")).toContain("без мапи");
  });

  it("landing in a hazard hurts once per round", () => {
    const hazard: BattleMapConfig = { ...map, terrain: { "4:5": { kind: "hazard", label: "Вогонь", damage: { amount: 7, type: "fire" } } } };

    const first = cast(push, foe(2), { map: hazard });

    expect(hpLost(first)).toBe(7);

    const again = cast(push, at(first.allParticipantsUpdated.find((p) => p.basicInfo.id === "f") as BattleParticipant, { x: 2, y: 5 }), { map: hazard });

    expect(again.allParticipantsUpdated.find((p) => p.basicInfo.id === "f")?.combatStats.currentHp).toBe(193);
  });

  it("a saved target is not pushed", () => {
    const saved = spellOf([{ kind: "push", feet: 10, from: "caster" }], { resolution: { kind: "save", ability: "dexterity", onSuccess: "none" } });

    const r = cast(saved, foe(2), { saveRolls: [{ participantId: "f", roll: 20 }] });

    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "f")?.battleData.position).toEqual({ x: 2, y: 5 });
  });
});

describe("Plummet-like cast", () => {
  const plummet = spellOf(
    [{ kind: "inputDice", label: "Висота", max: 20 }, { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "bludgeoning" }, { kind: "applyCondition", condition: "prone", duration: { rounds: 1 } }],
    { dice: 1, resolution: { kind: "save", ability: "strength", onSuccess: "none" } },
  );

  const dice = { count: 4, sides: 6 };

  const prone = (r: ReturnType<typeof castSpell>) => JSON.stringify(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "f")?.battleData.activeEffects).includes("prone");

  it("a failed save deals the rolled dice and knocks prone", () => {
    const r = cast(plummet, foe(3), { diceRolls: [3, 3, 3, 3], dice, saveRolls: [{ participantId: "f", roll: 1 }] });

    expect(hpLost(r)).toBe(12);
    expect(prone(r)).toBe(true);
  });

  it("a successful save deals nothing", () => {
    const r = cast(plummet, foe(3), { diceRolls: [3, 3, 3, 3], dice, saveRolls: [{ participantId: "f", roll: 20 }] });

    expect(hpLost(r)).toBe(0);
    expect(prone(r)).toBe(false);
  });
});

describe("onlyIfAffected self effect (Control Animal)", () => {
  const control = spellOf(
    [{ kind: "applyCondition", condition: "charmed", duration: { rounds: 5 } }, { kind: "applyCondition", condition: "incapacitated", target: "self", onlyIfAffected: true, duration: { rounds: 5 } }],
    { resolution: { kind: "save", ability: "wisdom", onSuccess: "none" } },
  );

  const incapacitated = (r: ReturnType<typeof castSpell>) => JSON.stringify(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "c")?.battleData.activeEffects).includes("incapacitated");

  it("the caster is incapacitated when the target fails", () => {
    expect(incapacitated(cast(control, foe(3), { saveRolls: [{ participantId: "f", roll: 1 }] }))).toBe(true);
  });

  it("the caster is not when the target saves", () => {
    expect(incapacitated(cast(control, foe(3), { saveRolls: [{ participantId: "f", roll: 20 }] }))).toBe(false);
  });
});
