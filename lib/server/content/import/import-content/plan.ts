import { zodIssues } from './issues';
import { resolveNestedRefs, resolveRefs } from './refs';
import { err, hasError, NameIndex, Plan } from './shared';

import 'server-only';
import type { AnyContentResource } from '@/lib/server/content/define-resource';
import { coerceRecord, nameKey } from '@/lib/utils/content/import';
import { isSlug } from '@/lib/utils/templates/slug';
import type {
    ImportKind,
    ImportMode,
    ImportSpec,
} from '@/types/content-import';

export type PlanCtx = {
    spec: ImportSpec;
    resource: AnyContentResource;
    mode: ImportMode;
    existing: NameIndex;
    refs: Map<ImportKind, NameIndex>;
    seen: Set<string>;
    seenSlugs: Set<string>;
    incomingSlugs: Set<string>;
    claimed: Set<string>;
};

export function planRow(
    raw: Record<string, unknown>,
    row: number,
    ctx: PlanCtx
): Plan {
    const { slug: rawSlug, ...fields } = raw;

    const { value: record, issues } = coerceRecord(fields, ctx.spec.fields);

    const name = typeof record.name === 'string' ? record.name : undefined;

    if (!name)
        return {
            row,
            status: 'error',
            issues: [...issues, err('contentImport.issues.noName', 'name')],
        };

    const slug = typeof rawSlug === 'string' && rawSlug ? rawSlug : undefined;

    if (slug !== undefined && !isSlug(slug))
        return {
            row,
            name,
            status: 'error',
            issues: [
                ...issues,
                err('contentImport.issues.invalidSlug', 'slug'),
            ],
        };

    if (slug && ctx.seenSlugs.has(slug))
        return {
            row,
            name,
            status: 'error',
            issues: [
                ...issues,
                err('contentImport.issues.duplicateSlug', 'slug'),
            ],
        };

    const key = nameKey(name);

    if (ctx.seen.has(key)) {
        const message = 'contentImport.issues.duplicateName';

        return ctx.mode === 'skip'
            ? {
                  row,
                  name,
                  status: 'skipped',
                  issues: [...issues, { level: 'warning', message }],
              }
            : {
                  row,
                  name,
                  status: 'error',
                  issues: [...issues, err(message, 'name')],
              };
    }

    ctx.seen.add(key);

    if (slug) ctx.seenSlugs.add(slug);

    const bySlug = slug ? ctx.existing.bySlug.get(slug) : undefined;

    const byName = (ctx.existing.byName.get(key) ?? []).filter((id) => {
        const stored = ctx.existing.slugOf.get(id);

        return (
            !ctx.claimed.has(id) &&
            (!stored || stored === slug || !ctx.incomingSlugs.has(stored))
        );
    });

    const matches = bySlug ? [bySlug.id] : byName;

    for (const id of matches) ctx.claimed.add(id);

    if (matches.length > 0 && ctx.mode === 'create')
        return {
            row,
            name,
            status: 'error',
            issues: [
                ...issues,
                err('contentImport.issues.alreadyExists', 'name', {
                    params: { name },
                }),
            ],
        };

    if (matches.length > 0 && ctx.mode === 'skip')
        return { row, name, status: 'skipped', issues };

    const op = matches.length > 0 ? 'update' : 'create';

    if (matches.length > 1)
        issues.push({
            level: 'warning',
            message: 'contentImport.issues.multipleMatches',
            params: { name },
        });

    resolveRefs(record, ctx.spec.fields, ctx.refs, issues, op);

    resolveNestedRefs(record, ctx.spec.fields, ctx.refs, issues);

    if (hasError(issues)) return { row, name, status: 'error', issues };

    const body = ctx.spec.toBody ? ctx.spec.toBody(record, op) : record;

    const parsed = (
        op === 'create'
            ? ctx.resource.schemas.create
            : ctx.resource.schemas.update
    ).safeParse(body);

    if (!parsed.success)
        return {
            row,
            name,
            status: 'error',
            issues: [...issues, ...zodIssues(parsed.error)],
        };

    return {
        row,
        name,
        status: 'pending',
        op,
        existingId: matches[0],
        slug,
        storedSlug: matches[0]
            ? (ctx.existing.slugOf.get(matches[0]) ?? null)
            : null,
        body: parsed.data,
        issues,
    };
}
