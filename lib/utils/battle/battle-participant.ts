/**
 * Утиліти для створення BattleParticipant з Character/Unit
 */

import type { Prisma } from "@prisma/client";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { ArtifactModifierType, DEFAULT_ARTIFACT_MODIFIERS } from "@/lib/constants/equipment";
import { prisma } from "@/lib/db";
import { SkillLevel } from "@/lib/types/skill-tree";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { ActiveSkill, BattleParticipant, EquippedArtifact, RacialAbility } from "@/types/battle";
import type { SkillTriggers } from "@/types/skill-triggers";

/**
 * Тип для модифікатора артефакта
 */
type ArtifactModifier = {
  type: string;
  value: number;
  isPercentage?: boolean;
};

/**
 * Отримує значення модифікатора артефакта як рядок
 * @param modifiers - масив модифікаторів
 * @param modifierType - тип модифікатора
 * @param defaultValue - дефолтне значення, якщо модифікатор не знайдено
 * @returns значення модифікатора як рядок або дефолтне значення
 */
function getModifierValue(
  modifiers: ArtifactModifier[],
  modifierType: ArtifactModifierType,
  defaultValue: string
): string {
  return modifiers.find((m) => m.type === modifierType)?.value?.toString() || defaultValue;
}

/**
 * Отримує опціональне значення модифікатора артефакта як рядок
 * @param modifiers - масив модифікаторів
 * @param modifierType - тип модифікатора
 * @returns значення модифікатора як рядок або undefined, якщо не знайдено
 */
function getOptionalModifierValue(
  modifiers: ArtifactModifier[],
  modifierType: ArtifactModifierType
): string | undefined {
  return modifiers.find((m) => m.type === modifierType)?.value?.toString();
}

/**
 * Тип для атаки, витягнутої з екіпірованої зброї
 */
type ExtractedAttack = {
  id: string;
  name: string;
  type: AttackType;
  attackBonus: number;
  damageDice: string;
  damageType: string;
  range?: string;
  properties?: string;
};

// Типи для Prisma моделей
type CharacterFromPrisma = Prisma.CharacterGetPayload<{
  include: {
    inventory?: true;
    characterSkills?: {
      include: {
        skillTree?: true;
      };
    };
  };
}>;

type UnitFromPrisma = Prisma.UnitGetPayload<Record<string, never>>;

/**
 * Створює BattleParticipant з Character
 * Завантажує всі необхідні дані: скіли, артефакти, заклинання
 */
