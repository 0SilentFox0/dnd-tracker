import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";
import { type EquippedArtifactRow, loadEquippedArtifactRows, toEquippedArtifacts } from "./extract-artifacts";
import { extractAttacksFromCharacter } from "./extract-attacks";
import { resolveCharacterSkillEntries } from "./extract-skills";
import { resolveLearnedSpellsAndMastery } from "./from-character-learned-spells";
import { resolveSpellSlotsFromCharacter } from "./from-character-spell-slots";
import { loadClassesById } from "./load-classes";
import { loadRace } from "./load-race";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { CombatStatus,ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { heroArchetype } from "@/lib/constants/hero-archetypes";
import { DND_SKILLS } from "@/lib/constants/skills";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";
import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { findCompletedSets } from "@/lib/utils/battle/artifact-sets";
import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { classHp, classSaves, classSpellcastingAbility } from "@/lib/utils/characters/classes";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";
import { getAbilityModifier, spellcastingDerived } from "@/lib/utils/common/calculations";
import { DEFAULT_RULES, heroDiceTable, heroHpFormula, moraleCapFromRules, proficiencyForLevel, type Ruleset } from "@/lib/utils/rules";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { BattleParticipant } from "@/types/battle";

/**
 * Створює BattleParticipant з Character. Завантажує скіли, артефакти, заклинання.
 */
export async function createBattleParticipantFromCharacter(
  character: CharacterFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber?: number,
  context?: CampaignSpellContext,
  preloaded?: { artifactRows?: EquippedArtifactRow[]; rules?: Ruleset },
): Promise<BattleParticipant> {
  const rules = context?.rules ?? preloaded?.rules ?? DEFAULT_RULES;

  const modifiers = {
    strength: getAbilityModifier(character.strength),
    dexterity: getAbilityModifier(character.dexterity),
    constitution: getAbilityModifier(character.constitution),
    intelligence: getAbilityModifier(character.intelligence),
    wisdom: getAbilityModifier(character.wisdom),
    charisma: getAbilityModifier(character.charisma),
  };

  const mainSkillGroups = context ? new Map(context.mainSkills.map((m) => [m.id, m.spellGroupId])) : undefined;

  const skills = await resolveCharacterSkillEntries(
    character,
    character.campaignId,
    context?.skillsById,
    mainSkillGroups,
    context ? (context.skillTreeByRace[character.race] ?? null) : undefined,
  );

  const artifactRows = preloaded?.artifactRows ?? (await loadEquippedArtifactRows(character, context?.artifactsById));

  const artifactsById = context?.artifactsById ?? (preloaded?.artifactRows ? Object.fromEntries(preloaded.artifactRows.map(({ row }) => [row.id, row])) : undefined);

  const equippedArtifacts = toEquippedArtifacts(artifactRows);

  const completed = await findCompletedSets(equippedArtifacts, character.campaignId, context);

  const attacks = await extractAttacksFromCharacter(character, artifactsById, rules.defaultAttacks);

  const race = await loadRace(character.race, character.campaignId, context ? (context.racesByName[character.race] ?? null) : undefined);

  const rawKnown = character.knownSpells;

  const baseKnownSpells = Array.isArray(rawKnown)
    ? (rawKnown as unknown[]).map((id) => String(id)).filter(Boolean)
    : [];

  const { knownSpells, schoolMastery } = await resolveLearnedSpellsAndMastery(
    character,
    baseKnownSpells,
    context,
  );

  const classEntries = rules.classes.enabled ? CharacterClassesSchema.safeParse(character.classes) : null;

  const entries = classEntries?.success ? classEntries.data : [];

  const resolvedEntries = entries.length > 0 ? resolveClassEntries(entries, await loadClassesById(character.campaignId, context)) : [];

  const resolvedClasses = resolvedEntries.some((e) => e.class) ? resolvedEntries : null;

  const resolvedSpellSlots = await resolveSpellSlotsFromCharacter(character, context, resolvedClasses ?? undefined);

  const archetype = heroArchetype(resolvedClasses ? null : (character as { archetype?: string | null }).archetype);

  const meleeDice = heroDiceTable(rules, "melee");

  const rangedDice = heroDiceTable(rules, "ranged");

  const proficiencyBonus = proficiencyForLevel(character.level, rules.formulas);

  const primaryAbility = (ABILITY_KEYS as readonly string[]).includes(character.primaryAbility ?? "") ? (character.primaryAbility as AbilityKey) : undefined;

  const rawSaves = character.savingThrows;

  const saveProficiencies = resolvedClasses
    ? classSaves(resolvedClasses, rawSaves)
    : rawSaves && typeof rawSaves === "object" && !Array.isArray(rawSaves)
      ? ABILITY_KEYS.filter((k) => (rawSaves as Record<string, unknown>)[k] === true)
      : [];

  const rawSkills = character.skills;

  const dndSkillProficiencies = rawSkills && typeof rawSkills === "object" && !Array.isArray(rawSkills)
    ? DND_SKILLS.filter((k) => (rawSkills as Record<string, unknown>)[k] === true)
    : [];

  const computedMaxHp = resolvedClasses ? classHp(resolvedClasses, character.constitution) : heroBaseHp(character, heroHpFormula(rules.heroScaling)).total;

  const spellcastingAbility = resolvedClasses ? classSpellcastingAbility(resolvedClasses, character.spellcastingAbility) : character.spellcastingAbility;

  const resolvedAbilities = [
    ...collectCharacterAbilities({
    skills,
    race,
    artifacts: artifactRows.map(({ row, slot }) => ({ ...row, slot })),
    completedSets: completed.sets,
    ...(resolvedClasses && { classes: resolvedClasses }),
  }),
    ...immunityAbilities(getCharacterImmunities(character), { type: "character", id: character.id }),
  ];

  const participant: BattleParticipant = {
    basicInfo: {
      id: `${character.id}-${instanceNumber || 0}-${Date.now()}`,
      battleId,
      sourceId: character.id,
      sourceType: ParticipantSourceType.CHARACTER,
      instanceNumber: instanceNumber || undefined,
      instanceId: instanceNumber ? `${character.id}-${instanceNumber - 1}` : undefined,
      name: character.name,
      avatar: character.avatar || undefined,
      side,
      controlledBy: character.controlledBy || CONTROLLED_BY_DM,
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
      proficiencyBonus,
      race: character.race,
      raceId: (race as { id?: string } | null)?.id,
      moraleCap: moraleCapFromRules(rules),
      heroDice: meleeDice || rangedDice ? { melee: meleeDice, ranged: rangedDice } : undefined,
      primaryAbility,
      meleeMultiplier: archetype.melee,
      rangedMultiplier: archetype.ranged,
      magicMultiplier: archetype.magic,
      archetypeName: archetype.name,
      ...(saveProficiencies.length && { saveProficiencies }),
      ...(dndSkillProficiencies.length && { skillProficiencies: dndSkillProficiencies }),
    },
    combatStats: {
      maxHp: computedMaxHp,
      currentHp: computedMaxHp,
      tempHp: 0,
      armorClass: character.armorClass,
      speed: character.speed,
      morale: (character as { morale?: number }).morale || 0,
      status: computedMaxHp <= 0 ? CombatStatus.DEAD : CombatStatus.ACTIVE,
      minTargets: character.minTargets ?? 1,
      maxTargets: character.maxTargets ?? 1,
    },
    spellcasting: {
      spellcastingAbility: spellcastingAbility as
        | "intelligence"
        | "wisdom"
        | "charisma"
        | undefined,
      spellSlots: resolvedSpellSlots,
      knownSpells,
    },
    battleData: {
      attacks,
      activeEffects: [],
      equippedArtifacts,
      artifactSets: completed.progress,
      resolvedAbilities,
      schoolMastery,
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

  const baked = bakePassives(participant);

  // СК і бонус заклять — від характеристики з расовими/артефактними бонусами, тож після запікання
  const spell = spellcastingDerived(character.level, spellcastingAbility, baked.abilities, rules.formulas);

  return { ...baked, spellcasting: { ...baked.spellcasting, spellSaveDC: spell?.saveDC, spellAttackBonus: spell?.attackBonus } };
}
