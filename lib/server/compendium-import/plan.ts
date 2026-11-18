import { domainSchemas } from './domain-schemas';
import { digest, nameKey, stableJson } from './identity';
import { managedProjection, reconcile } from './plan-merge';
import { bindRefs, expectedKind, mergeIntoParent, refKey, resolveRef } from './plan-resolve';
import { ADAPTER_VERSION, type ExistingEntry, type ImportPlan, type PlanContext, type PlannedWrite, type PlanState } from './plan-types';
import { type AdaptedCompendium, type AdaptedEntry, issue } from './types';

import { isRecord } from '@/lib/utils/common/is-record';
import type { JsonRecord } from '@/lib/utils/compendium-import/parse';

export { ADAPTER_VERSION, expectedKind, refKey };
export type { ExistingEntry, ImportPlan, PlanContext, PlannedWrite };

function disambiguateName(
    ps: PlanState,
    entry: AdaptedEntry,
    body: JsonRecord,
    localId: string,
    isNew: boolean
) {
    if (typeof body.name !== 'string') return;

    const lowered = entry.name.normalize('NFC').trim().toLowerCase();

    const collision =
        ps.entries.some(
            (e) =>
                e.key !== entry.key &&
                e.kind === entry.kind &&
                e.name.normalize('NFC').trim().toLowerCase() === lowered
        ) ||
        ps.context.occupiedNames?.[entry.kind]?.some(
            (r) =>
                r.id !== localId &&
                r.name.toLowerCase() === entry.name.toLowerCase()
        );

    if (!collision || !isNew) return;

    const taken = (name: string) =>
        ps.entries.some(
            (e) =>
                e.kind === entry.kind &&
                e.key !== entry.key &&
                e.name.toLowerCase() === name.toLowerCase()
        ) ||
        ps.context.occupiedNames?.[entry.kind]?.some(
            (r) =>
                r.id !== localId && r.name.toLowerCase() === name.toLowerCase()
        ) ||
        ps.usedNames.get(entry.kind)?.has(name.toLowerCase());

    const room = (suffix: string) =>
        `${entry.name.slice(0, Math.max(1, 100 - suffix.length))}${suffix}`;

    const candidates = [
        ` (${entry.source})`,
        ` (${entry.source}, ${entry.edition})`,
    ];

    let name = candidates.map(room).find((n) => !taken(n));

    for (let n = 2; !name; n++)
        if (!taken(room(` (${entry.source}) ${n}`)))
            name = room(` (${entry.source}) ${n}`);

    body.name = name;

    if (!ps.usedNames.has(entry.kind)) ps.usedNames.set(entry.kind, new Set());

    ps.usedNames.get(entry.kind)!.add(name.toLowerCase());
}

function validateStandalone(
    ps: PlanState,
    entry: AdaptedEntry,
    body: JsonRecord,
    sourceBody: JsonRecord
) {
    const schema = domainSchemas[entry.kind];

    const parsed = schema?.safeParse(body);

    if (parsed?.success)
        return {
            body: parsed.data as JsonRecord,
            sourceBody: schema!.parse({
                ...sourceBody,
                name: (parsed.data as JsonRecord).name,
            }) as JsonRecord,
        };

    for (const err of parsed && !parsed.success
        ? parsed.error.issues
        : [{ path: [] }])
        ps.errors.push(
            issue(
                'DOMAIN_SCHEMA',
                `${entry.key}.${err.path.join('.')}`,
                'error'
            )
        );

    return { body, sourceBody };
}

function visitEntry(ps: PlanState, key: string) {
    if (ps.states.get(key) === 'done') return;

    if (ps.states.get(key) === 'visiting') {
        ps.errors.push(issue('CYCLIC_REF', key, 'error'));

        return;
    }

    const entry = ps.byKey.get(key);

    if (!entry) return;

    ps.states.set(key, 'visiting');

    const resolvedBindings: NonNullable<PlannedWrite['resolvedBindings']> =
        Object.create(null);

    const bound = structuredClone(entry.body);

    bindRefs(ps, entry, bound, resolvedBindings);

    const old = ps.existing.get(key);

    const { body, sourceBody, localId } = placeEntry(
        ps,
        entry,
        old,
        bound,
        resolvedBindings
    );

    const write = buildWrite(entry, old, {
        body,
        sourceBody,
        localId,
        resolvedBindings,
    });

    ps.planned.set(key, write);
    ps.writes.push(write);
    ps.states.set(key, 'done');
}

