/**
 * Створення BattleParticipant з Unit
 */

import type { Prisma } from "@prisma/client";

import type { UnitFromPrisma } from "../types/participant";
import { loadRace } from "./load-race";

import { AttackType, ParticipantSourceType } from "@/lib/constants/battle";
import { ParticipantSide } from "@/lib/constants/battle";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectUnitAbilities } from "@/lib/utils/abilities/build/collect";
import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { logger } from "@/lib/utils/logger";
import { getUnitImmunities } from "@/lib/utils/races/race-effects";
import type { BattleParticipant } from "@/types/battle";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

/**
 * Створює BattleParticipant з Unit
 */
export async function createBattleParticipantFromUnit(
  unit: UnitFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber: number,
  racesByName?: Record<string, Prisma.RaceGetPayload<object> | null>,
): Promise<BattleParticipant> {
  const modifiers = {
    strength: getAbilityModifier(unit.strength),
    dexterity: getAbilityModifier(unit.dexterity),
    constitution: getAbilityModifier(unit.constitution),
    intelligence: getAbilityModifier(unit.intelligence),
    wisdom: getAbilityModifier(unit.wisdom),
    charisma: getAbilityModifier(unit.charisma),
  };

  const attacks =
    (unit.attacks as Array<{
      name: string;
      attackBonus: number;
      damageDice: string;
      damageType: string;
      type?: AttackType;
      range?: string;
      properties?: string;
    }>) || [];

  const battleAttacks = attacks.map((attack, index) => {
    const rawType = (attack as { type?: string }).type;

    const attackType: AttackType =
      rawType === "ranged"
        ? AttackType.RANGED
        : rawType === "melee"
          ? AttackType.MELEE
          : attack.range && !/^5\s*(фт|ft)/i.test(attack.range)
            ? AttackType.RANGED
            : AttackType.MELEE;

    const a = attack as {
      targetType?: string;
      maxTargets?: number;
      damageDistribution?: number[];
      guaranteedDamage?: number;
    };

    return {
      id: (attack as { id?: string }).id || `${unit.id}-attack-${index}`,
      name: attack.name,
      type: attackType,
      attackBonus: attack.attackBonus,
      damageDice: attack.damageDice,
      damageType: attack.damageType,
      range: attack.range,
      properties: attack.properties,
      targetType:
        a.targetType === "aoe"
          ? ("aoe" as const)
          : a.targetType === "target"
            ? ("target" as const)
            : undefined,
      maxTargets: a.maxTargets,
      damageDistribution: a.damageDistribution,
      guaranteedDamage: a.guaranteedDamage,
    };
  });

  let race: Awaited<ReturnType<typeof loadRace>> = null;

  try {
    race = await loadRace(unit.race, unit.campaignId, racesByName ? (racesByName[unit.race ?? ""] ?? null) : undefined);
  } catch (error) {
    logger.error("[battle/from-unit] load race failed", { unitId: unit.id, race: unit.race, campaignId: unit.campaignId }, error);
  }

  const participant: BattleParticipant = {
    basicInfo: {
      id: `${unit.id}-${instanceNumber}-${Date.now()}`,
      battleId,
      sourceId: unit.id,
      sourceType: ParticipantSourceType.UNIT,
      instanceNumber,
      instanceId: `${unit.id}-${instanceNumber - 1}`,
      name: `${unit.name} #${instanceNumber}`,
      avatar: unit.avatar || undefined,
      side,
      controlledBy: "dm",
    },
    abilities: {
      level: unit.level,
      initiative: unit.initiative,
      baseInitiative: unit.initiative,
      strength: unit.strength,
      dexterity: unit.dexterity,
      constitution: unit.constitution,
      intelligence: unit.intelligence,
      wisdom: unit.wisdom,
      charisma: unit.charisma,
      modifiers,
      proficiencyBonus: unit.proficiencyBonus,
      race: unit.race || "",
    },
    combatStats: {
      maxHp: unit.maxHp,
      currentHp: unit.maxHp,
      tempHp: 0,
      armorClass: unit.armorClass,
      speed: unit.speed,
      morale: (unit as { morale?: number }).morale || 0,
      status: "active",
      minTargets: unit.minTargets ?? 1,
      maxTargets: unit.maxTargets ?? 1,
    },
    spellcasting: {
      spellcastingClass: undefined,
      spellcastingAbility: undefined,
      spellSaveDC: undefined,
      spellAttackBonus: undefined,
      spellSlots: { universal: { max: 3, current: 3 } },
      knownSpells: (unit.knownSpells as string[]) || [],
    },
    battleData: {
      attacks: battleAttacks,
      activeEffects: [],
      equippedArtifacts: [],
      resolvedAbilities: [
        ...collectUnitAbilities(unit, race),
        ...immunityAbilities(getUnitImmunities(unit as unknown as Unit, race as unknown as Race | null), { type: "unit", id: unit.id }),
      ],
      spellEnhancers: [],
      abilityUsage: {},
      pendingExtraActions: 0,
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  return bakePassives(participant);
}
