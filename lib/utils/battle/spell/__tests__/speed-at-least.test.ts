import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { moveBudget } from "@/lib/utils/battle/grid";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 40, rows: 10, background: null, opacity: 0.3 };

const vehicle: CastableSpell = {
  id: "veh",
  name: "Синтетичний транспорт",
  level: 1,
  groupId: null,
  definition: {
    dice: 0,
    cost: "action",
    targeting: { kind: "self" },
    resolution: { kind: "auto" },
    effects: [{ kind: "modifyStat", stat: "speed", atLeast: 60, duration: { rounds: 10 } }],
    raceModifiers: [],
  },
};

const rider = (speed: number, extraMovement = 0): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return {
    ...p,
    combatStats: { ...p.combatStats, speed },
    battleData: { ...p.battleData, extraMovement, position: { x: 0, y: 5 } },
    spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } },
  };
};

const budgetAfterCast = (caster: BattleParticipant): number => {
  const r = castSpell({ caster, spell: vehicle, targetIds: ["c"], allParticipants: [caster], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.4, map });

  return moveBudget({ map, dmUserId: null }, r.allParticipantsUpdated.find((p) => p.basicInfo.id === "c") as BattleParticipant);
};

describe("speed atLeast (Summon Vehicle) and the move budget of a player owner", () => {
  it("raises a slow rider to 60 ft", () => {
    expect(budgetAfterCast(rider(30))).toBe(12);
  });

  it("keeps a faster rider's own speed", () => {
    expect(budgetAfterCast(rider(80))).toBe(16);
  });

  it("extra movement is added on top of the floor", () => {
    expect(budgetAfterCast(rider(30, 3))).toBe(15);
  });
});
