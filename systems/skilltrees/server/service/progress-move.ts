import type { Prisma } from '@prisma/client';

import {
    ProgressVersionConflictError,
    readProgressRow,
    writeProgress,
} from '../progress-store';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';

const MOVE_ATTEMPTS = 3;

type ProgressDb = Pick<
    Prisma.TransactionClient,
    'character' | 'skillTreeProgress'
>;

// old progress was keyed by the id from the tree JSON; after saving, JSON id = row id, so the key is moved
export async function moveSkillTreeProgress(
    tx: ProgressDb,
    campaignId: string,
    race: string,
    from: string,
    to: string
) {
    const characters = await tx.character.findMany({
        where: { campaignId, race },
        select: { id: true },
    });

    for (const c of characters) await moveOne(tx, c.id, from, to);
}

async function moveOne(tx: ProgressDb, id: string, from: string, to: string) {
    for (let attempt = 0; attempt < MOVE_ATTEMPTS; attempt++) {
        const row = await readProgressRow(id, tx);

        const next = movedProgress(row?.progress, from, to);

        if (!row || !next) return;

        try {
            await writeProgress(tx, id, next, { expectedVersion: row.version });

            return;
        } catch (e) {
            if (!(e instanceof ProgressVersionConflictError)) throw e;
        }
    }

    throw new ContentError(API_ERRORS.SKILL_TREE_PROGRESS_CHANGED, 409);
}

function movedProgress(
    progress: unknown,
    from: string,
    to: string
): Prisma.InputJsonValue | null {
    if (!progress || typeof progress !== 'object') return null;

    const current = progress as Record<string, unknown>;

    if (!(from in current) || to in current) return null;

    const { [from]: moved, ...rest } = current;

    return { [to]: moved, ...rest } as Prisma.InputJsonValue;
}
