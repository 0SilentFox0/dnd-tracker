import { describe, expect, it } from "vitest";

import { applyWfrpConditionTo } from "../../conditions/apply";
import type { WfrpConditionKey } from "../../conditions/catalog";
import { conditionLevel } from "../../conditions/levels";
import { reverseRoll } from "../../percentile";
import { LOCATIONS } from "../constants";
import { applyWfrpCrit } from "../crit-effect";
import { CRIT_TABLE, rollCrit } from "../crit-table";
import { computeWfrpDamage } from "../damage";
import { hitLocation } from "../location";
import { resolveOpposed } from "../opposed";
import { wfrpAbilitiesOf } from "../participant";
import { resolveWfrpAttack } from "../resolve-attack";

import { AttackType, CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { mulberry32 } from "@/lib/utils/common/rng";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const rng = mulberry32(1);

const opposed = (attacker: number, defender: number, extra: Partial<Parameters<typeof resolveOpposed>[0]> = {}) =>
  resolveOpposed({ attackerTarget: 50, defenderTargets: [{ kind: "parry", target: 40 }], rng, presetRolls: { attacker, defender }, ...extra });

describe("resolveOpposed", () => {
  it.each([
    ["auto success hits even vs strong defender", 5, 10, true],
    ["auto failure 96 misses", 96, 99, false],
    ["both fail is a miss", 70, 80, false],
    ["higher SL wins", 20, 35, true],
    ["defender higher SL wins", 45, 10, false],
    ["tie goes to attacker", 35, 25, true],
    ["fumble double misses", 55, 90, false],
    ["critical double on success hits", 22, 70, true],
  ])("%s", (_n, a, d, hit) => {
    const r = opposed(a, d);

    expect(r.isHit).toBe(hit);
    expect(r.attackerWon).toBe(hit);
  });

  it("computes net SL", () => {
    expect(opposed(10, 35).netSl).toBe(3);
    expect(opposed(10, 25).netSl).toBe(2);
  });

  it("picks the best defender target", () => {
    const r = resolveOpposed({
      attackerTarget: 50,
      defenderTargets: [{ kind: "parry", target: 30 }, { kind: "shield", target: 60 }, { kind: "dodge", target: 45 }],
      rng,
      presetRolls: { attacker: 30, defender: 30 },
    });

    expect(r.defender.kind).toBe("shield");
    expect(r.defender.target).toBe(60);
  });

  it("applies attacker SL modifier", () => {
    expect(opposed(30, 80, { attackerSlMod: 2 }).attacker.sl).toBe(4);
  });

  it("works without defender targets", () => {
    expect(opposed(30, 80, { defenderTargets: [] }).isHit).toBe(true);
  });

  it("rolls with rng when no preset", () => {
    const r = resolveOpposed({ attackerTarget: 50, defenderTargets: [{ kind: "dodge", target: 30 }], rng: mulberry32(7) });

    expect(r.attacker.rawRoll).toBeGreaterThanOrEqual(1);
  });
});

describe("hitLocation", () => {
  it.each([
    [1, "head"], [9, "head"], [10, "arm"], [24, "arm"], [25, "arm"], [44, "arm"],
    [45, "body"], [79, "body"], [80, "leg"], [89, "leg"], [90, "leg"], [100, "leg"],
  ])("reversed %i is %s", (reversed, loc) => {
    expect(hitLocation(reverseRoll(reversed))).toBe(loc);
  });

  it("reverses the raw roll", () => {
    expect(hitLocation(90)).toBe("head");
    expect(hitLocation(1)).toBe("arm");
  });
});

describe("computeWfrpDamage", () => {
  it("sums and subtracts", () => {
    const r = computeWfrpDamage({ weapon: 4, sb: 3, netSl: 2, tb: 3, ap: 1 });

    expect(r.total).toBe(5);
    expect(r.steps).toEqual([
      { key: "weapon", value: 4 }, { key: "sb", value: 3 }, { key: "netSl", value: 2 }, { key: "tb", value: -3 }, { key: "ap", value: -1 },
    ]);
  });

  it("has minimum damage 1", () => {
    expect(computeWfrpDamage({ weapon: 1, sb: 0, netSl: 0, tb: 5, ap: 5 }).total).toBe(1);
  });
});

describe("rollCrit", () => {
  it("every row of every table is reachable", () => {
    for (const loc of LOCATIONS) {
      const ids = new Set<string>();

      for (let roll = 1; roll <= 100; roll++) ids.add(rollCrit(loc, rng, roll).id);

      expect([...ids].sort()).toEqual(CRIT_TABLE[loc].map((_r, i) => `${loc}.${i + 1}`));
    }
  });

  it("returns text key, bonus and marker", () => {
    expect(rollCrit("head", rng, 100)).toEqual({ id: "head.5", textKey: "battleLog.wfrp.crit.head.5", bonusDamage: 5, markerKey: "unconscious" });
    expect(rollCrit("leg", rng, 1)).toEqual({ id: "leg.1", textKey: "battleLog.wfrp.crit.leg.1", bonusDamage: 1 });
  });

  it("rolls from rng without preset", () => {
    expect(rollCrit("body", mulberry32(3)).id).toMatch(/^body\.[1-5]$/);
  });
});

describe("resolveWfrpAttack conditions", () => {
  const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

  const bow: BattleAttack = { ...sword, id: "bw", type: AttackType.RANGED };

  const fighter = (id: string): BattleParticipant => {
    const p = makeParticipant({ id, hp: 20, maxHp: 20 });

    const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } };

    return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { head: 0, arm: 0, body: 0, leg: 0 }) } };
  };

  const cond = (p: BattleParticipant, key: WfrpConditionKey, levels?: number) => applyWfrpConditionTo(p, { key, levels, round: 1, sourceName: textRef("battleWfrp.log.removed", { target: "x", condition: "y" }) }).participant;

  const run = (attacker: BattleParticipant, target: BattleParticipant, attack: BattleAttack) =>
    resolveWfrpAttack({ attacker, target, attack, participants: [attacker, target], rules: WFRP_RULES, rng: () => 0.5, manualRoll: 30, momentum: { attacker: false, defender: false } });

  it("attacker condition lowers the attack target", () => {
    expect(run(cond(fighter("a"), "stunned", 1), fighter("t"), sword).attackRoll.percentile?.target).toBe(30);
  });

  it("prone target is easier to hit with ranged only if it has the bonus", () => {
    expect(run(fighter("a"), cond(fighter("t"), "prone"), bow).attackRoll.percentile?.target).toBe(40);
    expect(run(fighter("a"), cond(fighter("t"), "prone"), sword).attackRoll.percentile?.target).toBe(60);
  });

  it("defender condition lowers the defense target", () => {
    expect(run(fighter("a"), cond(fighter("t"), "fatigued", 2), sword).attackRoll.percentile?.defender?.target).toBe(20);
  });

  describe("crits", () => {
    const crit = (id: string, markerKey: string) => ({ id, textKey: `battleLog.wfrp.crit.${id}`, bonusDamage: 2, markerKey });

    const crits = (p: BattleParticipant) => p.battleData.activeEffects.filter((e) => e.name.startsWith("crit.wfrp."));

    it("condition markers apply a condition, no inert mark", () => {
      const r = applyWfrpCrit(fighter("t"), crit("head.2", "bleeding"), 1).participant;

      expect(conditionLevel(r, "bleeding")).toBe(1);
      expect(crits(r)).toHaveLength(0);
      expect(applyWfrpCrit(fighter("t"), crit("leg.3", "prone"), 1).participant).toSatisfy((p: BattleParticipant) => conditionLevel(p, "prone") === 1);
    });

    it("unconscious marker sets the status", () => {
      expect(applyWfrpCrit(fighter("t"), crit("head.5", "unconscious"), 1).participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    });

    it("disarmed stays an inert mark", () => {
      const r = applyWfrpCrit(fighter("t"), crit("arm.3", "disarmed"), 1).participant;

      expect(crits(r).map((e) => e.name)).toEqual(["crit.wfrp.arm.3.disarmed"]);
    });
  });
});

