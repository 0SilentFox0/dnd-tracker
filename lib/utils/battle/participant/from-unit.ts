/**
 * Створення BattleParticipant з Unit
 */

import type { Prisma } from "@prisma/client";

import type { UnitFromPrisma } from "../types/participant";
import { extractRacialAbilities } from "./extract-racial";

import { AttackType } from "@/lib/constants/battle";
import { ParticipantSide } from "@/lib/constants/battle";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { logger } from "@/lib/utils/logger";
import type { BattleParticipant, RacialAbility } from "@/types/battle";

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

  let racialAbilities: RacialAbility[] = [];

  if (unit.race) {
    try {
      racialAbilities = await extractRacialAbilities(
        unit.race,
        unit.campaignId,
        racesByName?.[unit.race] ?? undefined,
      );
    } catch (error) {
      logger.error(
        "[battle/from-unit] extract racial abilities failed",
        { unitId: unit.id, race: unit.race, campaignId: unit.campaignId },
        error,
      );
      racialAbilities = [];
    }
  }

  const participant: BattleParticipant = {
    basicInfo: {
      id: `${unit.id}-${instanceNumber}-${Date.now()}`,
      battleId,
      sourceId: unit.id,
      sourceType: "unit",
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
      passiveAbilities: [],
      racialAbilities,
      activeSkills: [],
      equippedArtifacts: [],
      skillUsageCounts: {},
      pendingExtraActions: 0,
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  let minTargetsBonus = 0;

  let maxTargetsBonus = 0;

  for (const racial of participant.battleData.racialAbilities) {
    if (typeof racial.effect === "object" && racial.effect !== null) {
      const effect = racial.effect as Record<string, unknown>;

      if (typeof effect.min_targets === "number")
        minTargetsBonus += effect.min_targets;

      if (typeof effect.max_targets === "number")
        maxTargetsBonus += effect.max_targets;

      if (typeof effect.minTargets === "number")
        minTargetsBonus += effect.minTargets;

      if (typeof effect.maxTargets === "number")
        maxTargetsBonus += effect.maxTargets;
    }
  }

  participant.combatStats.minTargets += minTargetsBonus;
  participant.combatStats.maxTargets += maxTargetsBonus;

  return participant;
}
