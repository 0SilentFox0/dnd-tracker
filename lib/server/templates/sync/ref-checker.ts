import type { ContentRefSource } from '@/lib/server/systems/types';
import { collectKeysAndStrings } from '@/lib/server/templates/remap-ids';
import type { SyncDb } from '@/lib/server/templates/sync/context';

/** Inventories hold artifact ids in JSON (equipped, backpack, stash), so no FK stops a sync delete. */
const ARTIFACTS: ContentRefSource = {
    kind: 'artifacts',
    reason: 'in a character inventory',
    async referenced(db, campaignId) {
        const inventories = await db.characterInventory.findMany({
            where: { character: { campaignId } },
            select: { equipped: true, backpack: true, stash: true },
        });

        return collectKeysAndStrings(
            inventories.flatMap((i) => [i.equipped, i.backpack, i.stash])
        );
    },
};

const sources = async (): Promise<ContentRefSource[]> => [
    ARTIFACTS,
    ...(await import('@/lib/server/systems/registry')).systemContentRefs(),
];

const blockedText = (source: ContentRefSource, name: string) =>
    `${source.kind} ${name}: not deleted, ${source.reason}`;

/** Lazy per-sync memo of reference sets, so N deleted rows cost one read per scope. */
export function createRefChecker(db: SyncDb, campaignId: string) {
    const memo = new Map<string, Promise<Set<string>>>();

    const refs = async (scope: string) => {
        const source = (await sources()).find((s) => s.kind === scope);

        if (!source) return null;

        if (!memo.has(scope))
            memo.set(scope, source.referenced(db, campaignId));

        return { source, used: await memo.get(scope)! };
    };

    return {
        /** Warning when the row is still referenced (caller skips the delete), otherwise null. */
        async blockedBy(
            scope: string,
            ids: string[],
            name: string
        ): Promise<string | null> {
            const hit = await refs(scope);

            return hit && ids.some((id) => hit.used.has(id))
                ? blockedText(hit.source, name)
                : null;
        },
        async deleted(scope: string) {
            const source = (await sources()).find((s) => s.kind === scope);

            for (const kind of source?.invalidatesOnDelete ?? [])
                memo.delete(kind);
        },
    };
}

export type RefChecker = ReturnType<typeof createRefChecker>;

export async function danglingWarnings(
    db: SyncDb,
    campaignId: string
): Promise<string[]> {
    const found = await Promise.all(
        (await sources()).map((s) => s.dangling?.(db, campaignId) ?? [])
    );

    return found.flat();
}
