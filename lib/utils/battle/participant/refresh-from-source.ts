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
  const pools = fresh.battleData.pools && Object.fromEntries(Object.entries(fresh.battleData.pools).map(([key, pool]) => {
    const liveLabel = live.battleData.pools?.[key]?.label;

    // Збирач юніта має лише ID заклинань; назву розв'язує успішний каст.
    return [key, key === `pool:spell:${pool.label}` && liveLabel ? { ...pool, label: liveLabel } : pool];
  }));

  return {
    ...live,
    abilities: { ...live.abilities, creatureType: fresh.abilities.creatureType },
    combatStats: { ...live.combatStats, gridSize: fresh.combatStats.gridSize, speed: fresh.combatStats.speed },
    battleData: {
      ...live.battleData,
      resolvedAbilities: fresh.battleData.resolvedAbilities,
      attacks: fresh.battleData.attacks,
      pools,
      senses: fresh.battleData.senses,
      movement: fresh.battleData.movement,
      languages: fresh.battleData.languages,
      telepathy: fresh.battleData.telepathy,
    },
    spellcasting: {
      ...live.spellcasting,
      knownSpells: fresh.spellcasting.knownSpells,
      grants: fresh.spellcasting.grants,
      spellSaveDC: fresh.spellcasting.spellSaveDC,
      spellAttackBonus: fresh.spellcasting.spellAttackBonus,
      spellcastingAbility: fresh.spellcasting.spellcastingAbility,
      spellSlots: mergeSlots(live.spellcasting.spellSlots, fresh.spellcasting.spellSlots),
    },
  };
}
