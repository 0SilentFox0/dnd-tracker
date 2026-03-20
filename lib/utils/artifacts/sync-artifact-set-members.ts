/**
 * Синхронізація складу сету: artifactIds у ArtifactSet + setId у Artifact.
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export class SyncArtifactSetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncArtifactSetError";
  }
}

/**
 * Очищає setId у всіх артефактів цього сету, призначає setId обраним id, оновлює artifactIds у сеті.
 */
export async function syncArtifactSetMembers(
  campaignId: string,
  setId: string,
  artifactIds: string[],
): Promise<void> {
  const unique = [...new Set(artifactIds)];

  if (unique.length > 0) {
    const count = await prisma.artifact.count({
      where: { id: { in: unique }, campaignId },
    });

    if (count !== unique.length) {
      throw new SyncArtifactSetError(
        "Усі артефакти мають належати цій кампанії та існувати в базі.",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.artifact.updateMany({
      where: { campaignId, setId },
      data: { setId: null },
    });

    if (unique.length > 0) {
      await tx.artifact.updateMany({
        where: { id: { in: unique }, campaignId },
        data: { setId },
      });
    }

    await tx.artifactSet.update({
      where: { id: setId },
      data: {
        artifactIds: unique as unknown as Prisma.InputJsonValue,
      },
    });
  });
}