function reconcileBody(
    ps: PlanState,
    entry: AdaptedEntry,
    old: ExistingEntry | undefined,
    bound: JsonRecord
) {
    let body = bound;

    const overwrite = ps.context.overwriteKeys?.includes(entry.key) === true;

    // A disambiguated display name is stable on reimport; original identity is stored separately.
    if (
        old &&
        old.baseline.name !== entry.name &&
        typeof old.baseline.name === 'string' &&
        body.name === entry.name
    )
        body.name = old.baseline.name;

    const sourceBody = structuredClone(body);

    body = reconcile(body, old, entry, overwrite);

    if (entry.mergeParent)
        body = managedProjection(body, sourceBody) as JsonRecord;

    return { body, sourceBody };
}

function placeEntry(
    ps: PlanState,
    entry: AdaptedEntry,
    old: ExistingEntry | undefined,
    bound: JsonRecord,
    resolvedBindings: NonNullable<PlannedWrite['resolvedBindings']>
) {
    let { body, sourceBody } = reconcileBody(ps, entry, old, bound);

    let localId = ps.ids.get(entry.key)!;

    const parent = entry.mergeParent
        ? resolveRef(ps, entry.mergeParent, entry)
        : undefined;

    if (parent && entry.mergeParent)
        resolvedBindings[refKey(entry.mergeParent)] = {
            kind: entry.kind,
            id: parent.localId,
        };

    if (parent) {
        localId = parent.localId;
        mergeIntoParent(ps, entry, parent, body);
    } else if (!entry.mergeParent) {
        disambiguateName(ps, entry, body, localId, !old);
        ({ body, sourceBody } = validateStandalone(
            ps,
            entry,
            body,
            sourceBody
        ));
    }

    return { body, sourceBody, localId };
}

function buildWrite(
    entry: AdaptedEntry,
    old: ExistingEntry | undefined,
    placed: {
        body: JsonRecord;
        sourceBody: JsonRecord;
        localId: string;
        resolvedBindings: NonNullable<PlannedWrite['resolvedBindings']>;
    }
): PlannedWrite {
    const { body, sourceBody, localId, resolvedBindings } = placed;

    const unchanged =
        old &&
        !old.missing &&
        stableJson(managedProjection(old.body, body)) === stableJson(body);

    const baseline = structuredClone(sourceBody);

    for (const conflict of entry.issues.filter(
        (i) => i.code === 'LOCAL_CONFLICT'
    )) {
        const field = conflict.path.slice(entry.key.length + 1);

        baseline[field] = old?.baseline[field];
    }

    return {
        ...entry,
        body,
        baseline,
        resolvedBindings,
        localId,
        operation: unchanged
            ? 'unchanged'
            : old && !old.missing
              ? 'update'
              : 'create',
        ...(entry.mergeParent && { nested: true }),
    };
}

function resolveSubclassLevel(ps: PlanState, row: PlannedWrite) {
    if (
        !Array.isArray(row.body.subclasses) ||
        !row.body.subclasses.length ||
        row.body.subclassLevel
    )
        return;

    const levels = row.body.subclasses.map((v) =>
        isRecord(v) && Array.isArray(v.features)
            ? Math.min(...v.features.map((f) => Number(isRecord(f) && f.level)))
            : Infinity
    );

    if (
        levels.every(
            (l) => Number.isInteger(l) && l > 0 && l <= 20 && l === levels[0]
        )
    ) {
        row.body.subclassLevel = levels[0];

        if (row.baseline) row.baseline.subclassLevel = levels[0];
    } else ps.errors.push(issue('SUBCLASS_LEVEL_REQUIRED', row.key, 'error'));
}

