import { describe, expect, it } from "vitest";

import { context } from "./fixtures";

import { AttackType, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { type AttackBody, attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { initiativeRollMutation } from "@/lib/server/battles/mutations/initiative/initiative-roll-mutation";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

const fighter = (id: string, side: ParticipantSide): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 20, maxHp: 20 });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40, s: 30, t: 30 } };

  return {
    ...p,
    basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" },
    abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { head: 0, arm: 0, body: 0, leg: 0 }) },
    battleData: { ...p.battleData, attacks: [sword] },
  };
};

const firstThen = (first: number, rest: number) => {
  let calls = 0;

  return () => (calls++ === 0 ? first : rest);
};

const crits = (p: BattleParticipant) => p.battleData.activeEffects.filter((e) => e.name.startsWith("crit.wfrp."));

const hp = (c: BattleMutationContext, id: string) => c.participants.find((p) => p.basicInfo.id === id)!.combatStats.currentHp;

describe("wfrp battle end to end (engine)", () => {
  it("initiative, repeated hits, target drops to 0 Wounds and goes unconscious with a crit", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    let ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES } };

    const rolled = initiativeRollMutation(ctx, {});

    expect(rolled.participants).toHaveLength(2);
    ctx = { ...ctx, participants: [...rolled.participants].sort((x, y) => (x.basicInfo.id === "a" ? -1 : y.basicInfo.id === "a" ? 1 : 0)), scene: { ...ctx.scene, turnIndex: 0 } };

    const hit = (attackerId: string, targetId: string): AttackBody => attackBodySchema.parse({ attackerId, targetId, attackId: "sw", d20Roll: 10, damageRolls: [4], endTurn: true });

    const rolls: number[] = [];

    const step = async (attackerId: string, targetId: string, attackerRoll = 30) => {
      const out = await attackMutation({ ...ctx, rng: firstThen((attackerRoll - 0.5) / 100, 0.795) }, hit(attackerId, targetId));

      rolls.push(out.events.length);
      ctx = { ...ctx, participants: out.participants, pending: out.pending ?? ctx.pending, scene: { ...ctx.scene, ...out.scene } };
    };

    await step("a", "t");
    expect(hp(ctx, "t")).toBe(11);

    await step("t", "a", 70);
    expect(hp(ctx, "a")).toBe(20);

    await step("a", "t");
    expect(hp(ctx, "t")).toBeLessThan(11);

    await step("t", "a", 70);
    await step("a", "t");

    const target = ctx.participants.find((p) => p.basicInfo.id === "t")!;

    expect(target.combatStats).toMatchObject({ currentHp: 0, status: CombatStatus.UNCONSCIOUS });
    expect(crits(target)).toHaveLength(1);
    expect(rolls.every((n) => n > 0)).toBe(true);
  });

  it("ignores client d20 rolls: the server rolls the d100 attack", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    const ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 0 } };

    const body = attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 1, damageRolls: [4] });

    const out = await attackMutation({ ...ctx, rng: seq(0.995, 0.01) }, body);

    expect(out.participants.find((p) => p.basicInfo.id === "t")!.combatStats.currentHp).toBe(20);
  });
});
