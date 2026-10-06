/**
 * Побудова campaign context для start battle: збір skill/artifact IDs, batch load, мапи
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { attachArtifactSetsToSpellContext } from "@/lib/utils/battle/artifact-sets";
import { referencedSkillIds } from "@/lib/utils/battle/participant/extract-skills";
import type { CampaignSpellContext } from "@/lib/utils/battle/types/participant";

type CharacterWithRelations = Prisma.CharacterGetPayload<{
  include: { inventory: true };
}> & { skillTreeProgress?: unknown; personalSkillId?: string | null };
type UnitRow = { id: string; raceId: string | null };

export interface BuildContextResult {
  campaignContext: CampaignSpellContext | undefined;
  racesById: Record<string, Prisma.RaceGetPayload<object> | null>;
}

/** forBalance: лише скіли, на які посилаються персонажі, і спел-рядки без описів (економія egress). */
export async function buildCampaignContextForStart(
  campaignId: string,
  characters: CharacterWithRelations[],
  units: UnitRow[],
  options: { forBalance?: boolean } = {},
): Promise<BuildContextResult> {
  const allArtifactIds = new Set<string>();

  for (const c of characters) {
    const equipped =
      (c.inventory?.equipped as Record<string, string | unknown>) ?? {};

    for (const val of Object.values(equipped)) {
      if (typeof val === "string" && val) allArtifactIds.add(val);
    }
  }

  const uniqueRaceNames = [...new Set(characters.map((c) => c.race).filter(Boolean))];

  const unitRaceIds = [...new Set(units.map((u) => u.raceId).filter((id): id is string => !!id))];

  const raceFilters = [
    ...(uniqueRaceNames.length > 0 ? [{ name: { in: uniqueRaceNames } }] : []),
    ...(unitRaceIds.length > 0 ? [{ id: { in: unitRaceIds } }] : []),
  ];

  const treeWhere = { campaignId, race: { in: uniqueRaceNames } };

  const balanceTrees = options.forBalance && characters.length > 0 && uniqueRaceNames.length > 0 ? await prisma.skillTree.findMany({ where: treeWhere }) : undefined;

  const balanceSkillIds = options.forBalance ? referencedSkillIds(characters, balanceTrees ?? []) : [];

  const [races, campaign, ...characterContext] = await Promise.all([
    raceFilters.length > 0 ? prisma.race.findMany({ where: { campaignId, OR: raceFilters } }) : [],
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { maxLevel: true },
    }),
    ...(characters.length > 0
      ? [
          balanceTrees ?? (uniqueRaceNames.length > 0 ? prisma.skillTree.findMany({ where: treeWhere }) : []),
          prisma.mainSkill.findMany({
            where: { campaignId },
            select: { id: true, spellGroupId: true, name: true },
          }),
          options.forBalance
            ? prisma.spell.findMany({ where: { campaignId }, select: { id: true, level: true, spellGroup: { select: { id: true } } } })
            : prisma.spell.findMany({ where: { campaignId }, include: { spellGroup: { select: { id: true } } } }),
          options.forBalance
            ? balanceSkillIds.length > 0
              ? prisma.skill.findMany({ where: { campaignId, id: { in: balanceSkillIds } }, include: { spellGroup: { select: { id: true } } } })
              : []
            : prisma.skill.findMany({ where: { campaignId }, include: { spellGroup: { select: { id: true } } } }),
          allArtifactIds.size > 0
            ? prisma.artifact.findMany({
                where: { id: { in: Array.from(allArtifactIds) }, campaignId },
              })
            : [],
        ]
      : []),
  ]);

  const racesByName: Record<string, (typeof races)[0] | null> = {};

  const racesById: Record<string, (typeof races)[0] | null> = {};

  for (const r of races) {
    if (uniqueRaceNames.includes(r.name)) racesByName[r.name] = r;

    if (unitRaceIds.includes(r.id)) racesById[r.id] = r;
  }
  for (const rn of uniqueRaceNames) {
    if (!(rn in racesByName)) racesByName[rn] = null;
  }
  for (const id of unitRaceIds) {
    if (!(id in racesById)) racesById[id] = null;
  }

  let campaignContext: CampaignSpellContext | undefined;

  if (characters.length > 0 && characterContext.length >= 4) {
    const [
      skillTrees,
      mainSkills,
      spells,
      allSkills,
      batchArtifacts,
    ] = characterContext;

    const skillTreeByRace: Record<
      string,
      NonNullable<(typeof skillTrees)[number]> | null
    > = {};

    const treesArr = (Array.isArray(skillTrees) ? skillTrees : []) as Array<{
      race: string;
    }>;

    for (const st of treesArr) {
      if (st?.race)
        skillTreeByRace[st.race] = st as NonNullable<(typeof skillTrees)[number]>;
    }
    for (const rn of uniqueRaceNames) {
      if (!(rn in skillTreeByRace)) skillTreeByRace[rn] = null;
    }

    // allSkills за id: extract-skills бере з нього лише вивчені вузли дерева й personalSkillId
    const skillsById: Record<string, Prisma.SkillGetPayload<object>> = {};

    const allSkillsArr = Array.isArray(allSkills) ? allSkills : [];

    for (const s of allSkillsArr) {
      if (s && typeof s === "object" && "id" in s) {
        skillsById[(s as { id: string }).id] = s as Prisma.SkillGetPayload<object>;
      }
    }

    const artifactsById: Record<string, Prisma.ArtifactGetPayload<object>> = {};

    const artifactsArr = Array.isArray(batchArtifacts) ? batchArtifacts : [];

    for (const a of artifactsArr) {
      if (a && typeof a === "object" && "id" in a) {
        artifactsById[(a as { id: string }).id] =
          a as Prisma.ArtifactGetPayload<object>;
      }
    }

    campaignContext = {
      skillTreeByRace: skillTreeByRace as CampaignSpellContext["skillTreeByRace"],
      mainSkills: mainSkills as CampaignSpellContext["mainSkills"],
      spells: spells as CampaignSpellContext["spells"],
      allSkills: allSkills as CampaignSpellContext["allSkills"],
      racesByName,
      campaign: {
        maxLevel: (campaign as { maxLevel?: number })?.maxLevel ?? 20,
      },
      skillsById:
        Object.keys(skillsById).length > 0 ? skillsById : undefined,
      artifactsById:
        Object.keys(artifactsById).length > 0 ? artifactsById : undefined,
    };

    await attachArtifactSetsToSpellContext(campaignId, campaignContext);
  }

  return { campaignContext, racesById };
}
