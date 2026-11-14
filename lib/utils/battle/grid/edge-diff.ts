import type { EdgeDiff } from '@/types/api';
import type { BattleMapConfig } from '@/types/battle';

export type EdgeField = 'walls' | 'bars';

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
    const edges = new Set(map[field]);

    for (const e of diff.remove) edges.delete(e);

    for (const e of diff.add) edges.add(e);

    return { ...map, [field]: [...edges] };
}
