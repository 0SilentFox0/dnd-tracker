import { describe, expect, it, vi } from "vitest";

import { legendaryAttack } from "../legendary";
import { resolveMovement5e } from "../movement";
import { resolveOpportunityAttacks } from "../opportunity";
import { runCoreAction } from "../run";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { pathTo } from "@/lib/utils/battle/grid/path";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { slotOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleAttack, BattleMapConfig, BattleParticipant, SceneMomentum } from "@/types/battle";

// the WFRP system has no reactions yet; the engine plumbing is still verified with them switched on
vi.mock("@/lib/utils/rules/systems", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/rules/systems")>();

  return {
    ...actual,
    ruleSystemOf: (rules: Parameters<typeof actual.ruleSystemOf>[0]) => {
      const system = actual.ruleSystemOf(rules);

      return system.key === "wfrp" ? { ...system, combat: { ...system.combat, actionEconomy: { ...system.combat.actionEconomy, reaction: true } } } : system;
    },
  };
});

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

const wfrp = { ...WFRP_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } };

const HIT = 0.295;

const MISS = 0.795;

const byCall = (...values: number[]) => {
  let i = 0;

  return () => values[i++] ?? 0.5;
};

const mk = (id: string, side: ParticipantSide, x: number, y = 2): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 40, maxHp: 40 });

  return {
    ...p,
    basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" },
    abilities: { ...p.abilities, system: slotOf({ ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } }) },
    battleData: { ...p.battleData, position: { x, y }, attacks: [sword] },
  };
};

const used = (a: { actionDetails: { percentile?: { momentumUsed?: boolean } } }) => a.actionDetails.percentile?.momentumUsed === true;

const opportunity = (rules: typeof wfrp, rolls: () => () => number, momentum?: SceneMomentum) => {
  const ps = [mk("m", ParticipantSide.ENEMY, 0), mk("e", ParticipantSide.ALLY, 1, 1)];

  const path = pathTo(map, ps, ps[0], { x: 3, y: 2 }, 10) ?? [];

  const input = { participants: ps, moverId: "m", path, start: { x: 0, y: 2 }, map, round: 1, battleId: "b1", rules, rng: rolls(), momentum };

  return { direct: resolveOpportunityAttacks(input), moved: resolveMovement5e({ map, participants: ps, mover: ps[0], to: { x: 3, y: 2 }, path, budget: 10, cost: 3, round: 1, battleId: "b1", rules, rng: rolls(), momentum }) };
};

describe("opportunity attacks", () => {
  it("the reacting side wins the opposed roll and gains Momentum", () => {
    const { direct, moved } = opportunity(wfrp, () => byCall(HIT, MISS));

    expect(direct.actions).toHaveLength(1);
    expect(direct.momentum).toEqual({ ally: true });
    expect(moved.momentum).toEqual({ ally: true });
  });

  it("an existing token of the reacting side is spent", () => {
    const { direct } = opportunity(wfrp, () => byCall(HIT, MISS), { ally: true });

    expect(used(direct.actions[0])).toBe(true);
    expect(direct.momentum).toEqual({ ally: true });
  });

  it("passes the incoming value through when nothing is resolved", () => {
    const { moved } = opportunity({ ...wfrp, actions: { ...wfrp.actions, opportunityAttacks: false } }, () => byCall(HIT, MISS), { enemy: true });

    expect(moved.momentum).toEqual({ enemy: true });
  });

  it("d20 rules leave the empty momentum untouched", () => {
    const { direct, moved } = opportunity({ ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } }, () => () => 0.99);

    expect(direct.momentum).toEqual({});
    expect(moved.momentum).toEqual({});
  });
});

describe("legendary attack", () => {
  const run = (rules: typeof wfrp, rng: () => number, momentum?: SceneMomentum) =>
    legendaryAttack({ participants: [mk("boss", ParticipantSide.ENEMY, 0), mk("hero", ParticipantSide.ALLY, 1)], actorId: "boss", attackIndex: 0, targetId: "hero", map, rules, round: 1, rng, battleId: "b1", momentum });

  it("the winning side gains Momentum", () => {
    expect(run(wfrp, byCall(HIT, MISS)).momentum).toEqual({ enemy: true });
  });

  it("an existing token is spent", () => {
    const out = run(wfrp, byCall(HIT, MISS), { enemy: true });

    expect(used(out.action)).toBe(true);
    expect(out.momentum).toEqual({ enemy: true });
  });

  it("d20 rules keep it empty", () => {
    expect(run(DEFAULT_RULES, () => 0.99).momentum).toEqual({});
  });
});

describe("readied attack", () => {
  const run = (rules: typeof wfrp, rng: () => number, momentum?: SceneMomentum) => {
    const a = mk("a", ParticipantSide.ALLY, 0);

    const ready = { ...a, battleData: { ...a.battleData, readied: { kind: "attack" as const, round: 1 } } };

    return runCoreAction({ participants: [ready, mk("foe", ParticipantSide.ENEMY, 1)], body: { action: "readiedAttack", participantId: "a", targetId: "foe" }, map, rules, round: 1, rng, battleId: "b1", momentum });
  };

  it("the winning side gains Momentum", () => {
    expect(run(wfrp, byCall(HIT, MISS)).momentum).toEqual({ ally: true });
  });

  it("an existing token is spent", () => {
    const out = run(wfrp, byCall(HIT, MISS), { ally: true });

    expect(out.actions?.[0] && used(out.actions[0])).toBe(true);
    expect(out.momentum).toEqual({ ally: true });
  });

  it("d20 rules keep it empty", () => {
    expect(run(DEFAULT_RULES, () => 0.99).momentum).toEqual({});
  });

  it("other core actions return no momentum", () => {
    const out = runCoreAction({ participants: [mk("a", ParticipantSide.ALLY, 0)], body: { action: "dodge", participantId: "a" }, map: null, rules: wfrp, round: 1, rng: () => 0.5, battleId: "b1", momentum: { ally: true } });

    expect(out.momentum).toBeUndefined();
  });
});
