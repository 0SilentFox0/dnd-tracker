import { levelUpAvailable, xpForLevel } from "@/lib/constants/experience";
import { restUses } from "@/lib/utils/abilities/engine/core/usage";
import { hitDicePool } from "@/lib/utils/characters/resources/hit-dice";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { isConsumablePool } from "@/lib/utils/items/pools";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { SheetRest } from "@/types/characters";
import type { ResolvedClassEntry } from "@/types/classes";

export function buildRestBlock(input: {
  participant: BattleParticipant;
  character: { level: number; resources?: unknown; inspiration?: boolean; experience?: number };
  classes?: ResolvedClassEntry[];
  rules?: Ruleset;
  maxLevel: number;
}): SheetRest | null {
  const ooc = input.rules?.outOfCombat;

  if (!ooc || (!ooc.persistResources && !ooc.xp && !ooc.inspiration)) return null;

  const { participant: p, character: c } = input;

  const persist = ooc.persistResources;

  const r = persist ? readResources(c.resources) : {};

  const experience = c.experience ?? 0;

  return {
    persist,
    hp: persist ? { current: p.combatStats.currentHp, max: p.combatStats.maxHp, temp: p.combatStats.tempHp } : null,
    dead: !!r.dead,
    exhaustion: r.exhaustion ?? 0,
    shortRestOpen: !!r.shortRestOpen,
    hitDice: persist ? hitDicePool(input.classes ?? []).map((e) => ({ classId: e.classId, name: e.name, die: e.die, total: e.level, spent: Math.min(e.level, r.hitDiceSpent?.[e.classId] ?? 0) })) : [],
    charges: persist
      ? [
          ...p.battleData.resolvedAbilities.flatMap((a) => (a.limits?.perRest ? [{ key: a.key, name: a.name, uses: restUses(a.limits) ?? 0, used: p.battleData.abilityUsage?.[a.key]?.battle ?? 0, rest: a.limits.perRest.rest }] : [])),
          ...Object.entries(p.battleData.pools ?? {})
            .filter(([key]) => !isConsumablePool(key))
            .map(([key, pool]) => ({ key, name: pool.label, uses: pool.max, used: p.battleData.abilityUsage?.[key]?.battle ?? 0, rest: pool.rest })),
        ]
      : [],
    inspiration: ooc.inspiration ? !!c.inspiration : null,
    xp: ooc.xp ? { value: experience, next: xpForLevel(c.level + 1), levelUp: levelUpAvailable({ level: c.level, experience }, input.maxLevel) } : null,
  };
}
