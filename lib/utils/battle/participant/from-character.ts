import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";
import { buildCharacterSpellGrants } from "./character-spell-grants";
import { type EquippedArtifactRow, loadConsumableEntries, loadEquippedArtifactRows, toEquippedArtifacts } from "./extract-artifacts";
import { extractAttacksFromCharacter } from "./extract-attacks";
import { loadClassesById } from "./load-classes";
import { loadFeatsById } from "./load-feats";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { CombatStatus,ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { heroArchetype } from "@/lib/constants/hero-archetypes";
import { DND_SKILLS } from "@/lib/constants/skills";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import { loadBackground } from "@/lib/server/backgrounds/load";
import { resolveCharacterSkillEntries } from "@/lib/server/battles/participant/character-skill-entries";
import { resolveLearnedSpellsAndMastery } from "@/lib/server/battles/participant/from-character-learned-spells";
import { resolveSpellSlotsFromCharacter } from "@/lib/server/battles/participant/from-character-spell-slots";
import { loadRace } from "@/lib/server/battles/participant/load-race";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";
import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { resolveLimitFormulas } from "@/lib/utils/abilities/build/limit-formulas";
import { classPools } from "@/lib/utils/abilities/class-columns";
import { readChoiceList } from "@/lib/utils/abilities/read";
import { findCompletedSets } from "@/lib/utils/battle/artifact-sets";
import { classProficiencies, withGrantedProficiencies } from "@/lib/utils/battle/proficiency/collect";
import { getCharacterImmunities } from "@/lib/utils/characters/character-race-effects";
import { choicesStateOf } from "@/lib/utils/characters/choices/picks";
import { choiceSelections, selectionNeedsFeats } from "@/lib/utils/characters/choices/selections";
import { classHp, classSaves, classSpellcastingAbility } from "@/lib/utils/characters/classes";
import { applyClassArmor } from "@/lib/utils/characters/classes/armor-class";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";
import { applyCharacterResources, storedCharacterState } from "@/lib/utils/characters/resources/battle";
import { getAbilityModifier, spellcastingDerived } from "@/lib/utils/common/calculations";
import { isRecord } from "@/lib/utils/common/is-record";
import { attunedRefs } from "@/lib/utils/items/resolve";
import { DEFAULT_RULES, heroDiceTable, heroHpFormula, moraleCapFromRules, proficiencyForLevel, type Ruleset } from "@/lib/utils/rules";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import { buildIngredientStock } from "@/lib/utils/spells/ingredients/stock";
import type { BattleParticipant } from "@/types/battle";
import type { ResolvedClassEntry } from "@/types/classes";

async function resolveCharacterClassEntries(character: CharacterFromPrisma, rules: Ruleset, context?: CampaignSpellContext): Promise<ResolvedClassEntry[]> {
  const parsed = rules.classes.enabled ? CharacterClassesSchema.safeParse(character.classes) : null;

  const entries = parsed?.success ? parsed.data : [];

  return entries.length > 0 ? resolveClassEntries(entries, await loadClassesById(character.campaignId, context)) : [];
}

const uniqueById = <T extends { id: string }>(rows: T[]): T[] => [...new Map(rows.map((r) => [r.id, r])).values()];

type BuildPreloaded = { artifactRows?: EquippedArtifactRow[]; rules?: Ruleset; classEntries?: ResolvedClassEntry[] };

async function loadCharacterBuildRefs(character: CharacterFromPrisma, rules: Ruleset, context: CampaignSpellContext | undefined, preloaded: BuildPreloaded | undefined) {
  const mainSkillGroups = context ? new Map(context.mainSkills.map((m) => [m.id, m.spellGroupId])) : undefined;

  const skills = await resolveCharacterSkillEntries(
    character,
    character.campaignId,
    context?.skillsById,
    mainSkillGroups,
    context ? (context.skillTreeByRace[character.race] ?? null) : undefined,
  );

  const artifactRows = preloaded?.artifactRows ?? loadEquippedArtifactRows(character, context?.artifactsById ?? {}, { rules });

  const artifactsById = context?.artifactsById ?? Object.fromEntries(artifactRows.map(({ row }) => [row.id, row]));

  const consumables = loadConsumableEntries(character, artifactsById, rules);

  const equippedArtifacts = toEquippedArtifacts(artifactRows);

  const completed = await findCompletedSets(equippedArtifacts, character.campaignId, context);

  const resolvedEntries = preloaded?.classEntries ?? (await resolveCharacterClassEntries(character, rules, context));

  const resolvedClasses = resolvedEntries.some((e) => e.class) ? resolvedEntries : null;

  const attacks = extractAttacksFromCharacter(character, artifactsById, rules.defaultAttacks, { fiveE: !!resolvedClasses, items: { enabled: rules.items.enabled, attuned: attunedRefs(character.inventory) } });

  const race = await loadRace(character.race, character.campaignId, context ? (context.racesByName[character.race] ?? null) : undefined);

  return { skills, artifactRows, consumables, equippedArtifacts, completed, resolvedClasses, attacks, race };
}

type BuildRefs = Awaited<ReturnType<typeof loadCharacterBuildRefs>>;

async function characterSpellcasting(character: CharacterFromPrisma, refs: BuildRefs, proficiencyBonus: number, context: CampaignSpellContext | undefined) {
  const { race, resolvedClasses, artifactRows, consumables } = refs;

  const choiceState = choicesStateOf(character);

  const raceChoiceDefs = race ? readChoiceList(race.choices) : [];

  const classMode = !!resolvedClasses;

  const selections =
    raceChoiceDefs.length > 0 || classMode
      ? choiceSelections({
          race: race && raceChoiceDefs.length > 0 ? { id: race.id, name: race.name, choices: raceChoiceDefs } : null,
          background: classMode
            ? context?.backgroundsById !== undefined
              ? context.backgroundsById[choiceState.backgroundId ?? ""] ?? null
              : await loadBackground(character.campaignId, choiceState.backgroundId)
            : null,
          backgroundChoices: choiceState.backgroundChoices,
          backgroundFeatPicks: choiceState.backgroundFeatPicks,
          raceChoices: choiceState.raceChoices,
          classes: resolvedClasses ?? [],
          feats: classMode ? choiceState.feats : [],
          featsById: await loadFeatsById(character.campaignId, selectionNeedsFeats(choiceState, classMode), context?.featsById),
          level: character.level,
        })
      : null;

  const granted = selections?.spells.map((s) => s.spellId) ?? [];

  const rawKnown = character.knownSpells;

  const baseKnownSpells = Array.isArray(rawKnown)
    ? (rawKnown as unknown[]).map((id) => String(id)).filter(Boolean)
    : [];

  const { knownSpells, schoolMastery } = await resolveLearnedSpellsAndMastery(character, baseKnownSpells, context);

  const resolvedSpellSlots = await resolveSpellSlotsFromCharacter(character, context, resolvedClasses ?? undefined);

  const spellcastingAbility = resolvedClasses ? classSpellcastingAbility(resolvedClasses, character.spellcastingAbility) : character.spellcastingAbility;

  const { grants, pools: grantPools } = buildCharacterSpellGrants({ selections, artifactRows, consumables, proficiencyBonus });

  return {
    selections,
    schoolMastery,
    grantPools,
    spellcastingAbility,
    spellcasting: {
      spellcastingAbility: spellcastingAbility as "intelligence" | "wisdom" | "charisma" | undefined,
      spellSlots: resolvedSpellSlots,
      slotSpells: [...new Set([...knownSpells, ...(selections?.slotSpells ?? [])])],
      knownSpells: [...new Set([...knownSpells, ...granted, ...grants.map(({ spellId }) => spellId)])],
      ...(grants.length > 0 && { grants }),
    },
  };
}

function finalizeCharacter(participant: BattleParticipant, character: CharacterFromPrisma, classMode: boolean, spellcastingAbility: string | null | undefined, rules: Ruleset): BattleParticipant {
  const baked = bakePassives(participant);

  const armored = withGrantedProficiencies(resolveLimitFormulas(classMode ? applyClassArmor(baked) : baked));

  // СК і бонус заклять — від характеристики з расовими/артефактними бонусами, тож після запікання
  const spell = spellcastingDerived(character.level, spellcastingAbility, armored.abilities, rules.formulas);

  const ready = { ...armored, spellcasting: { ...armored.spellcasting, spellSaveDC: spell?.saveDC, spellAttackBonus: spell?.attackBonus } };

  return applyCharacterResources(ready, storedCharacterState(character, rules), rules);
}

export async function createBattleParticipantFromCharacter(
  character: CharacterFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber?: number,
  context?: CampaignSpellContext,
  preloaded?: BuildPreloaded,
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

  const refs = await loadCharacterBuildRefs(character, rules, context, preloaded);

  const { skills, artifactRows, consumables, equippedArtifacts, completed, resolvedClasses, attacks, race } = refs;

  const proficiencyBonus = proficiencyForLevel(character.level, rules.formulas);

  const { selections, schoolMastery, grantPools, spellcastingAbility, spellcasting } = await characterSpellcasting(character, refs, proficiencyBonus, context);

  const archetype = heroArchetype(resolvedClasses ? null : (character as { archetype?: string | null }).archetype);

  const meleeDice = heroDiceTable(rules, "melee");

  const rangedDice = heroDiceTable(rules, "ranged");

  const primaryAbility = (ABILITY_KEYS as readonly string[]).includes(character.primaryAbility ?? "") ? (character.primaryAbility as AbilityKey) : undefined;

  const rawSaves = character.savingThrows;

  const saveProficiencies = resolvedClasses
    ? classSaves(resolvedClasses, rawSaves)
    : rawSaves && typeof rawSaves === "object" && !Array.isArray(rawSaves)
      ? ABILITY_KEYS.filter((k) => (rawSaves as Record<string, unknown>)[k] === true)
      : [];

  const classProficiency = resolvedClasses ? classProficiencies(resolvedClasses.map((e) => e.class)) : undefined;

  const rawSkills = character.skills;

  const dndSkillProficiencies = rawSkills && typeof rawSkills === "object" && !Array.isArray(rawSkills)
    ? DND_SKILLS.filter((k) => (rawSkills as Record<string, unknown>)[k] === true)
    : [];

  const computedMaxHp = resolvedClasses ? classHp(resolvedClasses, character.constitution) : heroBaseHp(character, heroHpFormula(rules.heroScaling)).total;

  const resolvedAbilities = [
    ...collectCharacterAbilities({
    skills,
    race,
    artifacts: uniqueById(artifactRows.map(({ row, slot }) => ({ ...row, slot }))),
    completedSets: completed.sets,
    consumables: consumables.map(({ itemId, row }) => ({ itemId, row })),
    ...(resolvedClasses && { classes: resolvedClasses }),
    ...(selections && selections.groups.length > 0 && { choiceGroups: selections.groups }),
  }),
    ...immunityAbilities(getCharacterImmunities(character), { type: "character", id: character.id }),
  ];

  const ingredientStock = rules.spellIngredients.enabled && character.controlledBy && character.controlledBy !== CONTROLLED_BY_DM ? buildIngredientStock(character.inventory, { withPurse: rules.spellIngredients.autoPay }) : undefined;

  const pools = { ...(resolvedClasses ? classPools(resolvedClasses) : {}), ...grantPools };

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
      creatureType: isRecord(race?.passiveAbility) && typeof race.passiveAbility.creatureType === "string" ? race.passiveAbility.creatureType.trim().toLowerCase() : "humanoid",
      raceId: (race as { id?: string } | null)?.id,
      moraleCap: moraleCapFromRules(rules),
      ...(resolvedClasses && { damageModel: "5e" as const }),
      heroDice: meleeDice || rangedDice ? { melee: meleeDice, ranged: rangedDice } : undefined,
      primaryAbility,
      meleeMultiplier: archetype.melee,
      rangedMultiplier: archetype.ranged,
      magicMultiplier: archetype.magic,
      archetypeName: archetype.name,
      ...(classProficiency && { proficiencies: classProficiency }),
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
    spellcasting,
    battleData: {
      attacks,
      activeEffects: [],
      equippedArtifacts,
      artifactSets: completed.progress,
      resolvedAbilities,
      schoolMastery,
      abilityUsage: {},
      ...(Object.keys(pools).length > 0 && { pools }),
      ...(ingredientStock && { ingredientStock }),
      pendingExtraActions: 0,
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  return finalizeCharacter(participant, character, !!resolvedClasses, spellcastingAbility, rules);
}
