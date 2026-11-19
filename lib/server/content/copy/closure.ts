import {
    type Bundle,
    BUNDLE_TABLES,
    type BundleTable,
} from '@/lib/server/templates/bundle';
import { CONTENT_ID_RE } from '@/lib/server/templates/ids';
import { collectKeysAndStrings } from '@/lib/server/templates/remap-ids';

export type CopyRow = {
    table: BundleTable;
    row: Record<string, unknown> & { id: string };
};

export function selectClosure(
    bundle: Bundle,
    selected: ReadonlyArray<{ table: BundleTable; id: string }>
): { rows: CopyRow[]; missing: string[] } {
    const index = new Map<string, CopyRow>();

    for (const def of BUNDLE_TABLES)
        for (const row of bundle[def.key] ?? [])
            index.set(row.id, { table: def.key, row });

    const fksOf = new Map(BUNDLE_TABLES.map((t) => [t.key, t.fks]));

    const seen = new Set<string>();

    const missing = new Set<string>();

    const rows: CopyRow[] = [];

    const queue = selected.map((s) => s.id);

    while (queue.length) {
        const id = queue.shift() as string;

        if (seen.has(id)) continue;

        const entry = index.get(id);

        if (!entry) continue;

        seen.add(id);
        rows.push(entry);

        const refs = new Set<string>();

        for (const col of Object.keys(fksOf.get(entry.table) ?? {})) {
            const v = entry.row[col];

            if (typeof v === 'string') refs.add(v);
        }

        for (const s of collectKeysAndStrings(entry.row))
            if (CONTENT_ID_RE.test(s)) refs.add(s);

        refs.delete(id);

        for (const ref of refs) {
            if (index.has(ref)) queue.push(ref);
            else if (CONTENT_ID_RE.test(ref)) missing.add(ref);
        }
    }

    return { rows, missing: [...missing] };
}
