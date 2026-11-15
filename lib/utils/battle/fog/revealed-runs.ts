export type RevealedRun = readonly [y: number, startX: number, endX: number];

export type RevealedRuns = readonly RevealedRun[];

export interface FogGridSize {
    cols: number;
    rows: number;
}

export interface RevealedRunsDelta {
    add: RevealedRun[];
    remove: RevealedRun[];
}

function clippedRun(
    run: RevealedRun,
    size?: FogGridSize
): RevealedRun | null {
    const [y, startX, endX] = run;

    if (![y, startX, endX].every(Number.isInteger)) return null;

    if (y < 0 || (size && y >= size.rows)) return null;

    const start = Math.max(0, startX);

    const end = Math.min(size?.cols ?? Infinity, endX);

    return end > start ? [y, start, end] : null;
}

export function normalizeRevealedRuns(
    runs: RevealedRuns,
    size?: FogGridSize
): RevealedRun[] {
    const rows = new Map<number, Array<[number, number]>>();

    for (const candidate of runs) {
        const run = clippedRun(candidate, size);

        if (!run) continue;

        const [y, start, end] = run;

        const row = rows.get(y) ?? [];

        row.push([start, end]);
        rows.set(y, row);
    }

    return [...rows]
        .sort(([a], [b]) => a - b)
        .flatMap(([y, spans]) => {
            spans.sort(([a], [b]) => a - b);

            const merged: Array<[number, number]> = [];

            for (const [start, end] of spans) {
                const previous = merged.at(-1);

                if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
                else merged.push([start, end]);
            }

            return merged.map(([start, end]) => [y, start, end] as const);
        });
}

export function revealedHas(runs: RevealedRuns, x: number, y: number): boolean {
    let low = 0;

    let high = runs.length - 1;

    while (low <= high) {
        const middle = (low + high) >>> 1;

        const [row, start, end] = runs[middle];

        if (row < y || (row === y && end <= x)) low = middle + 1;
        else if (row > y || start > x) high = middle - 1;
        else return true;
    }

    return false;
}

function subtractRevealedRuns(
    source: RevealedRuns,
    subtract: RevealedRuns
): RevealedRun[] {
    const left = normalizeRevealedRuns(source);

    const right = normalizeRevealedRuns(subtract);

    const cuts = new Map<number, Array<[number, number]>>();

    for (const [y, start, end] of right) {
        const row = cuts.get(y) ?? [];

        row.push([start, end]);
        cuts.set(y, row);
    }

    const result: RevealedRun[] = [];

    for (const [y, start, end] of left) {
        let cursor = start;

        for (const [cutStart, cutEnd] of cuts.get(y) ?? []) {
            if (cutEnd <= cursor) continue;

            if (cutStart >= end) break;

            if (cutStart > cursor) result.push([y, cursor, Math.min(cutStart, end)]);

            cursor = Math.max(cursor, cutEnd);

            if (cursor >= end) break;
        }

        if (cursor < end) result.push([y, cursor, end]);
    }

    return result;
}

export function addRevealedRuns(
    current: RevealedRuns,
    added: RevealedRuns,
    size?: FogGridSize
): RevealedRun[] {
    return normalizeRevealedRuns([...current, ...added], size);
}

export function removeRevealedRuns(
    current: RevealedRuns,
    removed: RevealedRuns,
    size?: FogGridSize
): RevealedRun[] {
    return normalizeRevealedRuns(
        subtractRevealedRuns(
            normalizeRevealedRuns(current, size),
            normalizeRevealedRuns(removed, size)
        ),
        size
    );
}

export function diffRevealedRuns(
    before: RevealedRuns,
    after: RevealedRuns
): RevealedRunsDelta {
    return {
        add: subtractRevealedRuns(after, before),
        remove: subtractRevealedRuns(before, after),
    };
}
