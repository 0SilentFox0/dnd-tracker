import { describe, expect, it } from "vitest";

import { AttackType, EffectMarker, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { CunningStrikeEffect } from "@/lib/utils/abilities/schema";
import { calculateAttackRoll } from "@/lib/utils/battle/attack";
import { cunningStrikeCost, cunningStrikeOffer, toggleCunningStrike } from "@/lib/utils/battle/attack/cunning-strike";
import { resolveHit } from "@/lib/utils/battle/attack/process/hit";
import { validateAttackRequest } from "@/lib/utils/battle/attack-phase/request";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import { REJECT } from "@/lib/utils/battle/store/reject";
import { forgoDice } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const SWORD: BattleAttack = { id: "s", name: "Кинджал", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d4", damageType: "piercing" };

const sneak = (dice = "3d6") => resolved({ id: "sa", trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1 }, params: { sneakAttack: true }, effects: [{ kind: "dealDamage", amount: dice, target: "eventTarget" }] }, { type: "class", id: "rogue" });

const cunning = (params: object = { options: [{ effect: "poison", dice: 1 }, { effect: "trip", dice: 1 }, { effect: "withdraw", dice: 1 }] }) =>
  resolved({ id: "cs", trigger: { event: "passive" }, params: { cunningStrike: params }, effects: [{ kind: "note", text: "Cunning Strike" }] }, { type: "class", id: "rogue" });

function rogue(abilities = [sneak(), cunning()]): BattleParticipant {
  const base = makeParticipant({ id: "r", abilities });

  return { ...base, abilities: { ...base.abilities, proficiencyBonus: 3, modifiers: { ...base.abilities.modifiers, dexterity: 3 } }, battleData: { ...base.battleData, attacks: [SWORD] } };
}

function foe(conMod: number, dexMod = conMod): BattleParticipant {
  const base = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

  return { ...base, abilities: { ...base.abilities, modifiers: { ...base.abilities.modifiers, constitution: conMod, dexterity: dexMod } } };
}

function strike(ps: BattleParticipant[], cunningStrike?: CunningStrikeEffect[]) {
  const flow = { ps, messages: [] as string[], summons: [], ctx: { round: 1, rng: seq(0.5) } };

  resolveHit({ flow, attackerId: "r", targetId: "t", attack: SWORD, damageRolls: [1], attackRoll: calculateAttackRoll(ps[0], SWORD, 15), currentRound: 1, battleId: "b", cunningStrike });

  const get = (id: string) => flow.ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

  return { flow, rogue: get("r"), target: get("t"), lost: 100 - get("t").combatStats.currentHp };
}

describe("forgoDice", () => {
  it("знімає кубики з першої групи, до нуля — 0", () => {
    expect(forgoDice("3d6", 1)).toBe("2d6");
    expect(forgoDice("3d6+2", 2)).toBe("1d6+2");
    expect(forgoDice("1d6", 1)).toBe(0);
    expect(forgoDice(5, 1)).toBe(5);
  });
});

describe("Підступний удар: пропозиція й вартість", () => {
  it("пропозиція лише з Прихованою атакою, Підступним ударом і невикористаним ходом", () => {
    expect(cunningStrikeOffer(rogue(), 1)).toMatchObject({ maxEffects: 1, sneakDice: 3, options: expect.any(Array) });
    expect(cunningStrikeOffer(rogue([sneak()]), 1)).toBeNull();
    expect(cunningStrikeOffer(rogue([cunning()]), 1)).toBeNull();

    const spent = { ...rogue(), battleData: { ...rogue().battleData, abilityUsage: { "class:rogue:sa": { battle: 1, round: 1, turn: 1 } } } };

    expect(cunningStrikeOffer(spent, 1)).toBeNull();
  });

  it("Покращений Підступний удар додає другий ефект", () => {
    const offer = cunningStrikeOffer(rogue([sneak(), cunning(), { ...cunning({ maxEffects: 2 }), id: "ics", key: "class:rogue:ics" }]), 1);

    expect(offer?.maxEffects).toBe(2);
    expect(cunningStrikeCost(offer, ["poison", "trip"])).toBe(2);
    expect(cunningStrikeCost(offer, ["poison", "poison"])).toEqual(expect.objectContaining({ message: expect.stringContaining("battleLog.reject.cunning") }));
  });

  it("один ефект за замовчуванням, вартість не більша за кубики", () => {
    const offer = cunningStrikeOffer(rogue(), 1);

    expect(cunningStrikeCost(offer, ["trip"])).toBe(1);
    expect(cunningStrikeCost(offer, ["trip", "poison"])).toEqual(expect.objectContaining({ message: expect.stringContaining("battleLog.reject.cunning") }));
    expect(cunningStrikeCost(cunningStrikeOffer(rogue([sneak("1d6"), cunning({ options: [{ effect: "trip", dice: 2 }] })]), 1), ["trip"])).toEqual(expect.objectContaining({ message: expect.stringContaining("battleLog.reject.cunning") }));
    expect(cunningStrikeCost(offer, ["poison"])).toBe(1);
    expect(cunningStrikeCost(cunningStrikeOffer(rogue([sneak(), cunning({ options: [{ effect: "trip", dice: 1 }] })]), 1), ["poison"])).toEqual(expect.objectContaining({ message: expect.stringContaining("battleLog.reject.cunning") }));
  });

  it("перемикач: один ефект замінюється, два — додаються до ліміту", () => {
    const one = cunningStrikeOffer(rogue(), 1) as NonNullable<ReturnType<typeof cunningStrikeOffer>>;

    expect(toggleCunningStrike(["trip"], "poison", one)).toEqual(["poison"]);
    expect(toggleCunningStrike(["poison"], "poison", one)).toEqual([]);

    const two = { ...one, maxEffects: 2 };

    expect(toggleCunningStrike(["trip"], "poison", two)).toEqual(["trip", "poison"]);
    expect(toggleCunningStrike(["trip", "poison"], "withdraw", two)).toEqual(["trip", "poison"]);
  });

  it("запит без Підступного удару відхиляється", () => {
    const attacker = rogue([sneak()]);

    const scope = { userId: "u", isDM: true, participants: [attacker, foe(0)], scene: { turnIndex: 0 } };

    expect(() => validateAttackRequest(scope, { attackerId: "r", targetId: "t", d20Roll: 15, damageRolls: [1], cunningStrike: ["trip"] })).toThrow(REJECT.cunningUnavailable);
    expect(() => validateAttackRequest({ ...scope, participants: [rogue(), foe(0)] }, { attackerId: "r", targetId: "t", d20Roll: 15, damageRolls: [1], cunningStrike: ["trip"] })).not.toThrow();
  });
});

describe("Підступний удар у влучанні", () => {
  it("віднімає кубик Прихованої атаки (вартість 1)", () => {
    const plain = strike([rogue(), foe(10)]);

    const paid = strike([rogue(), foe(10)], ["trip"]);

    expect(plain.lost - paid.lost).toBe(4);
  });

  it("отрута: СК = 8 + DEX + майстерність; провал — poisoned зі збереженням щоходу", () => {
    const failed = strike([rogue(), foe(-5)], ["poison"]);

    expect(textsOf(failed.flow.messages).join("\n")).toContain("СК 14");
    expect(hasEffectMarker(failed.target, "poisoned")).toBe(true);
    expect(failed.target.battleData.activeEffects.some((e) => e.saveEnds?.dc === 14)).toBe(true);
    expect(hasEffectMarker(strike([rogue(), foe(10)], ["poison"]).target, "poisoned")).toBe(false);
  });

  it("підніжка: провал DEX-кидка валить ціль", () => {
    expect(hasEffectMarker(strike([rogue(), foe(10, -5)], ["trip"]).target, "prone")).toBe(true);
    expect(hasEffectMarker(strike([rogue(), foe(-5, 10)], ["trip"]).target, "prone")).toBe(false);
  });

  it("відхід: атакувальник уникає атак можливості", () => {
    const r = strike([rogue(), foe(10)], ["withdraw"]);

    expect(hasEffectMarker(r.rogue, EffectMarker.DISENGAGED)).toBe(true);
    expect(hasEffectMarker(r.target, "prone")).toBe(false);
  });

  it("без нього влучання не змінюється, а Прихована атака вже використана — ефекту й вартості нема", () => {
    const spent = { ...rogue(), battleData: { ...rogue().battleData, abilityUsage: { "class:rogue:sa": { battle: 1, round: 1, turn: 1 } } } };

    const r = strike([spent, foe(-5, -5)], ["poison"]);

    expect(hasEffectMarker(r.target, "poisoned")).toBe(false);
    expect(r.lost).toBe(strike([spent, foe(-5)]).lost);
  });
});
