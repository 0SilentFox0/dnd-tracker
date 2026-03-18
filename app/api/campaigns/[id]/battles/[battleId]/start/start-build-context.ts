/**
 * Побудова campaign context для start battle: збір skill/artifact IDs, batch load, мапи
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseMainSkillLevelId } from "@/lib/utils/battle/participant";
import type { CampaignSpellContext } from "@/lib/utils/battle/types/participant";

type CharacterWithRelations = Prisma.CharacterGetPayload<{
  include: { inventory: true; characterSkills: { include: { skillTree: true } } };
}> & { skillTreeProgress?: unknown; personalSkillId?: string | null };
type UnitRow = { id: string; race: string | null };

export interface BuildContextResult {
  campaignContext: CampaignSpellContext | undefined;
  racesByName: Record<string, Prisma.RaceGetPayload<object> | null>;
  uniqueRaceNames: string[];
}

export async function buildCampaignContextForStart(
  campaignId: string,
  characters: CharacterWithRelations[],
  units: UnitRow[],
): Promise<BuildContextResult> {
  const allSkillIds = new Set<string>();

  const allArtifactIds = new Set<string>();

  for (const c of characters) {
    const progress =
      (c.skillTreeProgress as Record<string, { unlockedSkills?: string[] }>) ?? {};

    for (const prog of Object.values(progress)) {
      for (const sid of prog.unlockedSkills ?? []) {
        allSkillIds.add(sid);
      }
    }

    const personalId = c.personalSkillId;

    if (personalId?.trim()) allSkillIds.add(personalId);

    const equipped =
      (c.inventory?.equipped as Record<string, string | unknown>) ?? {};

    for (const val of Object.values(equipped)) {
      if (typeof val === "string" && val) allArtifactIds.add(val);
    }
  }

  const mainSkillIdsFromLevels = new Set<string>();

  for (const sid of allSkillIds) {
    const parsed = parseMainSkillLevelId(sid);

    if (parsed) mainSkillIdsFromLevels.add(parsed.mainSkillId);
  }

  const uniqueRaces = new Set<string>();

  for (const c of characters) {
    if (c.race) uniqueRaces.add(c.race);
  }
  for (const u of units) {
    if (u.race) uniqueRaces.add(u.race);
  }

  const uniqueRaceNames = Array.from(uniqueRaces);

  const [races, campaign, ...characterContext] = await Promise.all([
    uniqueRaceNames.length > 0
      ? prisma.race.findMany({
          where: { campaignId, name: { in: uniqueRaceNames } },
        })
      : [],
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { maxLevel: true },
    }),
    ...(characters.length > 0
      ? [
          uniqueRaceNames.length > 0
            ? prisma.skillTree.findMany({
                where: { campaignId, race: { in: uniqueRaceNames } },
              })
            : [],
          prisma.mainSkill.findMany({
            where: { campaignId },
            select: { id: true, spellGroupId: true, name: true },
          }),
          prisma.spell.findMany({
            where: { campaignId },
            include: { spellGroup: { select: { id: true } } },
          }),
          prisma.skill.findMany({
            where: { campaignId },
            include: { spellGroup: { select: { id: true } } },
          }),
          allSkillIds.size > 0
            ? prisma.skill.findMany({
                where: { id: { in: Array.from(allSkillIds) }, campaignId },
              })
            : [],
          mainSkillIdsFromLevels.size > 0
            ? prisma.skill.findMany({
                where: {
                  mainSkillId: { in: Array.from(mainSkillIdsFromLevels) },
                  campaignId,
                },
              })
            : [],
          allArtifactIds.size > 0
            ? prisma.artifact.findMany({
                where: { id: { in: Array.from(allArtifactIds) }, campaignId },
              })
            : [],
        ]
      : []),
  ]);

  const racesByName: Record<string, (typeof races)[0] | null> = {};

  for (const r of races) {
    racesByName[r.name] = r;
  }
  for (const rn of uniqueRaceNames) {
    if (!(rn in racesByName)) racesByName[rn] = null;
  }

  let campaignContext: CampaignSpellContext | undefined;

  if (characters.length > 0 && characterContext.length >= 4) {
    const [
      skillTrees,
      mainSkills,
      spells,
      allSkills,
      batchSkills,
      batchSkillsByMainSkill,
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

    const skillsById: Record<string, Prisma.SkillGetPayload<object>> = {};

    const skillsByIdArr = [
      ...(Array.isArray(batchSkills) ? batchSkills : []),
      ...(Array.isArray(batchSkillsByMainSkill) ? batchSkillsByMainSkill : []),
    ];

    for (const s of skillsByIdArr) {
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
  }

  return { campaignContext, racesByName, uniqueRaceNames };
}