describe("resolveWfrpAttack fortune", () => {
  const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

  const bow: BattleAttack = { ...sword, id: "bw", type: AttackType.RANGED };

  const fighter = (id: string): BattleParticipant => {
    const p = makeParticipant({ id, hp: 20, maxHp: 20 });

    const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } };

    return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { head: 0, arm: 0, body: 0, leg: 0 }) } };
  };

  const run = (attack: BattleAttack, extra: Partial<Parameters<typeof resolveWfrpAttack>[0]>) => {
    const attacker = fighter("a");

    const target = fighter("t");

    return resolveWfrpAttack({ attacker, target, attack, participants: [attacker, target], rules: WFRP_RULES, rng: () => 0.5, momentum: { attacker: false, defender: false }, ...extra });
  };

  it("melee reroll after a miss rerolls the attacker against the same defender roll", () => {
    const r = run(sword, { manualRoll: 90, fortune: { kind: "reroll", manualReroll: 20 } });

    expect(r.isHit).toBe(true);
    expect(r.fortune).toEqual({ kind: "reroll", firstRoll: 90 });
    expect(r.attackRoll.percentile?.defender?.roll).toBe(51);
    expect(r.attackRoll.percentile?.fortune).toEqual({ kind: "reroll", firstRoll: 90 });
  });

  it("melee reroll is not spent when the first roll hits", () => {
    const r = run(sword, { manualRoll: 20, fortune: { kind: "reroll", manualReroll: 10 } });

    expect(r.fortune).toBeUndefined();
    expect(r.attackRoll.percentile?.fortune).toBeUndefined();
    expect(r.attackRoll.percentile?.roll).toBe(20);
  });

  it("ranged reroll after a miss", () => {
    const r = run(bow, { manualRoll: 90, fortune: { kind: "reroll", manualReroll: 10 } });

    expect(r.isHit).toBe(true);
    expect(r.fortune).toEqual({ kind: "reroll", firstRoll: 90 });
  });

  it("ranged reroll without a manual roll uses rng", () => {
    const r = run(bow, { manualRoll: 90, rng: () => 0.05, fortune: { kind: "reroll" } });

    expect(r.isHit).toBe(true);
    expect(r.attackRoll.percentile?.roll).toBe(6);
  });

  it("sl adds one SL even on a miss", () => {
    const plain = run(sword, { manualRoll: 90 });

    const boosted = run(sword, { manualRoll: 90, fortune: { kind: "sl" } });

    expect(boosted.netSl).toBe(plain.netSl + 1);
    expect(boosted.fortune).toEqual({ kind: "sl" });
    expect(boosted.attackRoll.percentile?.fortune).toEqual({ kind: "sl" });
  });
});
