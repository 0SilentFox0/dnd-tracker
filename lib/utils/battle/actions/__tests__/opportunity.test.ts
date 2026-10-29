import { describe, expect, it } from "vitest";

import { resolveOpportunityAttacks } from "../opportunity";
import { runCoreAction } from "../run";

import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyCondition5e } from "@/lib/utils/battle/conditions";
import { cellKey } from "@/lib/utils/battle/grid";
import { pathTo, reachable } from "@/lib/utils/battle/grid/path";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const bow: BattleAttack = { ...sword, id: "bw", name: "Лук", type: AttackType.RANGED };

const mk = (id: string, side: "ally" | "enemy", x: number, y = 0, attacks: BattleAttack[] = []): BattleParticipant => {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, name: id, side: side as never, controlledBy: side === "ally" ? "user-1" : "dm" },
    combatStats: { ...base.combatStats, speed: 30, currentHp: 50, maxHp: 50 },
    battleData: { ...base.battleData, position: { x, y }, attacks },
  };
};

const rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } };

const go = (ps: BattleParticipant[], to: { x: number; y: number }, rng = () => 0.99) => {
  const mover = ps[0];

  const path = pathTo(map, ps, mover, to, 10)!;

  return resolveOpportunityAttacks({ participants: ps, moverId: mover.basicInfo.id, path, start: mover.battleData.position!, map, round: 1, battleId: "b1", rules, rng });
};

describe("pathTo", () => {
  const m = mk("m", "ally", 0, 2);

  it("довжина збігається з reachable", () => {
    const ps = [m, mk("e", "enemy", 2, 2)];

    const to = { x: 4, y: 2 };

    expect(pathTo(map, ps, m, to, 10)).toHaveLength(reachable(map, ps, m, 10).get(cellKey(to))!);
    expect(pathTo(map, ps, m, to, 10)!.at(-1)).toEqual(to);
  });

  it("обходить ворогів, проходить крізь союзників, null для недосяжної", () => {
    const wall = [m, mk("e", "enemy", 1, 2)];

    expect(pathTo(map, wall, m, { x: 2, y: 2 }, 10)!.some((c) => c.x === 1 && c.y === 2)).toBe(false);

    const friend = [m, mk("f", "ally", 1, 2)];

    expect(pathTo(map, friend, m, { x: 2, y: 2 }, 10)).toHaveLength(2);
    expect(pathTo(map, friend, m, { x: 1, y: 2 }, 10)).toBeNull();
    expect(pathTo(map, wall, m, { x: 9, y: 4 }, 3)).toBeNull();
  });
});

describe("resolveOpportunityAttacks", () => {
  const m = mk("m", "ally", 1, 0);

  it("вихід із досяжності одного ворога — одна атака, реакцію витрачено", () => {
    const e = mk("e", "enemy", 0, 1, [sword]);

    const out = go([m, e], { x: 3, y: 0 });

    expect(out.actions).toHaveLength(1);
    expect(eventTextOf(out.actions[0])).toContain("Атака можливості");
    expect(out.participants.find((p) => p.basicInfo.id === "e")!.actionFlags.hasUsedReaction).toBe(true);
    expect(out.messages[0]).toBe("⚔ Атака при відході: e → m");
    expect(out.stopAt).toBeNull();
    expect(out.cost).toBe(2);
  });

  it("два вороги — дві атаки", () => {
    const out = go([m, mk("e1", "enemy", 0, 1, [sword]), mk("e2", "enemy", 1, 1, [sword])], { x: 4, y: 0 });

    expect(out.actions).toHaveLength(2);
  });

  it("ворог без реакції, недієздатний чи без ближньої атаки — не б'є", () => {
    const spent = mk("e", "enemy", 0, 1, [sword]);

    spent.actionFlags = { ...spent.actionFlags, hasUsedReaction: true };

    expect(go([m, spent], { x: 3, y: 0 }).actions).toHaveLength(0);

    const e = mk("e", "enemy", 0, 1, [sword]);

    const stunned = applyCondition5e([m, e], "e", { key: "incapacitated", rounds: 3, source: { participantId: "m", name: "m" }, sourceName: "m", timedKey: "t", round: 1 }).participants;

    expect(go([m, stunned[1]], { x: 3, y: 0 }).actions).toHaveLength(0);
    expect(go([m, mk("e", "enemy", 0, 1, [bow])], { x: 3, y: 0 }).actions).toHaveLength(0);
  });

  it("disengaged — без атак", () => {
    const ps = [m, mk("e", "enemy", 0, 1, [sword])];

    const dis = runCoreAction({ participants: ps, body: { action: "disengage", participantId: "m" }, map, rules, round: 1, rng: () => 0.5, battleId: "b1" });

    expect(go(dis.participants, { x: 3, y: 0 }).actions).toHaveLength(0);
  });

  it("рух усередині досяжності — без атак", () => {
    const e = mk("e", "enemy", 1, 1, [sword]);

    expect(go([mk("m", "ally", 0, 0), e], { x: 2, y: 0 }).actions).toHaveLength(0);
  });

  it("мувер падає — зупинка на клітинці виходу", () => {
    const weak = { ...m, combatStats: { ...m.combatStats, currentHp: 1 } };

    const out = go([weak, mk("e", "enemy", 0, 1, [sword])], { x: 4, y: 0 });

    expect(out.stopAt).toEqual({ x: 1, y: 0 });
    expect(out.cost).toBe(0);
  });

  it("ворог, зачарований мувером, не атакує його", () => {
    const e = mk("e", "enemy", 0, 1, [sword]);

    const charmed = applyCondition5e([m, e], "e", { key: "charmed", rounds: 3, source: { participantId: "m", name: "m" }, sourceName: "m", timedKey: "t", round: 1 }).participants;

    expect(go(charmed, { x: 3, y: 0 }).actions).toHaveLength(0);

    const byOther = applyCondition5e([m, e], "e", { key: "charmed", rounds: 3, source: { participantId: "other", name: "o" }, sourceName: "o", timedKey: "t", round: 1 }).participants;

    expect(go(byOther, { x: 3, y: 0 }).actions).toHaveLength(1);
  });
});

