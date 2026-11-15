import { normalizeRevealedRuns } from './revealed-runs';

import type { RevealedRun } from '@/types/battle';

export interface FogMemoryRecord {
    version: 1;
    cols: number;
    rows: number;
    runs: RevealedRun[];
}

export function decodeFogMemory(
    raw: string | null,
    size: { cols: number; rows: number }
): RevealedRun[] {
    if (!raw) return [];

    try {
        const parsed: unknown = JSON.parse(raw);

        if (
            !parsed ||
            typeof parsed !== 'object' ||
            !('version' in parsed) ||
            parsed.version !== 1 ||
            !('runs' in parsed) ||
            !Array.isArray(parsed.runs)
        )
            return [];

        return normalizeRevealedRuns(parsed.runs as RevealedRun[], size);
    } catch {
        return [];
    }
}

export function encodeFogMemory(
    runs: readonly RevealedRun[],
    size: { cols: number; rows: number }
): string {
    const record: FogMemoryRecord = {
        version: 1,
        ...size,
        runs: normalizeRevealedRuns(runs, size),
    };

    return JSON.stringify(record);
}
