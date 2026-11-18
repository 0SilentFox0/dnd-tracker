import 'server-only';
import { type KeyRow } from '@/lib/server/content/import/slug';
import { nameKey } from '@/lib/utils/content/import';
import type { IdName } from '@/types/common';
import type { ImportIssue, ImportRowResult } from '@/types/content-import';

export type NameIndex = {
    byName: Map<string, string[]>;
    ids: Set<string>;
    bySlug: Map<string, KeyRow>;
    slugOf: Map<string, string | null>;
};

export type Plan = {
    row: number;
    name?: string;
    status: ImportRowResult['status'] | 'pending';
    op?: 'create' | 'update';
    existingId?: string;
    slug?: string;
    storedSlug?: string | null;
    body?: unknown;
    issues: ImportIssue[];
};

export function indexNames(
    rows: Array<IdName & { slug?: string | null }>
): NameIndex {
    const byName = new Map<string, string[]>();

    for (const r of rows)
        byName.set(nameKey(r.name), [
            ...(byName.get(nameKey(r.name)) ?? []),
            r.id,
        ]);

    return {
        byName,
        ids: new Set(rows.map((r) => r.id)),
        bySlug: new Map(
            rows.flatMap((r) =>
                r.slug ? [[r.slug, { ...r, slug: r.slug }] as const] : []
            )
        ),
        slugOf: new Map(rows.map((r) => [r.id, r.slug ?? null])),
    };
}

export const err = (
    message: string,
    field?: string,
    extra?: Partial<ImportIssue>
): ImportIssue => ({
    ...(field && { field }),
    level: 'error',
    message,
    ...extra,
});

export const hasError = (issues: ImportIssue[]) =>
    issues.some((i) => i.level === 'error');

export const toResult = ({
    row,
    name,
    status,
    op,
    issues,
}: Plan): ImportRowResult => ({
    row,
    ...(name && { name }),
    status:
        status === 'pending'
            ? op === 'update'
                ? 'updated'
                : 'created'
            : status,
    issues,
});
