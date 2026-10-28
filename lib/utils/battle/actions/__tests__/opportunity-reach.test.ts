import { describe, expect, it } from "vitest";

import { resolveOpportunityAttacks } from "../opportunity";

import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { pathTo } from "@/lib/utils/battle/grid/path";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const glaive: BattleAttack = { id: "gl", name: "Глефа", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d10", damageType: "slashing", traits: ["reach", "twoHanded"] };

const mk = (id: string, side: "ally" | "enemy", x: number, attacks: BattleAttack[] = [], fiveE = false): BattleParticipant => {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, name: id, side: side as never, controlledBy: side === "ally" ? "user-1" : "dm" },
    abilities: { ...base.abilities, ...(fiveE && { damageModel: "5e" as const }) },
    combatStats: { ...base.combatStats, speed: 30, currentHp: 50, maxHp: 50 },
    battleData: { ...base.battleData, position: { x, y: 0 }, attacks },
  };
};

const rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } };

const provoked = (fiveE: boolean) => {
  const ps = [mk("m", "ally", 2), mk("e", "enemy", 0, [glaive], fiveE)];

  const path = pathTo(map, ps, ps[0], { x: 4, y: 0 }, 10) ?? [];

  return resolveOpportunityAttacks({ participants: ps, moverId: "m", path, start: { x: 2, y: 0 }, map, round: 1, battleId: "b1", rules, rng: () => 0.99 }).actions.length > 0;
};

describe("досяжність при відході", () => {
  it("leaving a 2-cell reach provokes", () => {
    expect(provoked(true)).toBe(true);
  });

  it("HOMM reach stays 1", () => {
    expect(provoked(false)).toBe(false);
  });
});
