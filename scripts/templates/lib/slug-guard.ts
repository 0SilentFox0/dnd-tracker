import type { PackRow } from './pack';

export interface ExistingRow {
    slug: string | null;
    key: string;
}

/** Slugs of pack rows the importer would create: no row carries the slug and no unslugged row matches by key (D3). */
export function slugsToCreate(
    rows: readonly PackRow[],
    keyOf: (row: PackRow) => string,
    existing: readonly ExistingRow[]
): string[] {
    const slugs = new Set(
        existing.flatMap((row) => (row.slug ? [row.slug] : []))
    );

    const unslugged = new Set(
        existing.filter((row) => !row.slug).map((row) => row.key)
    );

    return rows
        .filter((row) => !slugs.has(row.slug) && !unslugged.has(keyOf(row)))
        .map((row) => row.slug);
}

/** A kind with unslugged rows cannot be matched by name once the names change; creating there would duplicate them. */
export function assertNoDuplicatesFromUnslugged(
    kind: string,
    rows: readonly PackRow[],
    keyOf: (row: PackRow) => string,
    existing: readonly ExistingRow[]
): void {
    const unslugged = existing.filter((row) => !row.slug).length;

    if (unslugged === 0) return;

    const create = slugsToCreate(rows, keyOf, existing);

    if (create.length > 0)
        throw new Error(
            `Refusing to create ${create.length} ${kind} row(s) while ${unslugged} row(s) of the template have no slug (run \`pnpm template backfill-slugs\` first): ${create.slice(0, 5).join(', ')}${create.length > 5 ? ', ...' : ''}`
        );
}