export async function createBattleParticipantFromCharacter(
  character: CharacterFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber?: number
): Promise<BattleParticipant> {
  const modifiers = {
    strength: getAbilityModifier(character.strength),
    dexterity: getAbilityModifier(character.dexterity),
    constitution: getAbilityModifier(character.constitution),
    intelligence: getAbilityModifier(character.intelligence),
    wisdom: getAbilityModifier(character.wisdom),
    charisma: getAbilityModifier(character.charisma),
  };

  // Розбираємо skillTreeProgress для активних скілів
  const activeSkills = await extractActiveSkillsFromCharacter(
    character,
    character.campaignId
  );

  // Розбираємо inventory для екіпірованих артефактів
  const equippedArtifacts = await extractEquippedArtifactsFromCharacter(
    character
  );

  // Витягуємо атаки з екіпірованої зброї
  const attacks = await extractAttacksFromCharacter(character);

  // Завантажуємо расові здібності
  const racialAbilities = await extractRacialAbilities(
    character.race,
    character.campaignId
  );

  return {
    basicInfo: {
      id: `${character.id}-${instanceNumber || 0}-${Date.now()}`,
      battleId,
      sourceId: character.id,
      sourceType: "character",
      instanceNumber: instanceNumber || undefined,
      instanceId: instanceNumber ? `${character.id}-${instanceNumber - 1}` : undefined,
      name: character.name,
      avatar: character.avatar || undefined,
      side,
      controlledBy: character.controlledBy || "dm",
    },
    abilities: {
      level: character.level,
      initiative: character.initiative,
      baseInitiative: character.initiative,
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
      modifiers,
      proficiencyBonus: character.proficiencyBonus,
      race: character.race,
    },
    combatStats: {
      maxHp: character.maxHp,
      currentHp: character.currentHp,
      tempHp: character.tempHp || 0,
      armorClass: character.armorClass,
      speed: character.speed,
      morale: (character as { morale?: number }).morale || 0,
      status: character.currentHp <= 0 ? "dead" : "active",
    },
    spellcasting: {
      spellcastingClass: character.spellcastingClass || undefined,
      spellcastingAbility: character.spellcastingAbility as "intelligence" | "wisdom" | "charisma" | undefined,
      spellSaveDC: character.spellSaveDC || undefined,
      spellAttackBonus: character.spellAttackBonus || undefined,
      spellSlots: (character.spellSlots as Record<string, { max: number; current: number }>) || {},
      knownSpells: (character.knownSpells as string[]) || [],
    },
    battleData: {
      attacks,
      activeEffects: [],
      passiveAbilities: [], // TODO: Розпакувати з артефактів, скілів
      racialAbilities,
      activeSkills,
      equippedArtifacts,
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };
}

/**
 * Створює BattleParticipant з Unit
 */
export async function createBattleParticipantFromUnit(
  unit: UnitFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber: number
): Promise<BattleParticipant> {
  const modifiers = {
    strength: getAbilityModifier(unit.strength),
    dexterity: getAbilityModifier(unit.dexterity),
    constitution: getAbilityModifier(unit.constitution),
    intelligence: getAbilityModifier(unit.intelligence),
    wisdom: getAbilityModifier(unit.wisdom),
    charisma: getAbilityModifier(unit.charisma),
  };

  // Розбираємо атаки з JSON
  const attacks = (unit.attacks as Array<{
    name: string;
    attackBonus: number;
    damageDice: string;
    damageType: string;
    type?: AttackType;
    range?: string;
    properties?: string;
  }>) || [];

  const battleAttacks = attacks.map((attack, index) => ({
    id: (attack as { id?: string }).id || `${unit.id}-attack-${index}`,
    name: attack.name,
    type: (attack.type || AttackType.MELEE) as AttackType,
    attackBonus: attack.attackBonus,
    damageDice: attack.damageDice,
    damageType: attack.damageType,
    range: attack.range,
    properties: attack.properties,
  }));

  // Завантажуємо расові здібності (синхронно, бо функція не async)
  let racialAbilities: RacialAbility[] = [];

  if (unit.race) {
    try {
      racialAbilities = await extractRacialAbilities(unit.race, unit.campaignId);
    } catch (error) {
      console.error("Error extracting racial abilities:", error);
      racialAbilities = [];
    }
  }

  return {
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
      currentHp: unit.maxHp, // Units завжди починають з maxHp
      tempHp: 0,
      armorClass: unit.armorClass,
      speed: unit.speed,
      morale: (unit as { morale?: number }).morale || 0,
      status: "active",
    },
    spellcasting: {
      spellcastingClass: undefined,
      spellcastingAbility: undefined,
      spellSaveDC: undefined,
      spellAttackBonus: undefined,
      spellSlots: {},
      knownSpells: (unit.knownSpells as string[]) || [],
    },
    battleData: {
      attacks: battleAttacks,
      activeEffects: [],
      passiveAbilities: [], // TODO: Розпакувати з specialAbilities
      racialAbilities,
      activeSkills: [], // Units не мають скілів з дерева прокачки
      equippedArtifacts: [],
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };
}

/**
 * Витягує активні скіли з character.skillTreeProgress та characterSkills
 * Завантажує деталі скілів з БД
 */
async function extractActiveSkillsFromCharacter(
  character: CharacterFromPrisma,
  campaignId: string
): Promise<ActiveSkill[]> {
  const activeSkills: ActiveSkill[] = [];

  // Розбираємо skillTreeProgress (JSON об'єкт)
  const skillTreeProgress = (character.skillTreeProgress as Record<
    string,
    {
      level?: SkillLevel;
      unlockedSkills?: string[];
    }
  >) || {};

  // Збираємо всі skillIds для масового завантаження
  const allSkillIds: string[] = [];

  const skillIdToMainSkill: Record<string, string> = {};

  const skillIdToLevel: Record<string, SkillLevel> = {};

  for (const [mainSkillId, progress] of Object.entries(skillTreeProgress)) {
    if (!progress.unlockedSkills || progress.unlockedSkills.length === 0) {
      continue;
    }

    for (const skillId of progress.unlockedSkills) {
      allSkillIds.push(skillId);
      skillIdToMainSkill[skillId] = mainSkillId;
      skillIdToLevel[skillId] = progress.level || SkillLevel.BASIC;
    }
  }

  // Якщо немає скілів, повертаємо порожній масив
  if (allSkillIds.length === 0) {
    return activeSkills;
  }

  // Завантажуємо всі скіли одним запитом
  const skills = await prisma.skill.findMany({
    where: {
      id: { in: allSkillIds },
      campaignId: campaignId,
    },
  });

  // Створюємо мапу для швидкого пошуку
  const skillsMap = new Map(skills.map((s) => [s.id, s]));

  // Створюємо ActiveSkill для кожного скілу
  for (const skillId of allSkillIds) {
    const skill = skillsMap.get(skillId);

    if (!skill) {
      // Якщо скіл не знайдено, створюємо базову структуру
      activeSkills.push({
        skillId,
        name: `Unknown Skill (${skillId})`,
        mainSkillId: skillIdToMainSkill[skillId],
        level: skillIdToLevel[skillId],
        effects: [],
        spellEnhancements: undefined,
      });
      continue;
    }

    // Розпаковуємо bonuses в effects
    const bonuses = (skill.bonuses as Record<string, number>) || {};

    const effects = Object.entries(bonuses).map(([type, value]) => ({
      type,
      value,
      isPercentage: type.includes("percent") || type.includes("_percent"),
    }));

    // Формуємо spellEnhancements якщо є покращення заклинання
    let spellEnhancements: ActiveSkill["spellEnhancements"] | undefined;

    const enhancementTypes =
      (skill.spellEnhancementTypes as string[]) || [];
    
    if (
      enhancementTypes.length > 0 ||
      skill.spellEffectIncrease ||
      skill.spellTargetChange ||
      skill.spellAdditionalModifier ||
      skill.spellNewSpellId
    ) {
      spellEnhancements = {};

      if (skill.spellEffectIncrease) {
        spellEnhancements.spellEffectIncrease = skill.spellEffectIncrease;
      }

      if (skill.spellTargetChange) {
        const targetChange =
          skill.spellTargetChange as unknown as { target: string };

        if (targetChange && typeof targetChange === "object" && "target" in targetChange) {
          spellEnhancements.spellTargetChange = {
            target: targetChange.target,
          };
        }
      }

      if (skill.spellAdditionalModifier) {
        const additionalModifier = skill.spellAdditionalModifier as unknown as {
          modifier?: string;
          damageDice?: string;
          duration?: number;
        };

        if (
          additionalModifier &&
          typeof additionalModifier === "object"
        ) {
          spellEnhancements.spellAdditionalModifier = {
            modifier: additionalModifier.modifier,
            damageDice: additionalModifier.damageDice,
            duration: additionalModifier.duration,
          };
        }
      }

      if (skill.spellNewSpellId) {
        spellEnhancements.spellNewSpellId = skill.spellNewSpellId;
      }
    }

    // Завантажуємо тригери скіла
    // Безпечно парсимо JSON поле з Prisma
    let skillTriggers: SkillTriggers | undefined;

    const skillTriggersValue = (skill as Record<string, unknown>).skillTriggers;

    if (skillTriggersValue && Array.isArray(skillTriggersValue)) {
      skillTriggers = skillTriggersValue as SkillTriggers;
    }

    activeSkills.push({
      skillId: skill.id,
      name: skill.name,
      mainSkillId: skillIdToMainSkill[skillId],
      level: skillIdToLevel[skillId],
      effects,
      spellEnhancements,
      skillTriggers,
    });
  }

  return activeSkills;
}

/**
 * Витягує атаки з екіпірованої зброї (артефактів зі слота "weapon")
 */
async function extractAttacksFromCharacter(
  character: CharacterFromPrisma
): Promise<ExtractedAttack[]> {
  const attacks: ExtractedAttack[] = [];

  if (!character.inventory) {
    return attacks;
  }

  const equipped = (character.inventory.equipped as Record<string, string>) || {};

  const weaponId = equipped.weapon || equipped.weapon1 || equipped.weapon2;

  if (!weaponId) {
    return attacks;
  }

  // Завантажуємо зброю з БД
  const weapon = await prisma.artifact.findUnique({
    where: {
      id: weaponId,
      campaignId: character.campaignId,
    },
  });

  if (!weapon || weapon.slot !== "weapon") {
    return attacks;
  }

  // Розбираємо modifiers для атаки
  const modifiers = (weapon.modifiers as ArtifactModifier[]) || [];

  // Знаходимо дані атаки в modifiers або bonuses
  const bonuses = (weapon.bonuses as Record<string, number>) || {};
  
  // Базові значення (можна налаштувати пізніше)
  const attackBonus = bonuses.attackBonus || bonuses.attack || 0;

  const damageDice = getModifierValue(modifiers, ArtifactModifierType.DAMAGE_DICE, DEFAULT_ARTIFACT_MODIFIERS.DAMAGE_DICE);

  const damageType = getModifierValue(modifiers, ArtifactModifierType.DAMAGE_TYPE, DEFAULT_ARTIFACT_MODIFIERS.DAMAGE_TYPE);

  const attackType = getModifierValue(modifiers, ArtifactModifierType.ATTACK_TYPE, AttackType.MELEE);

  // Створюємо атаку з ID
  attacks.push({
    id: weapon.id,
    name: weapon.name,
    type: (attackType === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE) as AttackType,
    attackBonus,
    damageDice,
    damageType,
    range: getOptionalModifierValue(modifiers, ArtifactModifierType.RANGE),
    properties: getOptionalModifierValue(modifiers, ArtifactModifierType.PROPERTIES),
  });

  return attacks;
}

/**
 * Витягує екіпіровані артефакти з character.inventory
 * Завантажує деталі артефактів з БД
 */
async function extractEquippedArtifactsFromCharacter(
  character: CharacterFromPrisma
): Promise<EquippedArtifact[]> {
  const equippedArtifacts: EquippedArtifact[] = [];

  if (!character.inventory) {
    return equippedArtifacts;
  }

  const equipped = (character.inventory.equipped as Record<string, string>) || {};

  // Збираємо всі artifactIds для масового завантаження
  const artifactIds: string[] = [];

  const artifactIdToSlot: Record<string, string> = {};

  for (const [slot, artifactId] of Object.entries(equipped)) {
    if (typeof artifactId === "string" && artifactId) {
      artifactIds.push(artifactId);
      artifactIdToSlot[artifactId] = slot;
    }
  }

  // Якщо немає артефактів, повертаємо порожній масив
  if (artifactIds.length === 0) {
    return equippedArtifacts;
  }

  // Завантажуємо всі артефакти одним запитом
  const artifacts = await prisma.artifact.findMany({
    where: {
      id: { in: artifactIds },
      campaignId: character.campaignId,
    },
  });

  // Створюємо EquippedArtifact для кожного артефакту
  for (const artifact of artifacts) {
    const bonuses = (artifact.bonuses as Record<string, number>) || {};

    const modifiers = (artifact.modifiers as Array<{
      type: string;
      value: number;
      isPercentage?: boolean;
    }>) || [];

    equippedArtifacts.push({
      artifactId: artifact.id,
      name: artifact.name,
      slot: artifactIdToSlot[artifact.id] || artifact.slot,
      bonuses,
      modifiers,
      passiveAbility: artifact.passiveAbility
        ? (artifact.passiveAbility as Record<string, unknown>)
        : undefined,
    });
  }

  return equippedArtifacts;
}

/**
 * Витягує расові здібності з Race
 * @param raceName - назва раси
 * @param campaignId - ID кампанії
 * @returns масив расових здібностей
 */
async function extractRacialAbilities(
  raceName: string,
  campaignId: string
): Promise<RacialAbility[]> {
  const racialAbilities: RacialAbility[] = [];

  // Завантажуємо Race з БД
  const race = await prisma.race.findFirst({
    where: {
      campaignId,
      name: raceName,
    },
  });

  if (!race || !race.passiveAbility) {
    return racialAbilities;
  }

  // Розпаковуємо passiveAbility
  const passiveAbility = race.passiveAbility as Record<string, unknown>;

  // Створюємо базову расову здібність з passiveAbility
  if (typeof passiveAbility === "object" && passiveAbility !== null) {
    racialAbilities.push({
      id: `race_${race.id}_ability`,
      name: `Расові здібності: ${raceName}`,
      effect: passiveAbility,
    });

    // Додаткові розбірки для імунітетів та опору
    // (вже буде використано через hasImmunity/getResistance)
  }

  return racialAbilities;
}
