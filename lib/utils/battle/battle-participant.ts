/**
 * Утиліти для створення BattleParticipant з Character/Unit
 */

import type { Prisma } from "@prisma/client";

import {
  ArtifactModifierType,
  DEFAULT_ARTIFACT_MODIFIERS,
} from "@/lib/constants/artifacts";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { getHeroMaxHp } from "@/lib/constants/hero-scaling";
import { prisma } from "@/lib/db";
import { SkillLevel } from "@/lib/types/skill-tree";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { evaluateFormula as evaluateFormulaSafe } from "@/lib/utils/battle/formula-evaluator";
import { convertPrismaToSkillTree } from "@/lib/utils/skills/skill-tree-mock";
import {
  getLearnedSpellIdsFromProgress,
  getLearnedSpellIdsFromTree,
} from "@/lib/utils/spells/spell-learning";
import { calculateSpellSlotsForLevel } from "@/lib/utils/spells/spell-slots";
import {
  ActiveSkill,
  BattleParticipant,
  EquippedArtifact,
  RacialAbility,
  SkillEffect,
} from "@/types/battle";
import type { SpellSlotProgression } from "@/types/races";
import type { SkillTriggers } from "@/types/skill-triggers";
import type { Skill } from "@/types/skills";
import type { Spell } from "@/types/spells";

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
  defaultValue: string,
): string {
  return (
    modifiers.find((m) => m.type === modifierType)?.value?.toString() ||
    defaultValue
  );
}

/**
 * Отримує опціональне значення модифікатора артефакта як рядок
 * @param modifiers - масив модифікаторів
 * @param modifierType - тип модифікатора
 * @returns значення модифікатора як рядок або undefined, якщо не знайдено
 */