/** Nested assembly may have changed parent bodies: validate the final bodies again. */
function revalidateWrites(ps: PlanState) {
    for (const row of ps.writes.filter((r) => !r.nested)) {
        // A dependency alias may point at a row being created by this very plan; only actual local bindings can turn a derived parent write into an update.
        const previous =
            ps.context.existing.find((e) => e.key === row.key) ??
            Object.values(ps.context.bindings ?? {}).find(
                (e) => e.localId === row.localId && !ps.byKey.has(e.key)
            );

        resolveSubclassLevel(ps, row);

        const validated = domainSchemas[row.kind]?.safeParse(row.body);

        if (validated?.success) row.body = validated.data as JsonRecord;

        if (previous && !previous.missing)
            row.operation =
                stableJson(managedProjection(previous.body, row.body)) ===
                stableJson(row.body)
                    ? 'unchanged'
                    : 'update';

        if (!validated?.success)
            ps.errors.push(
                issue('DOMAIN_SCHEMA', row.key, 'error', {
                    variant: 'combined',
                })
            );
    }
}

function reuseNamedSchools(
    entries: AdaptedEntry[],
    context: PlanContext,
    existing: Map<string, ExistingEntry>
) {
    const bindings = { ...context.bindings };

    const kept = entries.filter((e) => {
        const row =
            e.kind === 'spell-groups' &&
            !existing.has(e.key) &&
            !bindings[e.key]
                ? context.occupiedNames?.['spell-groups']?.find(
                      (r) => nameKey(r.name) === nameKey(e.name)
                  )
                : undefined;

        if (row)
            bindings[e.key] = {
                key: e.key,
                edition: e.edition,
                kind: e.kind,
                localId: row.id,
                body: { name: row.name },
                baseline: { name: row.name },
            };

        return !row;
    });

    return { entries: kept, context: { ...context, bindings } };
}

const isExcludedPath = (excludedPaths: string[], path: string) =>
    excludedPaths.some((p) => path === p || path.startsWith(`${p}.`));

function createPlanState(
    adapted: AdaptedCompendium,
    context: PlanContext
): PlanState {
    const excluded = new Set(context.excludedKeys);

    const excludedPaths = [
        ...(adapted.blocked ?? [])
            .filter((b) => b.key && excluded.has(b.key))
            .map((b) => b.path),
        ...adapted.entries
            .filter((e) => excluded.has(e.key))
            .flatMap((e) => [e.key, ...(e.inputPath ? [e.inputPath] : [])]),
    ];

    const errors = adapted.issues.filter(
        (i) => i.severity === 'error' && !isExcludedPath(excludedPaths, i.path)
    );

    const existing = new Map(context.existing.map((e) => [e.key, e]));

    const reused = reuseNamedSchools(
        adapted.entries.filter((e) => !excluded.has(e.key)),
        context,
        existing
    );

    context = reused.context;

    const entries = reused.entries.map((e) => structuredClone(e));

    const fresh = (key: string) =>
        `c${digest([context.campaignId, key]).slice(0, 24)}`;

    const ids = new Map(
        entries.map((e) => [
            e.key,
            existing.get(e.key)?.missing
                ? fresh(e.key)
                : (existing.get(e.key)?.localId ?? fresh(e.key)),
        ])
    );

    const ps: PlanState = {
        context,
        excludedPaths,
        writes: [],
        errors,
        entries,
        byKey: new Map(entries.map((e) => [e.key, e])),
        existing,
        ids,
        states: new Map(),
        planned: new Map(),
        usedNames: new Map(),
        visit: (key) => visitEntry(ps, key),
    };

    return ps;
}

export function buildImportPlan(
    adapted: AdaptedCompendium,
    context: PlanContext
): ImportPlan {
    const ps = createPlanState(adapted, context);

    ps.entries.forEach((e) => visitEntry(ps, e.key));
    revalidateWrites(ps);

    const { writes, errors } = ps;

    const warnings = [
        ...adapted.issues.filter(
            (i) =>
                i.severity !== 'error' &&
                !isExcludedPath(ps.excludedPaths, i.path)
        ),
        ...writes.flatMap((r) =>
            r.issues.filter((i) => i.severity !== 'error')
        ),
    ];

    return {
        writes,
        errors,
        warnings,
        hash: digest({
            version: ADAPTER_VERSION,
            writes,
            errors,
            baseline: context.existing.map((r) => [r.key, r.localId, r.body]),
            bindings: context.bindings ?? {},
            settingsHash: context.settingsHash,
        }),
    };
}
