/**
 * Prisma-операції для сетів артефактів (спільно для API routes).
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

const includeList = {
  artifacts: {
    select: { id: true, name: true, slot: true },
  },
} as const;

const includeDetail = {
  artifacts: {
    select: { id: true, name: true, slot: true, icon: true },
  },
} as const;

export function setBonusToPrismaInput(
  value: unknown | undefined | null,
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

  return update;
}

export async function listArtifactSets(campaignId: string) {
  return prisma.artifactSet.findMany({
    where: { campaignId },
    include: includeList,
    orderBy: { createdAt: "desc" },
  });
}

export async function findArtifactSetInCampaign(
  campaignId: string,
  setId: string,
) {
  return prisma.artifactSet.findFirst({
    where: { id: setId, campaignId },
    include: includeDetail,
  });
}

export async function reloadArtifactSetWithArtifacts(setId: string) {
  const row = await prisma.artifactSet.findUnique({
    where: { id: setId },
    include: includeList,
  });

  if (!row) {
    throw new Error(`ArtifactSet not found: ${setId}`);
  }

  return row;
}

export async function reloadArtifactSetDetail(setId: string) {
  const row = await prisma.artifactSet.findUnique({
    where: { id: setId },
    include: includeDetail,
  });

  if (!row) {
    throw new Error(`ArtifactSet not found: ${setId}`);
  }

  return row;
}

export async function insertArtifactSet(
  campaignId: string,
  input: {
    name: string;
    description: string | null;
    setBonus: unknown | undefined;
    icon?: string | null;
  },
) {
  return prisma.artifactSet.create({
    data: {
      campaignId,
      name: input.name,
      description: input.description,
      setBonus: setBonusToPrismaInput(input.setBonus),
      icon: input.icon?.trim() ? input.icon.trim() : null,
    },
    include: includeList,
  });
}

export async function updateArtifactSetRow(
  setId: string,
  data: Prisma.ArtifactSetUpdateInput,
) {
  return prisma.artifactSet.update({
    where: { id: setId },
    data,
  });
}

export async function deleteArtifactSetAndClearArtifacts(
  campaignId: string,
  setId: string,
) {
  await prisma.$transaction([
    prisma.artifact.updateMany({
      where: { campaignId, setId },
      data: { setId: null },
    }),
    prisma.artifactSet.delete({ where: { id: setId } }),
  ]);
}
