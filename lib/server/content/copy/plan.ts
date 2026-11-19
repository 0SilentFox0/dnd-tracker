import { type CopyRow, refsOf, selectClosure } from './closure';
import { dropRefs } from './drop-refs';
import { kindOfTable as contentKindOfTable, nameOf } from './row-names';

import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import { isKindActive } from '@/lib/server/content/kind-active';
import {
    type Bundle,
    type BundleTable,
    emptyBundle,
    tableOfKind,
} from '@/lib/server/templates/bundle';
import { remapIds } from '@/lib/server/templates/remap-ids';
import type { Actor } from '@/lib/utils/api/actor';

export type CopyPlan = {
    toCreate: CopyRow[];
    reuse: Map<string, string>;
    reused: Array<{ kind: string; id: string; name: string }>;
    skipped: Array<{
        kind: string;
        name: string;
        reason:
            | 'exists'
            | 'limit'
            | 'file-failed'
            | 'kind-unsupported'
            | 'unknown-kind'
            | 'not-found'
            | 'duplicate-name';
    }>;
    warnings: string[];
    bundle: Bundle;
};

const nameKey = (row: Record<string, unknown>): string | undefined => {
    const n = typeof row.name === 'string' ? row.name : row.title;

    return typeof n === 'string' ? n.trim().toLowerCase() : undefined;
};

const kindOfTable = (table: BundleTable) =>
    contentKindOfTable(table) ?? table;

export async function loadActiveTables(targetActor: Actor) {
    const active = new Map<BundleTable, boolean>();

    for (const kind of CONTENT_KINDS) {
        const t = tableOfKind(kind)?.key;

        if (t) active.set(t, await isKindActive(kind, targetActor));
    }

    return active;
}

export function removeFromPlan(plan: CopyPlan, ids: Set<string>) {
    plan.toCreate = plan.toCreate
        .filter(({ row }) => !ids.has(row.id))
        .map(({ table, row }) => ({ table, row: dropRefs(row, ids) }));
    plan.bundle = emptyBundle();

    for (const { table, row } of plan.toCreate) plan.bundle[table].push(row);
}

export async function buildCopyPlan(args: {
    source: Bundle;
    target: Bundle;
    targetActor: Actor;
    selected: Array<{ kind: string; ids: string[] }>;
    /** Preloaded so no pool read happens while the target write lock holds a connection. */
    active?: Map<BundleTable, boolean>;
    /** Free track slots in the target (MAX_TRACKS_PER_CAMPAIGN minus its current count). */
    trackRoom?: number;
}): Promise<CopyPlan> {
    const { source, target, targetActor } = args;

    const plan: CopyPlan = {
        toCreate: [],
        reuse: new Map(),
        reused: [],
        skipped: [],
        warnings: [],
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

    const active = args.active ?? (await loadActiveTables(targetActor));

    const roots: Array<{ table: BundleTable; id: string }> = [];

    for (const { kind, ids } of args.selected) {
        const table = tableOfKind(kind)?.key;

        for (const id of ids) {
            const row = table
                ? source[table].find((r) => r.id === id)
                : undefined;

            if (!table) {
                plan.skipped.push({ kind, name: kind, reason: 'unknown-kind' });

                continue;
            }

            if (!row) {
                plan.skipped.push({ kind, name: id, reason: 'not-found' });

                continue;
            }

            if (active.get(table) === false)
                plan.skipped.push({
                    kind,
                    name: nameOf(row),
                    reason: 'kind-unsupported',
                });
            else if (targetIdOf(table, row))
                plan.skipped.push({
                    kind,
                    name: nameOf(row),
                    reason: 'exists',
                });
            else roots.push({ table, id });
        }
    }

    const { rows, boundary } = selectClosure(source, roots, (entry) => {
        if (active.get(entry.table) === false) return true;

        return targetIdOf(entry.table, entry.row) !== undefined;
    });

    const unsupported = new Map<string, { kind: string; name: string }>();

    for (const { table, row } of boundary) {
        const kind = kindOfTable(table);

        const existing = targetIdOf(table, row);

        if (existing) {
            plan.reuse.set(row.id, existing);
            plan.reused.push({ kind, id: row.id, name: nameOf(row) });
        } else {
            unsupported.set(row.id, { kind, name: nameOf(row) });
            plan.skipped.push({
                kind,
                name: nameOf(row),
                reason: 'kind-unsupported',
            });
        }
    }

    const winners = new Map<string, string>();

    const dropped = new Map<string, string>();

    const kept: CopyRow[] = [];

    for (const entry of rows) {
        const n = nameKey(entry.row);

        const key = `${entry.table}:${n}`;

        const winner = n === undefined ? undefined : winners.get(key);

        if (winner) {
            dropped.set(entry.row.id, winner);
            plan.skipped.push({
                kind: kindOfTable(entry.table),
                name: nameOf(entry.row),
                reason: 'duplicate-name',
            });
        } else {
            if (n !== undefined) winners.set(key, entry.row.id);

            kept.push(entry);
        }
    }

    const dropIds = new Set(unsupported.keys());

    plan.toCreate = kept.map(({ table, row }) => {
        const remapped = dropped.size === 0 ? row : remapIds(row, dropped);

        return {
            table,
            row: dropIds.size === 0 ? remapped : dropRefs(remapped, dropIds),
        };
    });

    for (const [i, { table, row }] of plan.toCreate.entries()) {
        plan.bundle[table].push(row);

        if (unsupported.size === 0) continue;

        for (const ref of refsOf(kept[i])) {
            const dep = unsupported.get(ref);

            if (dep)
                plan.warnings.push(
                    `${kindOfTable(table)} ${nameOf(row)}: ${dep.kind} dependency skipped`
                );
        }
    }

    if (args.trackRoom !== undefined) {
        const over = plan.toCreate
            .filter((e) => e.table === 'tracks')
            .slice(Math.max(args.trackRoom, 0))
            .map((e) => e.row);

        for (const row of over)
            plan.skipped.push({
                kind: 'tracks',
                name: nameOf(row),
                reason: 'limit',
            });

        if (over.length > 0)
            removeFromPlan(plan, new Set(over.map((r) => r.id)));
    }

    return plan;
}
