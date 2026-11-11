import { describe, expect, it } from "vitest";

import { AttackType, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { settleStatusChange } from "@/lib/utils/battle/damage/consequences";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_CHARACTERISTICS, ruleSystemOf } from "@/lib/utils/rules/systems";
import { attackOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { armourAp } from "@/systems/wfrp/rules/equipment";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

interface Over {
  s?: number;
  t?: number;
  hp?: number;
  ap?: number;
}

const fighter = (id: string, side: ParticipantSide, { s = 30, t = 30, hp = 20, ap = 0 }: Over = {}): BattleParticipant => {
  const p = makeParticipant({ id, side, hp, maxHp: 20 });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40, s, t } };

  const fields = wfrpAbilitiesOf(characteristics, { ap: { head: ap, arm: ap, body: ap, leg: ap } });

  return { ...p, abilities: { ...p.abilities, ...fields }, battleData: { ...p.battleData, attacks: [sword] } };
};

function strike(roll: number, defenderRoll: number, over: { attacker?: Over; target?: Over | BattleParticipant } = {}) {
  const attacker = fighter("a", ParticipantSide.ALLY, over.attacker);

  const t = over.target;

  const target = t && "basicInfo" in t ? t : fighter("t", ParticipantSide.ENEMY, t);

  return processAttack({
    attacker,
    target,
    attack: sword,
    d20Roll: roll,
    damageRolls: [4],
    allParticipants: [attacker, target],
    currentRound: 1,
    battleId: "b",
    rng: seq((defenderRoll - 0.5) / 100),
    rules: WFRP_RULES,
  });
}

const crits = (p: BattleParticipant) => p.battleData.activeEffects.filter((e) => e.name.startsWith("crit.wfrp."));

const logOf = (r: ReturnType<typeof strike>) => JSON.stringify(r.battleAction);

const critLines = (r: ReturnType<typeof strike>) => (logOf(r).match(/battleWfrp\.log\.crit(?:Hit|Wound)/g) ?? []).length;

describe("WFRP damage", () => {
  it("weapon + SB + net SL - TB - AP", () => {
    const r = strike(30, 80, { target: { ap: 2 } });

    expect(attackOf(r.attackRoll)).toMatchObject({ netSl: 5, location: "head", doubles: false });
    expect(r.targetUpdated.combatStats.currentHp).toBe(20 - (4 + 3 + 5 - 3 - 2));
    expect(r.battleAction.actionDetails.damageSteps?.t.map((s) => s.value)).toEqual([4, 3, 5, -3, -2]);
  });

  it("armour and shield from equipment feed the ap step", () => {
    const layer = { type: "armour", locations: { head: 0, arm: 0, body: 2, leg: 0 }, kind: "mail", qualities: [], weight: 1, price: 1 };

    const shield = { type: "gear", weight: 1, price: 1, qualities: [{ key: "shield", value: 1 }] };

    const gear = armourAp([{ slot: "armor", systemStats: layer }, { slot: "shield", systemStats: shield }]);

    const base = fighter("t", ParticipantSide.ENEMY);

    const target = { ...base, abilities: { ...base.abilities, ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, gear) } };

    const r = strike(30, 80, { target });

    expect(attackOf(r.attackRoll)?.location).toBe("head");
    expect(r.battleAction.actionDetails.damageSteps?.t.map((s) => s.value)).toEqual([4, 3, attackOf(r.attackRoll)?.netSl, -3, -1]);
  });

  it("labels and sides come from the system contract", () => {
    const r = strike(30, 80, { target: { ap: 2 } });

    const steps = r.battleAction.actionDetails.damageSteps?.t ?? [];

    expect(steps.map((s) => s.label)).toEqual(["weapon", "sb", "netSl", "tb", "ap"].map((k) => dynamicTextRef(`battleWfrp.damage.steps.${k}`)));
    expect(steps.map((s) => s.side)).toEqual(["attacker", "attacker", "attacker", "target", "target"]);
    expect(JSON.stringify(r.battleAction)).toContain("battleWfrp.damage.total");
  });

  it("never below 1", () => {
    const r = strike(30, 80, { target: { t: 90, ap: 5 } });

    expect(r.targetUpdated.combatStats.currentHp).toBe(19);
  });

  it("a doubles hit rolls the location crit table", () => {
    const r = strike(22, 90);

    expect(attackOf(r.attackRoll)).toMatchObject({ doubles: true, location: "arm" });

    const [effect] = crits(r.targetUpdated);

    expect(effect.name).toBe("crit.wfrp.arm.5.disarmed");
    expect(effect.effects).toEqual([{ type: "disarmed", value: 1 }]);
    expect(r.targetUpdated.combatStats.currentHp).toBe(20 - (4 + 3 + (attackOf(r.attackRoll)?.netSl ?? 0) - 3 + 4));
    expect(logOf(r)).toContain("battleWfrp.log.critHit");
  });

  it("doubles on a miss: no crit, log only", () => {
    const r = strike(77, 10);

    expect(r.success).toBe(false);
    expect(crits(r.targetUpdated)).toHaveLength(0);
    expect(r.targetUpdated.combatStats.currentHp).toBe(20);
    expect(logOf(r)).toContain("battleLog.percentile.doublesMiss");
  });

  it("0 Wounds: unconscious plus one crit; a downed target is not attacked again", () => {
    const r = strike(30, 80, { target: { hp: 3 } });

    expect(r.targetUpdated.combatStats).toMatchObject({ currentHp: 0, status: CombatStatus.UNCONSCIOUS });
    expect(logOf(r)).toContain("battleWfrp.log.unconscious");
    expect(critLines(r)).toBe(1);

    const again = strike(30, 80, { target: r.targetUpdated });

    expect(again.success).toBe(false);
    expect(critLines(again)).toBe(0);
  });

  it("a doubles crit that also drops the target gives one crit", () => {
    const r = strike(22, 90, { target: { hp: 3 } });

    expect(r.targetUpdated.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(critLines(r)).toBe(1);
  });

  it("a hit does not crash on an attacker without characteristics stats", () => {
    const r = strike(30, 80, { attacker: { s: 0 }, target: { t: 0 } });

    expect(r.targetUpdated.combatStats.currentHp).toBe(20 - (4 + 0 + 5));
  });

  it("DM manual HP to 0 makes the participant unconscious without a crit", () => {
    const p = fighter("t", ParticipantSide.ENEMY);

    const after = { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };

    const r = settleStatusChange(p, after, [after], WFRP_RULES);

    expect(r.messages).toHaveLength(1);
    expect(crits(r.participant)).toHaveLength(0);
  });

  it("d20 rules have no wfrp hooks", () => {
    expect(ruleSystemOf(DEFAULT_RULES).combat.mitigateDamage).toBeUndefined();
    expect(ruleSystemOf(DEFAULT_RULES).combat.onZeroHp).toBeUndefined();
  });
});
