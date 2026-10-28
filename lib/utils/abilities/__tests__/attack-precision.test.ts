import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { activeEffectIds, consumeAttackEffects } from "@/lib/utils/battle/attack/consume-effects";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const reckless = resolved({
  id: "reckless",
  name: "Reckless Attack",
  trigger: { event: "bonusAction" },
  effects: [{ kind: "flag", flag: "advantage", attackKind: "melee", attackAbility: "strength", duration: { rounds: 1 }, target: "self" }],
});

const steady = resolved({
  id: "steady",
  name: "Steady Aim",
  trigger: { event: "bonusAction" },
  condition: { type: "notMoved" },
  effects: [{ kind: "flag", flag: "advantage", attackKind: "all", consumeOn: "ownAttack", duration: { rounds: 1 }, target: "self" }],
});

const hero = (abilities = [reckless, steady], movementUsed?: number): BattleParticipant => {
  const p = makeParticipant({ id: "h", abilities });

  return { ...p, abilities: { ...p.abilities, damageModel: "5e" }, battleData: { ...p.battleData, ...(movementUsed !== undefined && { movementUsed }) } };
};

const use = (p: BattleParticipant, key: string) => runAbilities([p], { type: "bonusAction", actorId: "h", abilityKey: key, targetIds: [] }, { round: 1, rng: seq(0.5) }).participants[0];

const sword: BattleAttack = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing" };

const finesse: BattleAttack = { ...sword, traits: ["finesse"] };

const bow: BattleAttack = { ...sword, type: AttackType.RANGED };

describe("Reckless Attack accuracy", () => {
  it("gives advantage on Strength attacks only", () => {
    const p = use(hero(), "skill:s1:reckless");

    expect(rollModeReasons(p, sword, [p]).advantage).toHaveLength(1);
    expect(rollModeReasons(p, finesse, [p]).advantage).toHaveLength(1);
    expect(rollModeReasons(p, bow, [p]).advantage).toHaveLength(0);
  });

  it("a Dexterity finesse attack gets none", () => {
    const base = use(hero(), "skill:s1:reckless");

    const p = { ...base, abilities: { ...base.abilities, dexterity: 18, strength: 10 } };

    expect(rollModeReasons(p, finesse, [p]).advantage).toHaveLength(0);
  });

  it("schema accepts attackAbility on the advantage flag", () => {
    expect(AbilitySchema.safeParse(reckless).success).toBe(true);
    expect(AbilitySchema.safeParse({ ...reckless, effects: [{ kind: "flag", flag: "advantage", attackKind: "melee", attackAbility: "luck" }] }).success).toBe(false);
  });
});

describe("Steady Aim accuracy", () => {
  it("advantage is spent by the first attack", () => {
    const p = use(hero(), "skill:s1:steady");

    expect(rollModeReasons(p, bow, [p]).advantage).toHaveLength(1);

    const [after] = consumeAttackEffects([p], { attackerId: "h", targetId: "t", hit: false, existedBefore: activeEffectIds([p]) });

    expect(rollModeReasons(after, bow, [after]).advantage).toHaveLength(0);
  });

  it("notMoved holds only while no cells were walked", () => {
    const ctx = (p: BattleParticipant) => ({ owner: p, event: null, participants: [p] });

    expect(evaluateCondition({ type: "notMoved" }, ctx(hero()))).toBe(true);
    expect(evaluateCondition({ type: "notMoved" }, ctx(hero(undefined, 0)))).toBe(true);
    expect(evaluateCondition({ type: "notMoved" }, ctx(hero(undefined, 2)))).toBe(false);
  });

  it("does nothing after moving", () => {
    const p = use(hero([steady], 3), "skill:s1:steady");

    expect(p.battleData.activeEffects).toHaveLength(0);
  });
});
