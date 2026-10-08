import { z } from "zod";

import { parseDice } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

export interface LevelScaling {
  hpPerLevel: number;
  damagePerLevel: number;
  attackPerTwoLevels: number;
}

export const LevelScalingSchema: z.ZodType<LevelScaling> = z.object({
  hpPerLevel: z.number().min(0),
  damagePerLevel: z.number().min(0),
  attackPerTwoLevels: z.number().min(0),
});

function addFlat(dice: string, bonus: number): string {
  if (bonus === 0) return dice;

  const parsed = parseDice(dice);

  if (!parsed) return `${dice}+${bonus}`;

  const groups = parsed.groups.map((g) => `${g.count}d${g.size}`);

  const flat = parsed.flat + bonus;

  return [...groups, ...(flat !== 0 ? [String(flat)] : [])].join("+").replace(/\+-/g, "-");
}

export function scaleSummon(p: BattleParticipant, scaling: unknown, casterLevel: number | undefined): BattleParticipant {
  const parsed = LevelScalingSchema.safeParse(scaling);

  if (!parsed.success || typeof casterLevel !== "number" || !Number.isFinite(casterLevel)) return p;

  const { hpPerLevel, damagePerLevel, attackPerTwoLevels } = parsed.data;

  const hp = hpPerLevel * casterLevel;

  const damage = damagePerLevel * casterLevel;

  const attack = Math.floor(casterLevel / 2) * attackPerTwoLevels;

  return {
    ...p,
    combatStats: { ...p.combatStats, maxHp: p.combatStats.maxHp + hp, currentHp: p.combatStats.currentHp + hp },
    battleData: {
      ...p.battleData,
      attacks: p.battleData.attacks.map((a) => ({ ...a, damageDice: addFlat(a.damageDice, damage), attackBonus: a.attackBonus + attack })),
    },
  };
}
