import { hashJson } from "./stable-json";
import type { ParticipantSnapshot, ParticipantState, StoredParticipant } from "./types";

import { convertLegacySnapshot } from "@/lib/utils/abilities/legacy/convert-snapshot";
import type { BattleParticipant } from "@/types/battle";

function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keys.includes(k as K)),
  ) as Omit<T, K>;
}

export function splitParticipant(
  p: BattleParticipant,
  place: { orderIndex: number; isPending: boolean },
): StoredParticipant {
  const { id, sourceType, sourceId, side, controlledBy, ...basicWithBattle } = p.basicInfo;

  const basicRest = omit(basicWithBattle, ["battleId"]);

  const { initiative, ...abilitiesRest } = p.abilities;

  const { currentHp, tempHp, maxHp, morale, status, ...combatRest } = p.combatStats;

  const { activeEffects, abilityUsage, pendingExtraActions, ...battleDataWithScoped } = p.battleData;

  // потрібне лише під час старту бою
  const battleDataRest = omit(battleDataWithScoped, ["pendingScopedArtifactBonuses", "skillUsageCounts"]);

  const spellSlotsCurrent: Record<string, number> = {};

  const spellSlotsMax: Record<string, { max: number }> = {};

  for (const [level, slot] of Object.entries(p.spellcasting.spellSlots ?? {})) {
    spellSlotsCurrent[level] = slot.current;
    spellSlotsMax[level] = { max: slot.max };
  }

  const snapshot: ParticipantSnapshot = {
    basicInfo: basicRest,
    abilities: abilitiesRest,
    combatStats: combatRest,
    spellcasting: { ...p.spellcasting, spellSlots: spellSlotsMax },
    battleData: battleDataRest,
  };

  const state: ParticipantState = {
    activeEffects: activeEffects ?? [],
    abilityUsage,
    pendingExtraActions,
    spellSlotsCurrent,
  };

  // колонки INTEGER: JSON раніше приймав дроби від відсоткових модифікаторів
  return {
    columns: {
      id,
      sourceType,
      sourceId,
      side,
      controlledBy,
      orderIndex: place.orderIndex,
      isPending: place.isPending,
      extraTurnOf: null,
      currentHp: Math.round(currentHp),
      tempHp: Math.round(tempHp),
      maxHp: Math.round(maxHp),
      morale: Math.round(morale),
      status,
      initiative: Math.round(initiative),
      hasUsedAction: p.actionFlags.hasUsedAction,
      hasUsedBonusAction: p.actionFlags.hasUsedBonusAction,
      hasUsedReaction: p.actionFlags.hasUsedReaction,
      hasExtraTurn: p.actionFlags.hasExtraTurn,
    },
    snapshot,
    state,
    snapshotHash: hashJson(snapshot),
  };
}

export function joinParticipant(stored: StoredParticipant, battleId: string): BattleParticipant {
  return upgradeLegacyParticipant(joinRaw(stored, battleId));
}

function joinRaw(stored: StoredParticipant, battleId: string): BattleParticipant {
  const { columns: c, state } = stored;

  const s = stored.snapshot as {
    basicInfo: Record<string, unknown>;
    abilities: Record<string, unknown>;
    combatStats: Record<string, unknown>;
    spellcasting: Record<string, unknown> & { spellSlots?: Record<string, { max: number }> };
    battleData: Record<string, unknown>;
  };

  const spellSlots: Record<string, { max: number; current: number }> = {};

  for (const [level, slot] of Object.entries(s.spellcasting.spellSlots ?? {})) {
    spellSlots[level] = { max: slot.max, current: state.spellSlotsCurrent[level] ?? slot.max };
  }

  return {
    basicInfo: {
      ...s.basicInfo,
      id: c.id,
      battleId,
      sourceId: c.sourceId,
      sourceType: c.sourceType,
      side: c.side,
      controlledBy: c.controlledBy,
    },
    abilities: { ...s.abilities, initiative: c.initiative },
    combatStats: {
      ...s.combatStats,
      currentHp: c.currentHp,
      tempHp: c.tempHp,
      maxHp: c.maxHp,
      morale: c.morale,
      status: c.status,
    },
    spellcasting: { ...s.spellcasting, spellSlots },
    battleData: {
      ...s.battleData,
      activeEffects: state.activeEffects,
      ...(state.abilityUsage !== undefined && { abilityUsage: state.abilityUsage }),
      ...(state.skillUsageCounts !== undefined && { skillUsageCounts: state.skillUsageCounts }),
      ...(state.pendingExtraActions !== undefined && { pendingExtraActions: state.pendingExtraActions }),
    },
    actionFlags: {
      hasUsedAction: c.hasUsedAction,
      hasUsedBonusAction: c.hasUsedBonusAction,
      hasUsedReaction: c.hasUsedReaction,
      hasExtraTurn: c.hasExtraTurn,
    },
  } as BattleParticipant;
}

// Учасник, збережений до 3a: вміння виводяться зі старих полів snapshot.
export function upgradeLegacyParticipant(p: BattleParticipant): BattleParticipant {
  const bd = p.battleData as BattleParticipant["battleData"] & Record<string, unknown>;

  if (Array.isArray(bd.resolvedAbilities)) return p;

  const { activeSkills: _a, racialAbilities: _r, passiveAbilities: _p, skillUsageCounts: _s, ...rest } = bd;

  void [_a, _r, _p, _s];

  const legacy = convertLegacySnapshot(bd);

  return {
    ...p,
    battleData: {
      ...rest,
      resolvedAbilities: legacy.resolvedAbilities,
      spellEnhancers: legacy.spellEnhancers,
      abilityUsage: { ...legacy.abilityUsage, ...rest.abilityUsage },
    } as BattleParticipant["battleData"],
  };
}
