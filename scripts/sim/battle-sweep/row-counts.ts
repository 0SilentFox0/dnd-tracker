export type RowCounts = Record<string, number>;

export function diffRowCounts(before: RowCounts, after: RowCounts): string[] {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])]
        .filter((table) => (before[table] ?? 0) !== (after[table] ?? 0))
        .sort()
        .map(
            (table) => `${table}: ${before[table] ?? 0} -> ${after[table] ?? 0}`
        );
}

export interface SweepRunResult {
    key: string;
    exitCode: number;
}

export const overallExit = (results: readonly SweepRunResult[]): number =>
    results.some((r) => r.exitCode !== 0) ? 1 : 0;
