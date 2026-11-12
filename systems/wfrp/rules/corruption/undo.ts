import type { CorruptionState } from './types';

export function planCorruptionUndo(
    state: CorruptionState | undefined,
    grantId: string
):
    | { ok: true; state: CorruptionState }
    | { ok: false; error: 'CORRUPTION_STALE' } {
    const last = state?.last;

    const stale = { ok: false, error: 'CORRUPTION_STALE' } as const;

    if (
        !state ||
        !last ||
        last.id !== grantId ||
        state.points !== last.after.points
    )
        return stale;

    const { mutationId } = last.after;

    if (mutationId && state.mutations.at(-1)?.id !== mutationId) return stale;

    return {
        ok: true,
        state: {
            points: last.before.points,
            mutations: mutationId
                ? state.mutations.slice(0, -1)
                : state.mutations,
        },
    };
}
