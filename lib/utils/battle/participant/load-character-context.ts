import type { Prisma } from "@prisma/client";

import type { CampaignSpellContext, CharacterFromPrisma } from "../types/participant";
import { referencedSkillIds } from "./extract-skills";

import { prisma } from "@/lib/db";

export interface CharacterContext {
  context: CampaignSpellContext;
  race: Prisma.RaceGetPayload<object> | null;
  tree: Prisma.SkillTreeGetPayload<object> | null;
}

function equippedArtifactIds(character: CharacterFromPrisma): string[] {
  const equipped = (character.inventory?.equipped as Record<string, unknown> | null) ?? {};

  return [...new Set(Object.values(equipped).filter((v): v is string => typeof v === "string" && !!v))];
}

/** Контекст одного персонажа за 3 виклики Prisma: кампанія (раса, дерево, школи, спели) + артефакти зі сетами → скіли. */
export async function loadCharacterContext(character: CharacterFromPrisma, maxLevel: number): Promise<CharacterContext> {
  const { campaignId, race: raceName } = character;

  const artifactIds = equippedArtifactIds(character);

  const [campaign, artifacts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        races: { where: { name: raceName }, take: 1 },
        skillTrees: { where: { race: raceName }, take: 1 },
        mainSkills: { select: { id: true, spellGroupId: true, name: true } },
        spells: { select: { id: true, level: true, groupId: true } },
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

  const skillIds = referencedSkillIds([character], tree ? [tree] : []);

  const skills = skillIds.length > 0 ? await prisma.skill.findMany({ where: { campaignId, id: { in: skillIds } } }) : [];

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
      mainSkills: campaign?.mainSkills ?? [],
      spells: (campaign?.spells ?? []).map((s) => ({ id: s.id, level: s.level, spellGroup: s.groupId ? { id: s.groupId } : null })),
      allSkills: skills,
      racesByName: { [raceName]: race },
      campaign: { maxLevel },
      skillsById: Object.fromEntries(skills.map((s) => [s.id, s])),
      artifactsById,
      artifactSetsById,
      artifactSetMemberIds,
    },
  };
}
