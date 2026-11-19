import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

type ReadDb = Pick<Prisma.TransactionClient, 'skillTreeProgress'>;

type WriteDb = Pick<Prisma.TransactionClient, 'skillTreeProgress'>;

export class ProgressVersionConflictError extends Error {
    constructor(readonly characterId: string) {
        super(`skill tree progress version conflict: ${characterId}`);
        this.name = 'ProgressVersionConflictError';
    }
}

export async function readProgress(
    characterIds: string[],
    db: ReadDb = prisma
): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();

    if (characterIds.length === 0) return result;

    const rows = await db.skillTreeProgress.findMany({
        where: { characterId: { in: characterIds } },
    });

    for (const r of rows) result.set(r.characterId, r.progress);

    return result;
}

export async function overlayProgress(
    characters: { id: string }[],
    db: Pick<Prisma.TransactionClient, 'skillTreeProgress'> = prisma
): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();

    if (characters.length === 0) return result;

    const rows = await db.skillTreeProgress.findMany({
        where: { characterId: { in: characters.map((c) => c.id) } },
    });

    for (const r of rows) result.set(r.characterId, r.progress);

    return result;
}

export async function readProgressTable(
    characterId: string,
    db: Pick<Prisma.TransactionClient, 'skillTreeProgress'> = prisma
): Promise<unknown> {
    const row = await db.skillTreeProgress.findUnique({
        where: { characterId },
        select: { progress: true },
    });

    return row?.progress;
}

export async function readProgressRow(
    characterId: string,
    db: ReadDb = prisma
): Promise<{ progress: unknown; version: number } | null> {
    const row = await db.skillTreeProgress.findUnique({
        where: { characterId },
    });

    return row ? { progress: row.progress, version: row.version } : null;
}

export const resetProgress = (
    tx: WriteDb,
    characterId: string
): Promise<void> => writeProgress(tx, characterId, {});

export async function writeProgress(
    tx: WriteDb,
    characterId: string,
    progress: Prisma.InputJsonValue,
    { expectedVersion }: { expectedVersion?: number } = {}
): Promise<void> {
    if (expectedVersion === undefined) {
        await tx.skillTreeProgress.upsert({
            where: { characterId },
            create: { characterId, progress, version: 1 },
            update: { progress, version: { increment: 1 } },
        });
    } else if (expectedVersion === 0) {
        const { count } = await tx.skillTreeProgress.createMany({
            data: [{ characterId, progress, version: 1 }],
            skipDuplicates: true,
        });

        if (count === 0) throw new ProgressVersionConflictError(characterId);
    } else {
        const { count } = await tx.skillTreeProgress.updateMany({
            where: { characterId, version: expectedVersion },
            data: { progress, version: { increment: 1 } },
        });

        if (count === 0) throw new ProgressVersionConflictError(characterId);
    }
}
