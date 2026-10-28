import type { Prisma } from "@prisma/client";

import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";
import { referencedSkillIds } from "./extract-skills";
import { loadClassesById } from "./load-classes";
import { loadFeatsById } from "./load-feats";

import { prisma } from "@/lib/db";
import { CharacterClassesSchema } from "@/lib/schemas/classes";
import { loadBackground } from "@/lib/server/backgrounds/load";
import { readChoiceList } from "@/lib/utils/abilities/read";
import { choicesStateOf } from "@/lib/utils/characters/choices/picks";
import { selectionNeedsFeats } from "@/lib/utils/characters/choices/selections";
import { inventoryArtifactIds } from "@/lib/utils/items/resolve";
import type { Ruleset } from "@/lib/utils/rules";
import { normalizeTree, resolveLearned } from "@/lib/utils/skills/progression";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";

export interface CharacterContext {
  context: CampaignSpellContext;
  race: Prisma.RaceGetPayload<object> | null;
  tree: Prisma.SkillTreeGetPayload<object> | null;
}

/** Learned-вузли дерева й особистий скіл персонажа: що саме з бібліотеки кампанії йому потрібне. */
function learnedNeeds(character: CharacterFromPrisma, tree: Prisma.SkillTreeGetPayload<object> | null) {
  const normalized = tree ? normalizeTree(tree) : null;

  const learned = normalized ? resolveLearned(normalized, character.skillTreeProgress) : [];

  return {
    learned: learned.length > 0,
    skillIds: referencedSkillIds([character], tree ? [tree] : []),
    branchIds: normalized?.branches.map((b) => b.id) ?? [],
    branchGroupIds: (normalized?.branches ?? []).flatMap((b) => (b.spellGroupId ? [b.spellGroupId] : [])),
  };
}

/**
 * Контекст персонажа: раса й дерево + артефакти зі сетами → скіли, школи й заклинання.
 * Школи й заклинання — лише коли є вивчені вузли, і лише групи гілок дерева та вивчених скілів.
 * Класи й потрібні choice refs читаються campaign-scoped кешованими loaders.
 */
export async function loadCharacterContext(character: CharacterFromPrisma, settings: { maxLevel: number; rules: Ruleset }): Promise<CharacterContext> {
  const { campaignId, race: raceName } = character;

  const { maxLevel, rules } = settings;

  const artifactIds = inventoryArtifactIds(character.inventory, { stash: rules.items.enabled, consumables: rules.items.enabled });

  const [campaign, artifacts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        races: { where: { name: raceName }, take: 1 },
        skillTrees: { where: { race: raceName }, take: 1 },
      },
    }),
    artifactIds.length > 0
      ? prisma.artifact.findMany({
          where: { id: { in: artifactIds }, campaignId },
          include: { artifactSet: { include: { artifacts: { select: { id: true } } } } },
        })
      : [],
  ]);

  const race = campaign?.races[0] ?? null;

  const tree = campaign?.skillTrees[0] ?? null;

  const needs = learnedNeeds(character, tree);

  const library =
    needs.skillIds.length > 0 || needs.learned
      ? await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: {
            ...(needs.skillIds.length > 0 && { skills: { where: { id: { in: needs.skillIds } } } }),
            ...(needs.learned && {
              mainSkills: { where: { id: { in: needs.branchIds } }, select: { id: true, spellGroupId: true, name: true, role: true } },
              spells: {
                where: {
                  OR: [
                    { groupId: { in: needs.branchGroupIds } },
                    { spellGroup: { mainSkills: { some: { id: { in: needs.branchIds } } } } },
                    { spellGroup: { skills: { some: { id: { in: needs.skillIds } } } } },
                  ],
                },
                select: { id: true, level: true, groupId: true },
              },
            }),
          },
        })
      : null;

  const skills = library?.skills ?? [];

  const classesById = rules.classes.enabled ? await loadClassesById(campaignId) : undefined;

  const parsedClasses = rules.classes.enabled ? CharacterClassesSchema.safeParse(character.classes) : null;

  const classMode = parsedClasses?.success ? resolveClassEntries(parsedClasses.data, classesById ?? {}).some((e) => e.class) : false;

  const state = choicesStateOf(character);

  const needsSelections = classMode || (race ? readChoiceList(race.choices).length > 0 : false);

  const featsById = await loadFeatsById(campaignId, needsSelections && selectionNeedsFeats(state, classMode));

  const background = classMode ? await loadBackground(campaignId, state.backgroundId) : null;

  const artifactsById: NonNullable<CampaignSpellContext["artifactsById"]> = {};

  const artifactSetsById: NonNullable<CampaignSpellContext["artifactSetsById"]> = {};

  const artifactSetMemberIds: NonNullable<CampaignSpellContext["artifactSetMemberIds"]> = {};

  for (const { artifactSet, ...row } of artifacts) {
    artifactsById[row.id] = row;

    if (artifactSet) {
      artifactSetsById[artifactSet.id] = { id: artifactSet.id, name: artifactSet.name, setBonus: artifactSet.setBonus, icon: artifactSet.icon, abilities: artifactSet.abilities };
      artifactSetMemberIds[artifactSet.id] = artifactSet.artifacts.map((a) => a.id);
    }
  }

  return {
    race,
    tree,
    context: {
      skillTreeByRace: { [raceName]: tree },
      mainSkills: library?.mainSkills ?? [],
      spells: (library?.spells ?? []).map((s) => ({ id: s.id, level: s.level, spellGroup: s.groupId ? { id: s.groupId } : null })),
      allSkills: skills,
      racesByName: { [raceName]: race },
      campaign: { maxLevel },
      rules,
      skillsById: Object.fromEntries(skills.map((s) => [s.id, s])),
      artifactsById,
      artifactSetsById,
      artifactSetMemberIds,
      featsById,
      backgroundsById: background ? { [background.id]: background } : {},
      ...(classesById && { classesById }),
    },
  };
}
