import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { attackMutation, createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

const fighter = (id: string, side: ParticipantSide, fortune?: number): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 20, maxHp: 20 });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40, s: 30, t: 30 } };

  return {
    ...p,
    basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" },
    abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { ap: { head: 0, arm: 0, body: 0, leg: 0 } }) },
    battleData: { ...p.battleData, attacks: [sword], ...(fortune !== undefined && { fortune }) },
  };
};

const wfrpCtx = (fortune?: number): BattleMutationContext => {
  const base = context({ participants: [fighter("a", ParticipantSide.ALLY, fortune), fighter("t", ParticipantSide.ENEMY)], isDM: true });

  return { ...base, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 0 } };
};

const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 90, damageRolls: [4], ...over });

const fortuneOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "a")!.battleData.fortune;

const hpOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "t")!.combatStats.currentHp;

describe("wfrp fortune in attacks", () => {
  it("reroll after a miss hits, spends one Fortune and marks the action and log", async () => {
    const out = await attackMutation({ ...wfrpCtx(2), rng: () => 0.795 }, body({ fortune: "reroll", fortuneRoll: 20 }));

    expect(hpOf(out)).toBeLessThan(20);
    expect(fortuneOf(out)).toBe(1);

    const json = JSON.stringify(out.events);

    expect(json).toContain("battleWfrp.log.fortuneReroll");
    expect(json).toContain('"fortune":{"kind":"reroll"');
  });

  it("reroll is not spent when the first roll hits", async () => {
    const out = await attackMutation({ ...wfrpCtx(2), rng: () => 0.795 }, body({ d20Roll: 20, fortune: "reroll", fortuneRoll: 10 }));

    expect(hpOf(out)).toBeLessThan(20);
    expect(fortuneOf(out)).toBe(2);
    expect(JSON.stringify(out.events)).not.toContain("battleWfrp.log.fortuneReroll");
  });

  it("sl spends one Fortune", async () => {
    const out = await attackMutation({ ...wfrpCtx(2), rng: () => 0.795 }, body({ d20Roll: 30, fortune: "sl" }));

    expect(fortuneOf(out)).toBe(1);
    expect(JSON.stringify(out.events)).toContain("battleWfrp.log.fortuneSl");
  });

  it.each([0, undefined])("rejects Fortune when the attacker has %s", async (f) => {
    await expect(attackMutation(wfrpCtx(f), body({ fortune: "sl" }))).rejects.toThrow(API_ERRORS.NO_FORTUNE);
  });

  it("rejects Fortune in a d20 battle", async () => {
    const swordHero = { ...hero, battleData: { ...hero.battleData, fortune: 2, attacks: [{ id: "sword", name: "Sword", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" } as BattleAttack] } };

    const b = attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 15, damageRolls: [4], fortune: "sl" });

    await expect(attackMutation(context({ participants: [swordHero, goblin], isDM: true }), b)).rejects.toThrow(API_ERRORS.NO_FORTUNE);
  });

  it("schema rejects fortune with several targets and an out-of-range fortuneRoll", () => {
    expect(attackBodySchema.safeParse({ attackerId: "a", targetIds: ["t", "u"], d20Roll: 30, damageRolls: [], fortune: "sl" }).success).toBe(false);
    expect(attackBodySchema.safeParse({ attackerId: "a", targetId: "t", d20Roll: 30, damageRolls: [], fortune: "reroll", fortuneRoll: 101 }).success).toBe(false);
  });

  it("server rolls ignore the client fortuneRoll", async () => {
    const out = await createAttackMutation(undefined, { serverRolls: true })({ ...wfrpCtx(2), rng: seq(0.895, 0.795, 0.01) }, body({ serverRoll: true, fortune: "reroll", fortuneRoll: 5 }));

    expect(JSON.stringify(out.events)).not.toContain('"roll":5,');
    expect(fortuneOf(out)).toBeLessThanOrEqual(2);
  });
});
