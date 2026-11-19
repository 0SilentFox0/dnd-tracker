import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { systemServerOf } from '@/lib/server/systems/lookup';
import { loadClassesById } from '@/lib/utils/battle/participant/load-classes';
import type { CampaignSpellContext } from '@/lib/utils/battle/types/participant';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { inventoryArtifactIds } from '@/lib/utils/items/resolve';
import { parseRules } from '@/lib/utils/rules/schema';

type CharacterWithRelations = Prisma.CharacterGetPayload<{
    include: { inventory: true };
}> & { personalSkillId?: string | null };
type UnitRow = { id: string; raceId: string | null };

export interface BuildContextResult {
    campaignContext: CampaignSpellContext | undefined;
    racesById: Record<string, Prisma.RaceGetPayload<object> | null>;
}

function indexRaces<R extends { id: string; name: string }>(
    races: R[],
    uniqueRaceNames: string[],
    unitRaceIds: string[]
) {
    const racesByName: Record<string, R | null> = {};

    const racesById: Record<string, R | null> = {};

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

    return { racesByName, racesById };
}

async function assembleCampaignContext({
    campaignId,
    characters,
    spells,
    batchArtifacts,
    racesByName,
    campaign,
    rules,
}: {
    campaignId: string;
    characters: CharacterWithRelations[];
    spells: CampaignSpellContext['spells'];
    batchArtifacts: Prisma.ArtifactGetPayload<object>[];
    racesByName: CampaignSpellContext['racesByName'];
    campaign: { maxLevel?: number } | null;
    rules: CampaignSpellContext['rules'];
}): Promise<CampaignSpellContext> {
    const artifactsById: Record<string, Prisma.ArtifactGetPayload<object>> = {};

    for (const a of batchArtifacts) artifactsById[a.id] = a;

    const campaignContext: CampaignSpellContext = {
        ext: {},
        spells,
        allSkills: [],
        racesByName,
        campaign: {
            maxLevel: (campaign as { maxLevel?: number })?.maxLevel ?? 20,
        },
        rules,
        skillsById: {},
        artifactsById:
            Object.keys(artifactsById).length > 0 ? artifactsById : undefined,
    };

    if (classesEnabled(campaignContext.rules))
        campaignContext.classesById = await loadClassesById(campaignId);

    for (const prepare of systemServerOf(campaignContext.rules).participant
        ?.prepareContext ?? [])
        await prepare(campaignId, campaignContext, { characters });

    return campaignContext;
}

/** Only skills referenced by characters and spell rows without descriptions (egress saving). */
export async function buildCampaignContextForStart(
    campaignId: string,
    characters: CharacterWithRelations[],
    units: UnitRow[]
): Promise<BuildContextResult> {
    const uniqueRaceNames = [
        ...new Set(characters.map((c) => c.race).filter(Boolean)),
    ];

    const unitRaceIds = [
        ...new Set(
            units.map((u) => u.raceId).filter((id): id is string => !!id)
        ),
    ];

    const raceFilters = [
        ...(uniqueRaceNames.length > 0
            ? [{ name: { in: uniqueRaceNames } }]
            : []),
        ...(unitRaceIds.length > 0 ? [{ id: { in: unitRaceIds } }] : []),
    ];

    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { maxLevel: true, rules: true },
    });

    const rules = parseRules(campaign?.rules ?? {});

    const itemsEnabled = rules.items.enabled;

    const allArtifactIds = [
        ...new Set(
            characters.flatMap((c) =>
                inventoryArtifactIds(c.inventory, {
                    stash: itemsEnabled,
                    consumables: itemsEnabled,
                })
            )
        ),
    ];

    const [races, spells, batchArtifacts] = await Promise.all([
        raceFilters.length > 0
            ? prisma.race.findMany({ where: { campaignId, OR: raceFilters } })
            : [],
        characters.length > 0
            ? prisma.spell.findMany({
                  where: { campaignId },
                  select: {
                      id: true,
                      level: true,
                      spellGroup: { select: { id: true } },
                  },
              })
            : [],
        characters.length > 0 && allArtifactIds.length > 0
            ? prisma.artifact.findMany({
                  where: { id: { in: allArtifactIds }, campaignId },
              })
            : [],
    ]);

    const { racesByName, racesById } = indexRaces(
        races,
        uniqueRaceNames,
        unitRaceIds
    );

    const campaignContext =
        characters.length > 0
            ? await assembleCampaignContext({
                  campaignId,
                  characters,
                  spells,
                  batchArtifacts,
                  racesByName,
                  campaign,
                  rules,
              })
            : undefined;

    return { campaignContext, racesById };
}
