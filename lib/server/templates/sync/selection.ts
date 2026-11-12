import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SourceSyncApplyInput } from '@/lib/schemas/source-sync';
import { ContentError } from '@/lib/server/content/errors';
import type { SyncItem } from '@/lib/server/templates/sync/types';
import type { SyncRef } from '@/types/campaigns';

export const keyOf = (i: { scope: string; key: string }) =>
    `${i.scope}:${i.key}`;

export const sourceChanged = () =>
    new ContentError(API_ERRORS.SOURCE_CHANGED, 409);

export function sourceSelection(
    all: Map<string, SyncItem>,
    body: SourceSyncApplyInput
) {
    const pickItems = (refs: SyncRef[]) =>
        refs.map((r) => {
            const item = all.get(keyOf(r));

            if (
                !item ||
                item.sourceHash !== r.sourceHash ||
                item.status !== r.status
            )
                throw sourceChanged();

            return item;
        });

    const chosen = pickItems(body.apply);

    const ignored = pickItems(body.ignore);

    const { selected, autoAdded } = closeOverRequires(chosen, all);

    const items = [...selected.values()];

    return { selected, autoAdded, items, ignored };
}

function closeOverRequires(chosen: SyncItem[], all: Map<string, SyncItem>) {
    const selected = new Map(chosen.map((i) => [keyOf(i), i]));

    const autoAdded: SyncItem[] = [];

    const queue = [...chosen];

    while (queue.length > 0) {
        for (const req of queue.pop()!.requires) {
            const k = keyOf(req);

            const dep = all.get(k);

            if (
                selected.has(k) ||
                !dep ||
                (dep.status !== 'new' && dep.status !== 'deletedLocally')
            )
                continue;

            selected.set(k, dep);
            autoAdded.push(dep);
            queue.push(dep);
        }
    }

    return { selected, autoAdded };
}
