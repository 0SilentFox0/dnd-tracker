import { Prisma } from '@prisma/client';

import 'server-only';
import { prisma } from '@/lib/db';
import { abilitiesJson } from '@/lib/utils/abilities/read';
import type { Ability } from '@/lib/utils/abilities/schema';
import { withAbilitySummary } from '@/lib/utils/abilities/summary';

const memberListSelect = { id: true, name: true, slot: true } as const;

const memberDetailSelect = {
    id: true,
    name: true,
    slot: true,
    icon: true,
} as const;

async function withMembers<
    T extends { id: string },
    S extends Prisma.ArtifactSelect,
>(sets: T[], select: S) {
    const members = sets.length
        ? ((await prisma.artifact.findMany({
              where: { setId: { in: sets.map((s) => s.id) } },
              select: { ...select, setId: true } as Prisma.ArtifactSelect,
          })) as unknown as (Prisma.ArtifactGetPayload<{ select: S }> & {
              setId: string;
          })[])
        : [];

    return sets.map((set) => ({
        ...set,
        artifacts: members
            .filter((m) => m.setId === set.id)
            .map(({ setId: _setId, ...rest }) => rest),
    }));
}

function setBonusToPrismaInput(
    value: unknown | undefined | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined) return Prisma.JsonNull;

    if (value === null) return Prisma.JsonNull;

    return value as Prisma.InputJsonValue;
}

export function buildArtifactSetPatchInput(data: {
    name?: string;
    description?: string | null;
    setBonus?: unknown | null;
    icon?: string | null;
    abilities?: Ability[];
}): Prisma.ArtifactSetUpdateInput {
    const update: Prisma.ArtifactSetUpdateInput = {};

    if (data.name !== undefined) update.name = data.name;

    if (data.description !== undefined) {
        update.description = data.description;
    }

    if (data.setBonus !== undefined) {
        update.setBonus =
            data.setBonus === null
                ? Prisma.JsonNull
                : (data.setBonus as Prisma.InputJsonValue);
    }

    if (data.icon !== undefined) {
        update.icon = data.icon;
    }

    if (data.abilities !== undefined)
        update.abilities = abilitiesJson(data.abilities);

    return update;
}

export async function listArtifactSets(campaignId: string) {
    const sets = await prisma.artifactSet.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
    });

    return (await withMembers(sets, memberListSelect)).map((s) =>
        withAbilitySummary('artifactSet', s)
    );
}

export async function findArtifactSetInCampaign(
    campaignId: string,
    setId: string
) {
    const row = await prisma.artifactSet.findFirst({
        where: { id: setId, campaignId },
    });

    if (!row) return null;

    return (await withMembers([row], memberDetailSelect))[0];
}

export async function reloadArtifactSetDetail(
    campaignId: string,
    setId: string
) {
    const row = await prisma.artifactSet.findFirst({
        where: { id: setId, campaignId },
    });

    if (!row) {
        throw new Error(`ArtifactSet not found: ${setId}`);
    }

    return (await withMembers([row], memberDetailSelect))[0];
}

export async function insertArtifactSet(
    campaignId: string,
    input: {
        name: string;
        description: string | null;
        setBonus: unknown | undefined;
        icon?: string | null;
        abilities?: Ability[];
    }
) {
    const row = await prisma.artifactSet.create({
        data: {
            campaignId,
            name: input.name,
            description: input.description,
            setBonus: setBonusToPrismaInput(input.setBonus),
            ...(input.abilities && {
                abilities: abilitiesJson(input.abilities),
            }),
            icon: input.icon?.trim() ? input.icon.trim() : null,
        },
    });

    return {
        ...row,
        artifacts: [] as Prisma.ArtifactGetPayload<{
            select: typeof memberListSelect;
        }>[],
    };
}

export async function updateArtifactSetRow(
    setId: string,
    data: Prisma.ArtifactSetUpdateInput
) {
    const row = await prisma.artifactSet.update({
        where: { id: setId },
        data,
    });

    return row;
}

export async function deleteArtifactSetAndClearArtifacts(
    campaignId: string,
    setId: string
) {
    await prisma.$transaction([
        prisma.artifact.updateMany({
            where: { campaignId, setId },
            data: { setId: null },
        }),
        prisma.artifactSet.deleteMany({ where: { id: setId, campaignId } }),
    ]);
}

export async function findArtifactSetForEdit(
    campaignId: string,
    setId: string
) {
    const set = await prisma.artifactSet.findFirst({
        where: { id: setId, campaignId },
    });

    if (!set) return null;

    const members = await prisma.artifact.findMany({
        where: { setId },
        select: { id: true },
    });

    return { set, artifactIds: members.map((a) => a.id) };
}