function getOptionalModifierValue(
  modifiers: ArtifactModifier[],
  modifierType: ArtifactModifierType,
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
  minTargets?: number;
  maxTargets?: number;
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

/** Опціональний контекст для batch-завантаження: спільні дані кампанії (скіли, заклинання, раси, артефакти) */
export interface CampaignSpellContext {
  skillTreeByRace: Record<string, Prisma.SkillTreeGetPayload<object> | null>;
  mainSkills: Array<{ id: string; spellGroupId: string | null; name: string }>;
  spells: Array<Prisma.SpellGetPayload<{ include: { spellGroup: { select: { id: true } } } }>>;
  allSkills: Array<Prisma.SkillGetPayload<{ include: { spellGroup: { select: { id: true } } } }>>;
  racesByName: Record<string, Prisma.RaceGetPayload<object> | null>;
  campaign: { maxLevel: number };
  /** Pre-loaded скіли по id (для batch start) */
  skillsById?: Record<string, Prisma.SkillGetPayload<object>>;
  /** Pre-loaded артефакти по id (для batch start) */
  artifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>;
}

/**
 * Створює BattleParticipant з Character
 * Завантажує всі необхідні дані: скіли, артефакти, заклинання
 * @param context - опціональний контекст з pre-loaded даними кампанії (для batch start battle)
 */
export async function createBattleParticipantFromCharacter(
  character: CharacterFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber?: number,
  context?: CampaignSpellContext,
): Promise<BattleParticipant> {
  const modifiers = {
    strength: getAbilityModifier(character.strength),
    dexterity: getAbilityModifier(character.dexterity),
    constitution: getAbilityModifier(character.constitution),
    intelligence: getAbilityModifier(character.intelligence),
    wisdom: getAbilityModifier(character.wisdom),
    charisma: getAbilityModifier(character.charisma),
  };

  // Розбираємо skillTreeProgress для активних скілів (з контексту якщо передано)
  const activeSkills = await extractActiveSkillsFromCharacter(
    character,
    character.campaignId,
    context?.skillsById,
  );

  // Розбираємо inventory для екіпірованих артефактів
  const equippedArtifacts = await extractEquippedArtifactsFromCharacter(
    character,
    context?.artifactsById,
  );

  // Витягуємо атаки з екіпірованої зброї
  const attacks = await extractAttacksFromCharacter(
    character,
    context?.artifactsById,
  );

  // Завантажуємо расові здібності (з контексту якщо передано)
  const racialAbilities = await extractRacialAbilities(
    character.race,
    character.campaignId,
    context?.racesByName[character.race] ?? undefined,
  );

  // Заклинання: character.knownSpells (нормалізовані до string[]) + з дерева скілів
  const rawKnown = character.knownSpells;

  const baseKnownSpells = Array.isArray(rawKnown)
    ? (rawKnown as unknown[]).map((id) => String(id)).filter(Boolean)
    : [];

  let knownSpells = baseKnownSpells;

  try {
    const progress =
      (character.skillTreeProgress as Record<
        string,
        { unlockedSkills?: string[] }
      >) ?? {};

    const rawSkillTree = context
      ? context.skillTreeByRace[character.race] ?? null
      : await prisma.skillTree.findFirst({
          where: {
            campaignId: character.campaignId,
            race: character.race,
          },
        });

    const mainSkills = context
      ? context.mainSkills
      : await prisma.mainSkill.findMany({
          where: { campaignId: character.campaignId },
          select: { id: true, spellGroupId: true, name: true },
        });

    const spells = context
      ? context.spells
      : await prisma.spell.findMany({
          where: { campaignId: character.campaignId },
          include: { spellGroup: { select: { id: true } } },
        });

    const allSkills = context
      ? context.allSkills
      : await prisma.skill.findMany({
          where: { campaignId: character.campaignId },
          include: { spellGroup: { select: { id: true } } },
        });

    const spellsForLearning = spells as unknown as Spell[];

    const skillsForLearning = allSkills as unknown as Skill[];

    let learnedFromTree: string[] = [];

    if (rawSkillTree && Object.keys(progress).length > 0) {

      const skillTree = convertPrismaToSkillTree({
        ...rawSkillTree,
        createdAt:
          rawSkillTree.createdAt instanceof Date
            ? rawSkillTree.createdAt
            : new Date(rawSkillTree.createdAt),
      });

      if (skillTree && mainSkills.length > 0 && skillsForLearning.length > 0 && spellsForLearning.length > 0) {
        const treeWithSpellGroups = {
          ...skillTree,
          mainSkills: skillTree.mainSkills.map((ms) => {
            const apiMs = mainSkills.find((m) => m.id === ms.id);

            return apiMs?.spellGroupId
              ? { ...ms, spellGroupId: apiMs.spellGroupId }
              : ms;
          }),
        };

        learnedFromTree = getLearnedSpellIdsFromTree(
          treeWithSpellGroups,
          progress,
          skillsForLearning,
          spellsForLearning,
        );
      }
    }

    if (learnedFromTree.length === 0) {
      const librarySkills = skillsForLearning.filter(
        (s) => s.spellGroupId != null,
      );

      learnedFromTree = getLearnedSpellIdsFromProgress(
        progress,
        mainSkills,
        spellsForLearning,
        librarySkills,
      );
    }

    if (learnedFromTree.length > 0) {
      knownSpells = Array.from(
        new Set([...baseKnownSpells, ...learnedFromTree]),
      );
    }
  } catch (e) {
    console.error("Error loading learned spells from tree:", e);
  }

  // Магічні слоти: з персонажа або з раси (spellSlotProgression)
  const existingSlots = (character.spellSlots as Record<
    string,
    { max: number; current: number }
  >) || {};

  let resolvedSpellSlots: Record<string, { max: number; current: number }> = {};

  if (Object.keys(existingSlots).length > 0) {

    resolvedSpellSlots = Object.fromEntries(
      Object.entries(existingSlots).map(([k, v]) => [
        k,
        { max: v.max, current: v.current ?? v.max },
      ]),
    );
  } else {
    const race = context
      ? context.racesByName[character.race]
      : await prisma.race.findFirst({
          where: {
            campaignId: character.campaignId,
            name: character.race,
          },
        });

    const campaign = context
      ? context.campaign
      : await prisma.campaign.findUnique({
          where: { id: character.campaignId },
          select: { maxLevel: true },
        });

    const progression = (race?.spellSlotProgression
      ? (Array.isArray(race.spellSlotProgression)
          ? (race.spellSlotProgression as unknown as SpellSlotProgression[])
          : [])
      : []) as SpellSlotProgression[];

    const maxLevel = campaign?.maxLevel ?? 20;

    const computed = calculateSpellSlotsForLevel(
      character.level,
      maxLevel,
      progression,
    );

    resolvedSpellSlots = Object.fromEntries(
      Object.entries(computed).map(([k, v]) => [
        k,
        { max: v.max, current: v.max },
      ]),
    );
  }

  const participant: BattleParticipant = {
    basicInfo: {
      id: `${character.id}-${instanceNumber || 0}-${Date.now()}`,
      battleId,
      sourceId: character.id,
      sourceType: "character",
      instanceNumber: instanceNumber || undefined,
      instanceId: instanceNumber
        ? `${character.id}-${instanceNumber - 1}`
        : undefined,
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
    combatStats: (() => {
      const hpMult = (character as { hpMultiplier?: number | null }).hpMultiplier ?? 1;
      const computedMaxHp = getHeroMaxHp(character.level, character.strength, {
        hpMultiplier: hpMult,
      });

      // На початку бою завжди повне здоровʼя; під час бою maxHp може тимчасово знижуватись (наприклад, лікування -10% maxHP)
      return {
        maxHp: computedMaxHp,
        currentHp: computedMaxHp,
        tempHp: 0,
        armorClass: character.armorClass,
        speed: character.speed,
        morale: (character as { morale?: number }).morale || 0,
        status: computedMaxHp <= 0 ? "dead" : "active",
        minTargets: character.minTargets ?? 1,
        maxTargets: character.maxTargets ?? 1,
      };
    })(),
    spellcasting: {
      spellcastingClass: character.spellcastingClass || undefined,
      spellcastingAbility: character.spellcastingAbility as
        | "intelligence"
        | "wisdom"
        | "charisma"
        | undefined,
      spellSaveDC: character.spellSaveDC || undefined,
      spellAttackBonus: character.spellAttackBonus || undefined,
      spellSlots: resolvedSpellSlots,
      knownSpells,
    },
    battleData: {
      attacks,
      activeEffects: [],
      passiveAbilities: [],
      racialAbilities,
      activeSkills,
      equippedArtifacts,
      skillUsageCounts: {},
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  // Застосовуємо бонуси до minTargets/maxTargets з скілів та артефактів
  let minTargetsBonus = 0;

  let maxTargetsBonus = 0;

  // Бонуси зі скілів
  for (const skill of participant.battleData.activeSkills) {
    for (const effect of skill.effects) {
      if (
        effect.stat === "min_targets" ||
        effect.stat === "min_targets_bonus"
      ) {
        minTargetsBonus += typeof effect.value === "number" ? effect.value : 0;
      }

      if (
        effect.stat === "max_targets" ||
        effect.stat === "max_targets_bonus"
      ) {
        maxTargetsBonus += typeof effect.value === "number" ? effect.value : 0;
      }
    }
  }

  // Бонуси з артефактів
  for (const artifact of participant.battleData.equippedArtifacts) {
    if (artifact.bonuses.minTargets)
      minTargetsBonus += artifact.bonuses.minTargets;

    if (artifact.bonuses.maxTargets)
      maxTargetsBonus += artifact.bonuses.maxTargets;

    for (const modifier of artifact.modifiers) {
      if (
        modifier.type === "min_targets" ||
        modifier.type === ArtifactModifierType.MIN_TARGETS
      ) {
        minTargetsBonus += modifier.value;
      }

      if (
        modifier.type === "max_targets" ||
        modifier.type === ArtifactModifierType.MAX_TARGETS
      ) {
        maxTargetsBonus += modifier.value;
      }
    }
  }

  participant.combatStats.minTargets += minTargetsBonus;
  participant.combatStats.maxTargets += maxTargetsBonus;

  // Застосовуємо пасивні ефекти скілів (resistance, hp_bonus, morale, crit_threshold, тощо)
  applyPassiveSkillEffects(participant);

  return participant;
}

/**
 * Застосовує пасивні (trigger: "passive") ефекти скілів до учасника бою при ініціалізації.
 * Змінює combatStats та зберігає дані у battleData для подальшого використання.
 */
export function applyPassiveSkillEffects(participant: BattleParticipant): void {
  for (const skill of participant.battleData.activeSkills) {
    // Тільки пасивні скіли
    const isPassive = skill.skillTriggers?.some(
      (t) => t.type === "simple" && t.trigger === "passive",
    );

    if (!isPassive) continue;

    for (const effect of skill.effects) {
      const numValue = typeof effect.value === "number" ? effect.value : 0;

      switch (effect.stat) {
        // --- HP бонус (формула або flat) ---
        case "hp_bonus": {
          let bonus = 0;

          if (effect.type === "formula" && typeof effect.value === "string") {
            bonus = evaluateFormula(effect.value, participant);
          } else {
            bonus = numValue;
          }

          participant.combatStats.maxHp += bonus;
          participant.combatStats.currentHp += bonus;
          break;
        }

        // --- Резисти (зберігаються в окремих полях для damage calc) ---
        case "physical_resistance":
        case "spell_resistance":
        case "all_resistance": {
          // Зберігаємо в розширених даних учасника
          const resistances = getParticipantResistances(participant);

          if (effect.stat === "physical_resistance") {
            resistances.physical = Math.min(
              100,
              (resistances.physical ?? 0) + numValue,
            );
          } else if (effect.stat === "spell_resistance") {
            resistances.spell = Math.min(
              100,
              (resistances.spell ?? 0) + numValue,
            );
          } else if (effect.stat === "all_resistance") {
            resistances.physical = Math.min(
              100,
              (resistances.physical ?? 0) + numValue,
            );
            resistances.spell = Math.min(
              100,
              (resistances.spell ?? 0) + numValue,
            );
          }

          setParticipantResistances(participant, resistances);
          break;
        }

        // --- Мораль ---
        case "morale": {
          if (effect.type === "min") {
            // Встановлюємо мінімум моралі
            const minMorale = numValue;

            if (participant.combatStats.morale < minMorale) {
              participant.combatStats.morale = minMorale;
            }

            // Зберігаємо мінімум для подальшого використання
            const ext = getParticipantExtras(participant);

            ext.minMorale = Math.max(ext.minMorale ?? -Infinity, minMorale);
            setParticipantExtras(participant, ext);
          } else {
            participant.combatStats.morale += numValue;
          }

          break;
        }

        // --- Крит-поріг ---
        case "crit_threshold": {
          const ext = getParticipantExtras(participant);

          ext.critThreshold = Math.min(ext.critThreshold ?? 20, numValue);
          setParticipantExtras(participant, ext);
          break;
        }

        // --- Рівень заклинань ---
        case "spell_levels": {
          const ext = getParticipantExtras(participant);

          ext.maxSpellLevel = Math.max(ext.maxSpellLevel ?? 0, numValue);
          setParticipantExtras(participant, ext);
          break;
        }

        // --- Додаткові слоти ---
        case "spell_slots_lvl4_5": {
          // Додаємо слоти 4 та 5 рівня
          for (const lvl of ["4", "5"]) {
            const slot = participant.spellcasting.spellSlots[lvl];

            if (slot) {
              slot.max += numValue;
              slot.current += numValue;
            } else {
              participant.spellcasting.spellSlots[lvl] = {
                max: numValue,
                current: numValue,
              };
            }
          }
          break;
        }

        // --- Disadvantage на ворожі атаки ---
        case "enemy_attack_disadvantage": {
          const ext = getParticipantExtras(participant);

          ext.enemyAttackDisadvantage = true;
          setParticipantExtras(participant, ext);
          break;
        }

        // --- Advantage на всі кидки ---
        case "advantage": {
          const ext = getParticipantExtras(participant);

          ext.advantageOnAllRolls = true;
          setParticipantExtras(participant, ext);
          break;
        }

        // --- Цілі для заклинань 4-5 рівня ---
        case "spell_targets_lvl4_5": {
          const ext = getParticipantExtras(participant);

          ext.spellTargetsLvl45 = (ext.spellTargetsLvl45 ?? 1) + numValue;
          setParticipantExtras(participant, ext);
          break;
        }

        // --- Заклинання світла на всіх союзників ---
        case "light_spells_target_all_allies": {
          const ext = getParticipantExtras(participant);

          ext.lightSpellsTargetAllAllies = true;
          setParticipantExtras(participant, ext);
          break;
        }

        // --- Контроль юнітів ---
        case "control_units": {
          const ext = getParticipantExtras(participant);

          ext.controlUnits = (ext.controlUnits ?? 0) + numValue;
          setParticipantExtras(participant, ext);
          break;
        }

        // --- Пасивні % бонуси до урону (melee, ranged, counter, spell-тип) ---
        // Ці не змінюють combatStats, вони зберігаються в effects і застосовуються при розрахунку
        case "melee_damage":
        case "ranged_damage":
        case "counter_damage":
        case "dark_spell_damage":
        case "chaos_spell_damage":
        case "spell_damage":
        case "physical_damage":
        case "damage":
          // Вже зберігається в skill.effects, розрахунок робиться в damage-calculations
          break;

        // --- Мораль per kill/death ---
        case "morale_per_kill":
        case "morale_per_ally_death": {
          const ext = getParticipantExtras(participant);

          if (effect.stat === "morale_per_kill") {
            ext.moralePerKill = (ext.moralePerKill ?? 0) + numValue;
          } else {
            ext.moralePerAllyDeath = (ext.moralePerAllyDeath ?? 0) + numValue;
          }

          setParticipantExtras(participant, ext);
          break;
        }

        // --- Інші пасивні ефекти — зберігаються для подальшого використання ---
        default:
          break;
      }
    }
  }
}

/**
 * Обчислює формулу для ефекту скіла через безпечний парсер (formula-evaluator).
 * Підтримує: hero_level, lost_hp_percent, morale, floor(), ceil(), max(), min()
 */
function evaluateFormula(
  formula: string,
  participant: BattleParticipant,
): number {
  const maxHp = participant.combatStats.maxHp;
  const currentHp = participant.combatStats.currentHp;
  const lostHpPercent = maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0;

  const context: Record<string, number> = {
    hero_level: participant.abilities.level,
    lost_hp_percent: lostHpPercent,
    morale: participant.combatStats.morale,
  };

  const result = evaluateFormulaSafe(formula, context);
  return Math.floor(result);
}

// ---------- Розширені дані учасника (extras) ----------

interface ParticipantResistances {
  physical?: number; // % зменшення фізичного урону
  spell?: number; // % зменшення магічного урону
}

export interface ParticipantExtras {
  critThreshold?: number;
  maxSpellLevel?: number;
  minMorale?: number;
  enemyAttackDisadvantage?: boolean;
  advantageOnAllRolls?: boolean;
  spellTargetsLvl45?: number;
  lightSpellsTargetAllAllies?: boolean;
  controlUnits?: number;
  moralePerKill?: number;
  moralePerAllyDeath?: number;
  resistances?: ParticipantResistances;
  skillUsageCounts?: Record<string, number>;
}

/** Отримує розширені дані з battleData (зберігаються як додаткове JSON-поле) */
export function getParticipantExtras(
  participant: BattleParticipant,
): ParticipantExtras {
  return (
    ((participant.battleData as unknown as Record<string, unknown>)
      .extras as ParticipantExtras) ?? {}
  );
}

export function setParticipantExtras(
  participant: BattleParticipant,
  extras: ParticipantExtras,
): void {
  (participant.battleData as unknown as Record<string, unknown>).extras =
    extras;
}

function getParticipantResistances(
  participant: BattleParticipant,
): ParticipantResistances {
  const extras = getParticipantExtras(participant);

  return extras.resistances ?? {};
}

function setParticipantResistances(
  participant: BattleParticipant,
  res: ParticipantResistances,
): void {
  const extras = getParticipantExtras(participant);

  extras.resistances = res;
  setParticipantExtras(participant, extras);
}

/**
 * Створює BattleParticipant з Unit
 * @param racesByName - опціонально pre-loaded раси для batch start (ключ — назва раси)
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

  // Розбираємо атаки з JSON
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
    // Визначаємо тип атаки: явно заданий, або з range (5 фт = melee, інакше ranged)
    const rawType = (attack as { type?: string }).type;
    let attackType: AttackType =
      rawType === "ranged"
        ? AttackType.RANGED
        : rawType === "melee"
          ? AttackType.MELEE
          : attack.range && !/^5\s*(фт|ft)/i.test(attack.range)
            ? AttackType.RANGED
            : AttackType.MELEE;

    const a = attack as { targetType?: string; maxTargets?: number; damageDistribution?: number[]; guaranteedDamage?: number };
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

  // Завантажуємо расові здібності
  let racialAbilities: RacialAbility[] = [];

  if (unit.race) {
    try {
      racialAbilities = await extractRacialAbilities(
        unit.race,
        unit.campaignId,
        racesByName?.[unit.race] ?? undefined,
      );
    } catch (error) {
      console.error("Error extracting racial abilities:", error);
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
      currentHp: unit.maxHp, // Units завжди починають з maxHp
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
      spellSlots: { universal: { max: 3, current: 3 } }, // 3 універсальні слоти для будь-якого заклинання
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
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  // Units зазвичай не мають скілів з дерева, але можуть мати расові бонуси
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

/**
 * Витягує активні скіли з character.skillTreeProgress та characterSkills
 * Завантажує деталі скілів з БД (або використовує preloadedSkillsById)
 */
async function extractActiveSkillsFromCharacter(
  character: CharacterFromPrisma,
  campaignId: string,
  preloadedSkillsById?: Record<string, Prisma.SkillGetPayload<object>>,
): Promise<ActiveSkill[]> {
  const activeSkills: ActiveSkill[] = [];

  // Розбираємо skillTreeProgress (JSON об'єкт)
  const skillTreeProgress =
    (character.skillTreeProgress as Record<
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

  // Додаємо персональний унікальний скіл персонажа (з групи «Персональні»)
  const personalSkillId = (character as { personalSkillId?: string | null })
    .personalSkillId;

  if (personalSkillId?.trim() && !allSkillIds.includes(personalSkillId)) {
    allSkillIds.push(personalSkillId);
    skillIdToMainSkill[personalSkillId] = "";
    skillIdToLevel[personalSkillId] = SkillLevel.BASIC;
  }

  if (allSkillIds.length === 0) {
    return activeSkills;
  }

  const skillsMap = preloadedSkillsById
    ? new Map(Object.entries(preloadedSkillsById))
    : new Map(
        (
          await prisma.skill.findMany({
            where: { id: { in: allSkillIds }, campaignId },
          })
        ).map((s) => [s.id, s]),
      );

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

    // Розпаковуємо effects: спочатку з combatStats.effects (повна інформація stat/type/value/duration),
    // інакше з bonuses (легасі)
    type RawEffect = {
      stat: string;
      type: string;
      value?: number | string | boolean;
      duration?: number;
    };
    type CombatStatsEffects = { effects?: RawEffect[] };

    const combatStats = (skill.combatStats as CombatStatsEffects) ?? {};

    const rawEffects = Array.isArray(combatStats.effects)
      ? combatStats.effects
      : [];

    let effects: SkillEffect[];

    if (rawEffects.length > 0) {
      effects = rawEffects
        .filter((e) => e.stat)
        .map((e) => ({
          stat: e.stat,
          type: e.type,
          value: e.value ?? 0,
          isPercentage: e.type === "percent",
          duration: e.duration,
        }));
    } else {
      const bonuses = (skill.bonuses as Record<string, number>) || {};

      const percentKeys = ["melee_damage", "ranged_damage", "counter_damage"];

      effects = Object.entries(bonuses).map(([key, value]) => ({
        stat: key,
        type:
          percentKeys.includes(key) || key.includes("percent")
            ? "percent"
            : "flat",
        value,
        isPercentage:
          key.includes("percent") ||
          key.includes("_percent") ||
          percentKeys.includes(key),
      }));
    }

    // Формуємо spellEnhancements якщо є покращення заклинання
    let spellEnhancements: ActiveSkill["spellEnhancements"] | undefined;

    const enhancementTypes = (skill.spellEnhancementTypes as string[]) || [];

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
        const targetChange = skill.spellTargetChange as unknown as {
          target: string;
        };

        if (
          targetChange &&
          typeof targetChange === "object" &&
          "target" in targetChange
        ) {
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

        if (additionalModifier && typeof additionalModifier === "object") {
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
      mainSkillId: skill.mainSkillId ?? skillIdToMainSkill[skillId] ?? "",
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
 * @param preloadedArtifactsById - опціонально pre-loaded артефакти (для batch start)
 */
async function extractAttacksFromCharacter(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
): Promise<ExtractedAttack[]> {
  const attacks: ExtractedAttack[] = [];

  if (!character.inventory) {
    return attacks;
  }

  const equipped =
    (character.inventory.equipped as Record<
      string,
      string | Record<string, unknown>
    >) || {};

  const slotKeys = [
    "mainHand",
    "offHand",
    "weapon",
    "weapon1",
    "weapon2",
    "range_weapon",
  ] as const;

  const weaponIds: string[] = [];

  for (const key of slotKeys) {
    const val = equipped[key];

    if (!val) continue;

    if (typeof val === "string") {
      weaponIds.push(val);
    } else if (typeof val === "object" && val !== null && "damageDice" in val) {
      const inv = val as {
        id?: string;
        name?: string;
        attackBonus?: number;
        damageDice?: string;
        damageType?: string;
        weaponType?: string;
        range?: string;
      };

      const isRanged =
        inv.weaponType?.toLowerCase() === AttackType.RANGED ||
        /лук|bow|арбалет|crossbow/i.test((inv.name as string) ?? "") ||
        (typeof inv.range === "string" &&
          inv.range.trim() !== "" &&
          inv.range !== "5 ft");

      attacks.push({
        id: inv.id ?? `inline-${key}`,
        name: (inv.name as string) ?? "Зброя",
        type: (isRanged ? AttackType.RANGED : AttackType.MELEE) as AttackType,
        attackBonus: typeof inv.attackBonus === "number" ? inv.attackBonus : 0,
        damageDice: (inv.damageDice as string) ?? "1d6",
        damageType: (inv.damageType as string) ?? "bludgeoning",
        range: typeof inv.range === "string" ? inv.range : undefined,
      });
    }
  }

  if (weaponIds.length === 0 && attacks.length === 0) {
    return attacks;
  }

  if (weaponIds.length === 0) {
    return attacks;
  }

  const potentialWeapons = preloadedArtifactsById
    ? weaponIds
        .map((id) => preloadedArtifactsById[id])
        .filter((w): w is NonNullable<typeof w> => w != null)
    : await prisma.artifact.findMany({
        where: {
          id: { in: weaponIds },
          campaignId: character.campaignId,
        },
      });

  for (const weapon of potentialWeapons) {
    if (
      weapon.slot !== "weapon" &&
      weapon.slot !== "mainHand" &&
      weapon.slot !== "offHand" &&
      weapon.slot !== "range_weapon"
    ) {
      continue;
    }

    // Розбираємо modifiers для атаки
    const modifiers = (weapon.modifiers as ArtifactModifier[]) || [];

    // Знаходимо дані атаки в modifiers або bonuses
    const bonuses = (weapon.bonuses as Record<string, number>) || {};

    // Базові значення (можна налаштувати пізніше)
    const attackBonus = bonuses.attackBonus || bonuses.attack || 0;

    // Якщо у артефакту немає модифікатора damage_dice — використовуємо 1d6 щоб діалог урону показував коректні кубики
    const damageDice =
      getOptionalModifierValue(modifiers, ArtifactModifierType.DAMAGE_DICE) ??
      "1d6";

    const damageType = getModifierValue(
      modifiers,
      ArtifactModifierType.DAMAGE_TYPE,
      DEFAULT_ARTIFACT_MODIFIERS.DAMAGE_TYPE,
    );

    let attackType = getModifierValue(
      modifiers,
      ArtifactModifierType.ATTACK_TYPE,
      AttackType.MELEE,
    );

    const rangeVal = getOptionalModifierValue(
      modifiers,
      ArtifactModifierType.RANGE,
    );

    if (
      attackType !== AttackType.RANGED &&
      (attackType?.toLowerCase() === "ranged" ||
        /лук|bow|арбалет|crossbow/i.test(weapon.name) ||
        (rangeVal && rangeVal.trim() !== "" && rangeVal !== "5 ft"))
    ) {
      attackType = AttackType.RANGED;
    }

    // Створюємо атаку з ID
    attacks.push({
      id: weapon.id,
      name: weapon.name,
      type: (attackType === AttackType.RANGED
        ? AttackType.RANGED
        : AttackType.MELEE) as AttackType,
      attackBonus,
      damageDice,
      damageType,
      range: rangeVal,
      properties: getOptionalModifierValue(
        modifiers,
        ArtifactModifierType.PROPERTIES,
      ),
      minTargets:
        parseInt(
          getModifierValue(modifiers, ArtifactModifierType.MIN_TARGETS, "0"),
        ) || undefined,
      maxTargets:
        parseInt(
          getModifierValue(modifiers, ArtifactModifierType.MAX_TARGETS, "0"),
        ) || undefined,
    });
  }

  return attacks;
}

/**
 * Витягує екіпіровані артефакти з character.inventory
 * Завантажує деталі артефактів з БД (або використовує preloadedArtifactsById)
 */
async function extractEquippedArtifactsFromCharacter(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
): Promise<EquippedArtifact[]> {
  const equippedArtifacts: EquippedArtifact[] = [];

  if (!character.inventory) {
    return equippedArtifacts;
  }

  const equipped =
    (character.inventory.equipped as Record<string, string>) || {};

  // Збираємо всі artifactIds для масового завантаження
  const artifactIds: string[] = [];

  const artifactIdToSlot: Record<string, string> = {};

  for (const [slot, artifactId] of Object.entries(equipped)) {
    if (typeof artifactId === "string" && artifactId) {
      artifactIds.push(artifactId);
      artifactIdToSlot[artifactId] = slot;
    }
  }

  if (artifactIds.length === 0) {
    return equippedArtifacts;
  }

  const artifacts = preloadedArtifactsById
    ? artifactIds
        .map((id) => preloadedArtifactsById[id])
        .filter((a): a is NonNullable<typeof a> => a != null)
    : await prisma.artifact.findMany({
        where: {
          id: { in: artifactIds },
          campaignId: character.campaignId,
        },
      });

  for (const artifact of artifacts) {
    const bonuses = (artifact.bonuses as Record<string, number>) || {};

    const modifiers =
      (artifact.modifiers as Array<{
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
 * @param preloadedRace - опціонально pre-loaded Race (для batch start)
 * @returns масив расових здібностей
 */
async function extractRacialAbilities(
  raceName: string,
  campaignId: string,
  preloadedRace?: Prisma.RaceGetPayload<object> | null,
): Promise<RacialAbility[]> {
  const racialAbilities: RacialAbility[] = [];

  const race =
    preloadedRace ??
    (await prisma.race.findFirst({
      where: {
        campaignId,
        name: raceName,
      },
    }));

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
