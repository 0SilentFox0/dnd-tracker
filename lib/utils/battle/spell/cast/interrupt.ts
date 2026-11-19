import type { SpellCastState } from '@/lib/utils/battle/spell/cast/state';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';

export function interruptedTargets(
    state: SpellCastState,
    effects: SpellEffect[]
): string[] {
    if (!effects.some((e) => e.kind === 'interruptCast')) return [];

    return state.targetIds.filter((id) => {
        const outcome = state.outcomes.get(id);

        return !!outcome && !outcome.skip && !outcome.negateEffects;
    });
}
