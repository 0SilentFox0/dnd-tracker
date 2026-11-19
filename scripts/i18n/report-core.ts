export type Tree = Record<string, unknown>;

export interface Comparison {
    total: number;
    present: number;
    missing: string[];
    orphans: string[];
    empty: string[];
}

export function flatten(tree: Tree, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [key, value] of Object.entries(tree)) {
        const path = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string') out[path] = value;
        else if (value && typeof value === 'object' && !Array.isArray(value))
            Object.assign(out, flatten(value as Tree, path));
    }

    return out;
}

/** `present` = base keys the locale has (empty strings count as present but are listed in `empty`). */
export function compareKeys(
    baseKeys: readonly string[],
    values: Readonly<Record<string, string>>
): Comparison {
    const base = new Set(baseKeys);

    const missing = baseKeys.filter((key) => !Object.hasOwn(values, key));

    return {
        total: base.size,
        present: base.size - missing.length,
        missing,
        orphans: Object.keys(values).filter((key) => !base.has(key)),
        empty: Object.keys(values).filter(
            (key) => base.has(key) && values[key].trim() === ''
        ),
    };
}

export const percentOf = (present: number, total: number): number =>
    total === 0 ? 100 : Math.round((present / total) * 1000) / 10;

/** Counts keys per leading prefix of `depth` segments, sorted by count desc. */
export function topPrefixes(
    keys: readonly string[],
    depth: number,
    limit: number,
    separator = '.'
): [string, number][] {
    const counts = new Map<string, number>();

    for (const key of keys) {
        const prefix = key.split(separator).slice(0, depth).join(separator);

        counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }

    return [...counts]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit);
}

export function formatTable(rows: string[][]): string {
    const widths = rows[0].map((_, col) =>
        Math.max(...rows.map((row) => row[col].length))
    );

    return rows
        .map((row) =>
            row
                .map((cell, col) =>
                    col === 0
                        ? cell.padEnd(widths[col])
                        : cell.padStart(widths[col])
                )
                .join('  ')
        )
        .join('\n');
}
