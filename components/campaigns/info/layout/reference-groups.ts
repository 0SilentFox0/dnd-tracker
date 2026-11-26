import { groupDisplayName, UNGROUPED_KEY } from '@/lib/constants/ungrouped';
import { groupBy } from '@/lib/utils/common/collections';

export interface ReferenceGroup<T> {
    key: string;
    title: string;
    accent?: string;
    items: T[];
}

export function groupSorted<T>(
    items: readonly T[],
    keyOf: (item: T) => string | null,
    ungroupedLabel: string,
    accentOf?: (first: T) => string | null
): ReferenceGroup<T>[] {
    const byKey = groupBy(items, (item) => keyOf(item) ?? UNGROUPED_KEY);

    return Array.from(byKey.entries())
        .sort(([a], [b]) => {
            if (a === UNGROUPED_KEY) return 1;

            if (b === UNGROUPED_KEY) return -1;

            return a.localeCompare(b);
        })
        .map(([key, list]) => ({
            key,
            title: groupDisplayName(key, ungroupedLabel),
            accent: accentOf?.(list[0]) ?? undefined,
            items: list,
        }));
}

export const singleGroup = <T>(
    key: string,
    title: string,
    items: T[]
): ReferenceGroup<T>[] => (items.length ? [{ key, title, items }] : []);
