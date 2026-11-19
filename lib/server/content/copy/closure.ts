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

const FKS_OF = new Map(BUNDLE_TABLES.map((t) => [t.key, t.fks]));

export function refsOf(entry: CopyRow): Set<string> {
    const refs = new Set<string>();

    for (const col of Object.keys(FKS_OF.get(entry.table) ?? {})) {
        const v = entry.row[col];

        if (typeof v === 'string') refs.add(v);
    }

    for (const s of collectKeysAndStrings(entry.row))
        if (CONTENT_ID_RE.test(s)) refs.add(s);

    return refs;
}

export function selectClosure(
    bundle: Bundle,
    selected: ReadonlyArray<{ table: BundleTable; id: string }>,
    isBoundary?: (entry: CopyRow) => boolean
): { rows: CopyRow[]; missing: string[]; boundary: CopyRow[] } {
    const index = new Map<string, CopyRow>();

    for (const def of BUNDLE_TABLES)
        for (const row of bundle[def.key] ?? [])
            index.set(row.id, { table: def.key, row });

    const seen = new Set<string>();

    const missing = new Set<string>();

    const rows: CopyRow[] = [];

    const boundary: CopyRow[] = [];

    const roots = new Set(selected.map((s) => s.id));

    const queue = selected.map((s) => s.id);

    for (let head = 0; head < queue.length; head++) {
        const id = queue[head];

        if (seen.has(id)) continue;

        const entry = index.get(id);

        if (!entry) continue;

        seen.add(id);

        if (isBoundary && !roots.has(id) && isBoundary(entry)) {
            boundary.push(entry);
            continue;
        }

        rows.push(entry);

        const refs = refsOf(entry);

        refs.delete(id);

        for (const ref of refs) {
            if (index.has(ref)) queue.push(ref);
            else if (CONTENT_ID_RE.test(ref)) missing.add(ref);
        }
    }

    return { rows, missing: [...missing], boundary };
}
