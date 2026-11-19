import { type CopyRow,selectClosure } from './closure';

import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import { isKindActive } from '@/lib/server/content/kind-active';
import {
    type Bundle,
    type BundleTable,
    emptyBundle,
    tableOfKind,
} from '@/lib/server/templates/bundle';
import type { Actor } from '@/lib/utils/api/actor';

export type CopyPlan = {
    toCreate: CopyRow[];
    reuse: Map<string, string>;
    reused: Array<{ kind: string; id: string; name: string }>;
    skipped: Array<{
        kind: string;
        name: string;
        reason: 'exists' | 'kind-unsupported';
    }>;
    bundle: Bundle;
};

const nameKey = (row: Record<string, unknown>): string | undefined => {
    const n = row.name ?? row.title;

    return typeof n === 'string' ? n.trim().toLowerCase() : undefined;
};

const nameOf = (row: Record<string, unknown>) =>
    String(row.name ?? row.title ?? row.id);

const kindOfTable = (table: BundleTable) =>
    CONTENT_KINDS.find((k) => tableOfKind(k)?.key === table) ?? table;

export async function buildCopyPlan(args: {
    source: Bundle;
    target: Bundle;
    targetActor: Actor;
    selected: Array<{ kind: string; ids: string[] }>;
}): Promise<CopyPlan> {
    const { source, target, targetActor } = args;

    const plan: CopyPlan = {
        toCreate: [],
        reuse: new Map(),
        reused: [],
        skipped: [],
        bundle: emptyBundle(),
    };

    const targetIds = new Map<string, string>();

    for (const key of Object.keys(target) as BundleTable[]) {
        const rows = target[key];

        if (!Array.isArray(rows)) continue;

        for (const row of rows) {
            const n = nameKey(row);

            if (n !== undefined) targetIds.set(`${key}:${n}`, row.id);
        }
    }

    const targetIdOf = (table: BundleTable, row: Record<string, unknown>) => {
        const n = nameKey(row);

        return n === undefined ? undefined : targetIds.get(`${table}:${n}`);
    };

    const active = new Map<BundleTable, boolean>();

    for (const kind of CONTENT_KINDS) {
        const t = tableOfKind(kind)?.key;

        if (t) active.set(t, await isKindActive(kind, targetActor));
    }

    const roots: Array<{ table: BundleTable; id: string }> = [];

    for (const { kind, ids } of args.selected) {
        const table = tableOfKind(kind)?.key;

        for (const id of ids) {
            const row = table
                ? source[table].find((r) => r.id === id)
                : undefined;

            if (!table || !row) {
                if (!table)
                    plan.skipped.push({
                        kind,
                        name: id,
                        reason: 'kind-unsupported',
                    });

                continue;
            }

            if (active.get(table) === false)
                plan.skipped.push({
                    kind,
                    name: nameOf(row),
                    reason: 'kind-unsupported',
                });
            else if (targetIdOf(table, row))
                plan.skipped.push({ kind, name: nameOf(row), reason: 'exists' });
            else roots.push({ table, id });
        }
    }

    const { rows, boundary } = selectClosure(source, roots, (entry) => {
        if (active.get(entry.table) === false) return true;

        return targetIdOf(entry.table, entry.row) !== undefined;
    });

    for (const { table, row } of boundary) {
        const kind = kindOfTable(table);

        const existing = targetIdOf(table, row);

        if (existing) {
            plan.reuse.set(row.id, existing);
            plan.reused.push({ kind, id: row.id, name: nameOf(row) });
        } else
            plan.skipped.push({
                kind,
                name: nameOf(row),
                reason: 'kind-unsupported',
            });
    }

    plan.toCreate = rows;

    for (const { table, row } of rows) plan.bundle[table].push(row);

    return plan;
}
