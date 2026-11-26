import type { CompendiumReport } from '@/types/compendium-import';

export type KindChanges = {
    kind: string;
    created: number;
    updated: number;
    unchanged: number;
};

export function changesByKind(rows: CompendiumReport['rows']): KindChanges[] {
    const byKind = new Map<string, KindChanges>();

    for (const row of rows) {
        const entry = byKind.get(row.kind) ?? {
            kind: row.kind,
            created: 0,
            updated: 0,
            unchanged: 0,
        };

        if (row.status === 'create') entry.created += 1;
        else if (row.status === 'update') entry.updated += 1;
        else if (row.status === 'unchanged') entry.unchanged += 1;

        byKind.set(row.kind, entry);
    }

    return [...byKind.values()];
}
