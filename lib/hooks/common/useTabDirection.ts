'use client';

import { useState } from 'react';

/** Direction of a move between ordered ids: 1 = forward, -1 = back, 0 = same or unknown. */
export function tabDirection(
    order: readonly string[],
    from: string,
    to: string
): 1 | -1 | 0 {
    const a = order.indexOf(from);

    const b = order.indexOf(to);

    if (a < 0 || b < 0 || a === b) return 0;

    return b > a ? 1 : -1;
}

/** Direction of the last tab change; keeps the previous direction while the tab is unchanged. */
export function useTabDirection(order: readonly string[], current: string) {
    const [state, setState] = useState<{ id: string; dir: 1 | -1 | 0 }>({
        id: current,
        dir: 0,
    });

    if (state.id !== current)
        setState({ id: current, dir: tabDirection(order, state.id, current) });

    return state.dir;
}
