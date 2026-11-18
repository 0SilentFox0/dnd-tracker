import { canonicalKey, nameKey, sameEdition, sameSource } from './identity';
import { mergeValue, setPath } from './plan-merge';
import type { ExistingEntry, PlannedWrite, PlanState, Resolved } from './plan-types';
import { type AdaptedEntry, type CompendiumRef, issue } from './types';

import type { JsonRecord } from '@/lib/utils/compendium-import/parse';
export const refKey = (ref: CompendiumRef) =>
    canonicalKey(ref.kind, ref.name, ref.source, ref.edition, ref.parent);

export const REF_KINDS: Record<string, AdaptedEntry['kind']> = {
    feat: 'feats',
    spell: 'spells',
    class: 'classes',
    race: 'races',
    background: 'backgrounds',
    monster: 'units',
    item: 'artifacts',
    spellSchool: 'spell-groups',
};

export const expectedKind = (
    ref: CompendiumRef
): AdaptedEntry['kind'] | undefined =>
    REF_KINDS[ref.kind] ??
    (ref.kind.startsWith('template:')
        ? (ref.kind.slice(9) as AdaptedEntry['kind'])
        : undefined);

export function plannedResolved(ps: PlanState, key: string): Resolved | undefined {
    ps.visit(key);

    const p = ps.planned.get(key);

    return p && { localId: p.localId, body: p.body, key };
}

export function resolveBound(
    ps: PlanState,
    ref: CompendiumRef,
    owner: AdaptedEntry,
    bound: ExistingEntry
): Resolved | undefined {
    const { context, errors, byKey } = ps;

    if (
        bound.edition &&
        bound.edition !== 'unknown' &&
        ref.edition !== 'unknown' &&
        bound.edition !== ref.edition &&
        !context.allowMixedEdition
    ) {
        errors.push(
            issue('MIXED_EDITION_CONFIRMATION_REQUIRED', owner.key, 'error')
        );

        return;
    }

    if (
        bound.edition &&
        bound.edition !== 'unknown' &&
        ref.edition !== 'unknown' &&
        bound.edition !== ref.edition
    )
        owner.issues.push(
            issue('MIXED_EDITION_WARNING', owner.key, 'warning', {
                variant: 'dependency',
                edition: bound.edition,
                content: ref.edition,
            })
        );

    if (bound.kind && expectedKind(ref) && bound.kind !== expectedKind(ref)) {
        errors.push(issue('BINDING_WRONG_KIND', owner.key, 'error'));

        return;
    }

    if (byKey.has(bound.key)) return plannedResolved(ps, bound.key);

    return { localId: bound.localId, body: bound.body, key: bound.key };
}

export function findOwn(
    ps: PlanState,
    ref: CompendiumRef,
    owner: AdaptedEntry
): AdaptedEntry | undefined {
    const candidates = ps.entries.filter(
        (e) =>
            e.key !== owner.key &&
            e.kind === expectedKind(ref) &&
            nameKey(e.name) === nameKey(ref.name)
    );

    return (
        candidates.find(
            (e) =>
                sameSource(e.source, ref.source) &&
                sameEdition(e.edition, ref.edition)
        ) ?? candidates[0]
    );
}

export function resolveRef(
    ps: PlanState,
    ref: CompendiumRef,
    owner: AdaptedEntry
): Resolved | undefined {
    const key = refKey(ref);

    if (ps.byKey.has(key)) return plannedResolved(ps, key);

    const bound = ps.context.bindings?.[key] ?? ps.existing.get(key);

    if (bound && !bound.missing) return resolveBound(ps, ref, owner, bound);

    const own = findOwn(ps, ref, owner);

    if (own) {
        if (!sameEdition(own.edition, ref.edition))
            owner.issues.push(
                issue('MIXED_EDITION_WARNING', owner.key, 'warning', {
                    variant: 'reference',
                    name: ref.name,
                    edition: ref.edition,
                    own: own.edition,
                })
            );
        else if (!sameSource(own.source, ref.source))
            owner.issues.push(
                issue('SOURCE_MISMATCH_WARNING', owner.key, 'warning', {
                    name: ref.name,
                    source: ref.source,
                    own: own.source,
                })
            );

        return plannedResolved(ps, own.key);
    }

    const error = issue(
        'UNRESOLVED_REF',
        `${owner.key}.${ref.path.join('.')}`,
        'error',
        { name: ref.name, kind: ref.kind, owner: owner.name }
    );

    owner.issues.push(error);
    ps.errors.push(error);

    return undefined;
}

export function bindRefs(
    ps: PlanState,
    entry: AdaptedEntry,
    body: JsonRecord,
    resolvedBindings: NonNullable<PlannedWrite['resolvedBindings']>
) {
    for (const ref of entry.refs) {
        const target = resolveRef(ps, ref, entry);

        if (!target) continue;

        const kind = expectedKind(ref);

        if (kind) resolvedBindings[refKey(ref)] = { kind, id: target.localId };

        if (ref.path[0] === 'originFeatId' && target.body.type !== 'origin') {
            const err = issue('BACKGROUND_FEAT_INVALID', entry.key, 'error');

            ps.errors.push(err);
            entry.issues.push(err);
        }

        setPath(body, ref.path, target.localId);
    }
}

export function mergeIntoParent(
    ps: PlanState,
    entry: AdaptedEntry,
    parent: Resolved,
    body: JsonRecord
) {
    const merged = mergeValue(parent.body, {}, body) as JsonRecord;

    const parentWrite = ps.planned.get(parent.key);

    if (parentWrite) {
        parentWrite.body = merged;

        if (entry.refs.length > 0) {
            ps.writes.splice(ps.writes.indexOf(parentWrite), 1);
            ps.writes.push(parentWrite);
        }

        if (parentWrite.operation === 'unchanged')
            parentWrite.operation = 'update';

        return;
    }

    const parentEntry: PlannedWrite = {
        ...entry,
        provenance: false,
        inputKind: 'mergeParent',
        key: parent.key,
        name: String(parent.body.name),
        body: merged,
        localId: parent.localId,
        mergeParent: undefined,
        operation: 'update',
    };

    ps.planned.set(parent.key, parentEntry);
    ps.writes.push(parentEntry);
}

