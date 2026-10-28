import { describe, expect, it } from "vitest";

import { attackCounter, attacksPerAction, canAttackFromPool, spendAttack } from "../attacks-left";

import { AttackType } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveOpportunityAttacks } from "@/lib/utils/battle/actions/opportunity";
import { runCoreAction } from "@/lib/utils/battle/actions/run";
import { validateAttackRequest } from "@/lib/utils/battle/attack-phase/request";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";
import { resetTurnState } from "@/lib/utils/battle/turn/turn-state";
import { turnExhausted } from "@/lib/utils/battle/view/turn-exhausted";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const extra = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] } as never);

const fighter = makeParticipant({ id: "f", abilities: [extra] });

const homm = makeParticipant({ id: "h" });

const validate = (p: BattleParticipant): string => {
  const target = makeParticipant({ id: "t", side: "enemy" as never });

  try {
    validateAttackRequest({ userId: "u", isDM: true, participants: [{ ...p, battleData: { ...p.battleData, attacks: [sword] } }, target], scene: { turnIndex: 0 } }, { attackerId: "f", targetId: "t", d20Roll: 10, damageRolls: [1] });

    return "ok";
  } catch (e) {
    return (e as { code?: string }).code ?? String(e);
  }
};

describe("extra attack", () => {
  it("first attack spends the action and leaves one attack", () => {
    const p = spendAttack(fighter, [fighter], sword);

    expect(attacksPerAction(fighter, [fighter])).toBe(1);
    expect(p.actionFlags.hasUsedAction).toBe(true);
    expect(p.battleData.attacksLeft).toBe(1);
    expect(canAttackFromPool(p)).toBe(true);
  });

  it("second attack comes from the pool", () => {
    const p = spendAttack(spendAttack(fighter, [fighter], sword), [fighter], sword);

    expect(p.battleData.attacksLeft).toBe(0);
    expect(canAttackFromPool(p)).toBe(false);
  });

  it("HOMM hero without the stat behaves like applyMainActionUsed", () => {
    expect(spendAttack(homm, [homm], sword)).toEqual(applyMainActionUsed(homm));
  });

  it("pool does not consume pendingExtraActions", () => {
    const withPool = { ...fighter, battleData: { ...fighter.battleData, pendingExtraActions: 1 } };

    const p = spendAttack(spendAttack(withPool, [withPool], sword), [withPool], sword);

    expect(p.battleData.pendingExtraActions).toBe(0);
    expect(p.battleData.attacksLeft).toBe(0);
  });

  it("marks attackedWithLight only for a main-hand melee light weapon", () => {
    const light = { ...sword, traits: ["light" as const] };

    const five = { ...fighter, abilities: { ...fighter.abilities, damageModel: "5e" as const } };

    expect(spendAttack(five, [five], light).battleData.attackedWithLight).toBe(true);
    expect(spendAttack(five, [five], { ...light, hand: "off" }).battleData.attackedWithLight).toBeUndefined();
    expect(spendAttack(five, [five], { ...light, type: AttackType.RANGED }).battleData.attackedWithLight).toBeUndefined();
    expect(spendAttack(five, [five], sword).battleData.attackedWithLight).toBeUndefined();
  });

  it("does not mark attackedWithLight for a non-5e participant", () => {
    expect(spendAttack(fighter, [fighter], { ...sword, traits: ["light" as const] }).battleData.attackedWithLight).toBeUndefined();
  });

  describe("attackCounter", () => {
    it("is null without extra attacks", () => {
      expect(attackCounter(homm, [homm])).toBeNull();
    });

    it("counts 1/2, 2/2 and never exceeds the maximum", () => {
      const first = spendAttack(fighter, [fighter], sword);

      const second = spendAttack(first, [first], sword);

      expect(attackCounter(fighter, [fighter])).toEqual({ n: 1, m: 2 });
      expect(attackCounter(first, [first])).toEqual({ n: 2, m: 2 });
      expect(attackCounter(second, [second])).toEqual({ n: 2, m: 2 });
    });

    it("shows 2/2 after the first attack made from a HOMM extra-action pool", () => {
      const withPool = { ...fighter, battleData: { ...fighter.battleData, pendingExtraActions: 1 } };

      const first = spendAttack(withPool, [withPool], sword);

      expect(attackCounter(first, [first])).toEqual({ n: 2, m: 2 });
    });
  });

  it("reset at turn start", () => {
    expect(resetTurnState({ ...fighter, battleData: { ...fighter.battleData, attacksLeft: 1, attackedWithLight: true } })).toMatchObject({ attacksLeft: undefined, attackedWithLight: undefined });
  });

  it("pool keeps the turn open", () => {
    const used = spendAttack(fighter, [fighter], sword);

    expect(turnExhausted(used, [])).toBe(false);
    expect(turnExhausted(spendAttack(used, [used], sword), [])).toBe(true);
  });

  it("validateAttackRequest allows a second attack via the pool and rejects a third", () => {
    const used = spendAttack(fighter, [fighter], sword);

    expect(validate(used)).toBe("ok");
    expect(validate(spendAttack(used, [used], sword))).toBe("action_used");
  });
});

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } };

const at = (p: BattleParticipant, side: "ally" | "enemy", x: number, y: number): BattleParticipant => ({ ...p, basicInfo: { ...p.basicInfo, side: side as never }, battleData: { ...p.battleData, position: { x, y } } });

describe("extra attack in core actions and off-turn", () => {
  it("grapple consumes an attack from the pool", () => {
    const actor = at({ ...spendAttack(fighter, [fighter], sword) }, "ally", 0, 0);

    const target = at(makeParticipant({ id: "t" }), "enemy", 1, 0);

    const out = runCoreAction({ participants: [actor, target], body: { action: "grapple", participantId: "f", targetId: "t" }, map, rules, round: 1, rng: () => 0.5, battleId: "b1" });

    expect(out.participants.find((p) => p.basicInfo.id === "f")!.battleData.attacksLeft).toBe(0);
  });

  it("grapple as the first action opens the pool", () => {
    const actor = at(fighter, "ally", 0, 0);

    const target = at(makeParticipant({ id: "t" }), "enemy", 1, 0);

    const out = runCoreAction({ participants: [actor, target], body: { action: "grapple", participantId: "f", targetId: "t" }, map, rules, round: 1, rng: () => 0.5, battleId: "b1" });

    const f = out.participants.find((p) => p.basicInfo.id === "f")!;

    expect(f.actionFlags.hasUsedAction).toBe(true);
    expect(f.battleData.attacksLeft).toBe(1);
  });

  it("opportunity attack does not touch the pool", () => {
    const mover = at(makeParticipant({ id: "m" }), "ally", 1, 0);

    const e = at({ ...spendAttack(fighter, [fighter], sword), battleData: { ...spendAttack(fighter, [fighter], sword).battleData, attacks: [sword] } }, "enemy", 0, 1);

    const out = resolveOpportunityAttacks({ participants: [mover, e], moverId: "m", path: [{ x: 2, y: 0 }, { x: 3, y: 0 }], start: { x: 1, y: 0 }, map, round: 1, battleId: "b1", rules, rng: () => 0.99 });

    expect(out.actions).toHaveLength(1);
    expect(out.participants.find((p) => p.basicInfo.id === "f")!.battleData.attacksLeft).toBe(1);
  });
});
