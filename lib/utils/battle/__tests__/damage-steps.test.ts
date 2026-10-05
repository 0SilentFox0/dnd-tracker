import { describe, expect, it } from "vitest";

import { createMockParticipant } from "./mock-participant";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage/breakdown";
import { calculateDamageWithModifiersImpl } from "@/lib/utils/battle/damage/impl";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { type BattleSpell, processSpell } from "@/lib/utils/battle/spell";
import { battleActionToEvent, eventToBattleAction } from "@/lib/utils/battle/store";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const passive = (key: string, name: string, effects: ResolvedAbility["effects"]): ResolvedAbility =>
  ({ key, name, trigger: { event: "passive" }, effects, source: { type: "skill", id: key, name, icon: `/icons/${key}.png` } }) as ResolvedAbility;

function withAbilities(id: string, side: ParticipantSide, abilities: ResolvedAbility[]): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, side, sourceType: "unit" },
    battleData: { ...base.battleData, resolvedAbilities: abilities },
  };
}

const attacker = withAbilities("a", ParticipantSide.ALLY, [
  passive("expert-attack", "Експертна атака", [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 25 }] as ResolvedAbility["effects"]),
]);

const target = withAbilities("t", ParticipantSide.ENEMY, [
  passive("expert-defense", "Експертний захист", [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 20 }] as ResolvedAbility["effects"]),
]);

describe("кроки шкоди", () => {
  it("атакувальник: кубики → характеристика → % з умінь, after останнього = totalDamage", () => {
    const r = calculateDamageWithModifiersImpl(attacker, 6, 3, AttackType.MELEE, { allParticipants: [attacker, target] });

    expect(r.steps.map((s) => [s.kind, s.label, s.value])).toEqual([
      ["dice", "Кубики", 6],
      ["flat", "Сила", 3],
      ["percent", "Експертна атака", 25],
    ]);
    expect(r.steps.at(-1)?.after).toBe(r.totalDamage);
    expect(r.steps[2].icon).toBe("/icons/expert-attack.png");
    expect(r.steps.every((s) => s.side === "attacker")).toBe(true);
  });

  it("ціль: опір із назвою джерела; імунітет — один крок до 0", () => {
    const r = applyResistance(target, 11, "slashing", { participants: [attacker, target] });

    expect(r.finalDamage).toBe(8);
    expect(r.steps).toEqual([{ label: "Експертний захист", side: "target", kind: "percent", value: -20, after: 8, icon: "/icons/expert-defense.png" }]);

    const immune = withAbilities("i", ParticipantSide.ENEMY, [
      passive("stone", "Кам'яна шкіра", [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 100 }] as ResolvedAbility["effects"]),
    ]);

    expect(applyResistance(immune, 11, "slashing").steps).toEqual([
      { label: "Кам'яна шкіра", side: "target", kind: "immunity", value: -100, after: 0, icon: "/icons/stone.png" },
    ]);
  });

  it("computeDamageBreakdown повертає кроки обох сторін, останній after = finalDamage", () => {
    const attack = { name: "Рапіра", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

    const r = computeDamageBreakdown({ attacker, target, attack, damageRolls: [6], allParticipants: [attacker, target] });

    expect(r.steps.some((s) => s.side === "target" && s.label === "Експертний захист")).toBe(true);
    expect(r.steps.at(-1)?.after).toBe(r.finalDamage);
  });

  it("damageSteps переживають запис у подію і читання назад", () => {
    const action = {
      id: "x", battleId: "b1", round: 1, actionIndex: 3, timestamp: new Date(), actorId: "a", actorName: "A", actorSide: "ally",
      actionType: "attack", targets: [], resultText: "",
      actionDetails: { damageSteps: { t: [{ label: "Кубики", side: "attacker", kind: "dice", value: 6, after: 6 }] } },
    } as unknown as BattleAction;

    const back = eventToBattleAction({ ...battleActionToEvent(action), seq: 3 } as never, "b1");

    expect(back.actionDetails.damageSteps?.t[0].label).toBe("Кубики");
  });
});

describe("кроки шкоди в подіях", () => {
  const wall = (id: string, damageType: string, percent: number, side = ParticipantSide.ENEMY) =>
    makeParticipant({ id, side, hp: 50, maxHp: 50, abilities: [resolved({ name: "Кам'яна шкіра", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType, percent }] })] });

  it("атака: damageSteps[ціль] містить опір цілі з назвою", () => {
    const sword = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

    const a = makeParticipant({ id: "a" });

    const t = wall("e", "physical", 50);

    const r = processAttack({ attacker: { ...a, battleData: { ...a.battleData, attacks: [sword] } }, target: t, attack: sword, d20Roll: 15, damageRolls: [4], allParticipants: [a, t], currentRound: 1, battleId: "b1", rng: seq(0) });

    const steps = r.battleAction.actionDetails.damageSteps?.e ?? [];

    expect(steps.some((s) => s.side === "target" && s.label === "Кам'яна шкіра" && s.value === -50)).toBe(true);
    expect(steps.at(-1)?.after).toBe(r.damage?.finalDamage);
  });

  it("спел: damageSteps[ціль] містить опір цілі", () => {
    const c = makeParticipant({ id: "c" });

    const caster = { ...c, spellcasting: { ...c.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

    const t = wall("e", "fire", 50);

    const spell = { id: "s1", name: "Вогняна стріла", level: 1, type: "target", target: "enemies", damageType: "damage", damageElement: "fire", diceCount: 1, diceType: "d10", savingThrow: null, description: "" } as unknown as BattleSpell;

    const r = processSpell({ caster, spell, targetIds: ["e"], allParticipants: [caster, t], currentRound: 1, battleId: "b1", damageRolls: [8], rng: seq(0) });

    expect(r.battleAction.actionDetails.damageSteps?.e?.[0]).toMatchObject({ side: "target", label: "Кам'яна шкіра", value: -50 });
  });
});
