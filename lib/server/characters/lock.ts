import { Prisma } from '@prisma/client';

import { readResources } from '@/lib/utils/characters/resources/schema';
import type { CharacterResources } from '@/types/characters';

export interface LockedCharacter {
    id: string;
    resources: CharacterResources;
    experience: number;
    characteristics: unknown;
}

/** SELECT ... FOR UPDATE in a transaction: read-modify-write of resources/experience keeps concurrent edits. */
export async function lockCharacters(
    tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
    ids: string[]
): Promise<Map<string, LockedCharacter>> {
    if (ids.length === 0) return new Map();

    const rows = await tx.$queryRaw<
        {
            id: string;
            resources: unknown;
            experience: number;
            characteristics: unknown;
        }[]
    >`
    SELECT id, resources, experience, characteristics FROM characters WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;

    return new Map(
        rows.map((r) => [
            r.id,
            {
                id: r.id,
                resources: readResources(r.resources),
                experience: r.experience,
                characteristics: r.characteristics,
            },
        ])
    );
}
