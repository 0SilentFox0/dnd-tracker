import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

type ReadDb = Pick<Prisma.TransactionClient, 'skillTreeProgress' | 'character'>;

type WriteDb = Pick<Prisma.TransactionClient, 'skillTreeProgress' | 'character'>;

export class ProgressVersionConflictError extends Error {
    constructor(readonly characterId: string) {
        super(`skill tree progress version conflict: ${characterId}`);
        this.name = 'ProgressVersionConflictError';
    }
}

// table wins; the legacy characters.skillTreeProgress column is the fallback until backfill
export async function readProgress(
    characterIds: string[],
    db: ReadDb = prisma
): Promise<Map<string, unknown>> {
    const result = new Map<string, unknown>();

    if (characterIds.length === 0) return result;

    const [rows, columns] = await Promise.all([
        db.skillTreeProgress.findMany({
            where: { characterId: { in: characterIds } },
        }),
        db.character.findMany({
            where: { id: { in: characterIds } },
            select: { id: true, skillTreeProgress: true },
        }),
    ]);

    for (const c of columns) result.set(c.id, c.skillTreeProgress);

    for (const r of rows) result.set(r.characterId, r.progress);

    return result;
}

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
        try {
            await tx.skillTreeProgress.create({
                data: { characterId, progress, version: 1 },
            });
        } catch (e) {
            if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002'
            )
                throw new ProgressVersionConflictError(characterId);

            throw e;
        }
    } else {
        const { count } = await tx.skillTreeProgress.updateMany({
            where: { characterId, version: expectedVersion },
            data: { progress, version: { increment: 1 } },
        });

        if (count === 0) throw new ProgressVersionConflictError(characterId);
    }

    await tx.character.update({
        where: { id: characterId },
        data: { skillTreeProgress: progress },
    });
}
