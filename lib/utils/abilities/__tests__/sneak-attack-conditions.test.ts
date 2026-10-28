import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Condition } from "@/lib/utils/abilities/schema";
import { eventRollMode } from "@/lib/utils/battle/attack/roll";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant, GridPoint } from "@/types/battle";

const SNEAK: Condition = {
  type: "any",
  conditions: [
    { type: "attackRollMode", mode: "advantage" },
    { type: "all", conditions: [{ type: "allyAdjacent" }, { type: "not", condition: { type: "attackRollMode", mode: "disadvantage" } }] },
  ],
};

const sneak = resolved({ id: "sa", name: "Sneak Attack", trigger: { event: "hit", role: "attacker" }, condition: SNEAK, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: 7, target: "eventTarget" }] }, { type: "class", id: "rogue" });

const at = (p: BattleParticipant, position?: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, ...(position && { position }) } });

function scene(opts: { allyAt?: GridPoint; targetAt?: GridPoint } = {}) {
  const rogue = at(makeParticipant({ id: "r", abilities: [sneak] }), opts.targetAt && { x: 0, y: 0 });

  const ally = at(makeParticipant({ id: "a" }), opts.allyAt);

  const target = at(makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }), opts.targetAt);

  return [rogue, ally, target];
}

const hit = (rollMode?: "advantage" | "disadvantage"): AbilityEvent => ({ type: "hit", actorId: "r", targetId: "t", attackKind: "melee", damage: 5, ...(rollMode && { rollMode }) });

const hpAfter = (ps: BattleParticipant[], event: AbilityEvent) => runAbilities(ps, event, { round: 1, rng: seq(0.5) }).participants.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp;

describe("Sneak Attack conditions", () => {
  it("advantage alone is enough, even without a map", () => {
    expect(hpAfter(scene(), hit("advantage"))).toBe(43);
    expect(hpAfter(scene(), hit())).toBe(50);
  });

  it("an ally next to the target without disadvantage", () => {
    expect(hpAfter(scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 6, y: 5 } }), hit())).toBe(43);
    expect(hpAfter(scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 6, y: 5 } }), hit("disadvantage"))).toBe(50);
    expect(hpAfter(scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 8, y: 5 } }), hit())).toBe(50);
  });

  it("a downed ally does not count", () => {
    const ps = scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 6, y: 5 } }).map((p) => (p.basicInfo.id === "a" ? { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: "dead" as const } } : p));

    expect(hpAfter(ps, hit())).toBe(50);
  });

  it("once per turn", () => {
    const first = runAbilities(scene(), hit("advantage"), { round: 1, rng: seq(0.5) });

    expect(hpAfter(first.participants, hit("advantage"))).toBe(43);
  });

  it("eventRollMode carries only advantage or disadvantage", () => {
    const roll = (mode?: "advantage" | "disadvantage") => ({ isHit: true, isCritical: false, isCriticalFail: false, totalAttackValue: 15, attackBonus: 5, advantageUsed: mode === "advantage", chosenD20: 10, ...(mode && { secondRoll: { mode, value: 4, serverRolled: true } }) }) as AttackRollResult;

    expect(eventRollMode(roll("advantage"))).toEqual({ rollMode: "advantage" });
    expect(eventRollMode(roll("disadvantage"))).toEqual({ rollMode: "disadvantage" });
    expect(eventRollMode(roll())).toEqual({});
  });
});
