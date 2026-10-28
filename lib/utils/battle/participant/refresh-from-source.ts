import type { BattleParticipant, BattleParticipantSpellcasting } from "@/types/battle";

function mergeSlots(live: BattleParticipantSpellcasting["spellSlots"], fresh: BattleParticipantSpellcasting["spellSlots"]) {
  const out: BattleParticipantSpellcasting["spellSlots"] = {};

  for (const key of new Set([...Object.keys(live ?? {}), ...Object.keys(fresh ?? {})])) {
    const max = fresh?.[key]?.max ?? 0;

    const old = live?.[key];

    if (max === 0 && !old) continue;

    const spent = old ? old.max - old.current : 0;

    const level = fresh?.[key]?.level;

    out[key] = { max, current: Math.min(Math.max(max - spent, 0), max), ...(level !== undefined && { level }) };
  }

  return out;
}

/** Takes only what the library edits (abilities, attacks, spells, slot maxima, grid size, speed); HP, morale, effects, usage and flags stay live. */
export function refreshFromSource(live: BattleParticipant, fresh: BattleParticipant): BattleParticipant {
  return {
    ...live,
    combatStats: { ...live.combatStats, gridSize: fresh.combatStats.gridSize, speed: fresh.combatStats.speed },
    battleData: {
      ...live.battleData,
      resolvedAbilities: fresh.battleData.resolvedAbilities,
      attacks: fresh.battleData.attacks,
    },
    spellcasting: {
      ...live.spellcasting,
      knownSpells: fresh.spellcasting.knownSpells,
      spellSaveDC: fresh.spellcasting.spellSaveDC,
      spellAttackBonus: fresh.spellcasting.spellAttackBonus,
      spellcastingAbility: fresh.spellcasting.spellcastingAbility,
      spellSlots: mergeSlots(live.spellcasting.spellSlots, fresh.spellcasting.spellSlots),
    },
  };
}
