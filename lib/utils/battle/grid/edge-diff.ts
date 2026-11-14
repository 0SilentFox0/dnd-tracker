import type { EdgeDiff } from '@/types/api';
import type { BattleMapConfig } from '@/types/battle';

/** більше ребер за раз — повна карта, щоб не переповнити Pusher */
export const EDGE_DIFF_LIMIT = 400;

export type EdgeField = 'walls' | 'bars';

export const diffSize = (diff: EdgeDiff | null | undefined): number =>
    diff ? diff.add.length + diff.remove.length : 0;

export function diffEdges(
    before: readonly string[] | undefined,
    after: readonly string[] | undefined
): EdgeDiff | null {
    const prev = new Set(before);

    const next = new Set(after);

    const add = [...next].filter((e) => !prev.has(e));

    const remove = [...prev].filter((e) => !next.has(e));

    return add.length === 0 && remove.length === 0 ? null : { add, remove };
}

export function applyEdgeDiff(
    map: BattleMapConfig,
    field: EdgeField,
    diff: EdgeDiff
): BattleMapConfig {
    if (diffSize(diff) === 0) return map;

    const edges = new Set(map[field]);

    for (const e of diff.remove) edges.delete(e);

    for (const e of diff.add) edges.add(e);

    return { ...map, [field]: [...edges] };
}
