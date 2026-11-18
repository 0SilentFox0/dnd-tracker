import { clampMorale, moraleCapOf } from '@/lib/utils/abilities/build/morale-stat';
import { resolvedAbilitiesOf } from '@/lib/utils/abilities/engine/core/participants';
import { liveActiveEffects } from '@/lib/utils/abilities/engine/effects/zone-effects';
import type { FlagKey } from '@/lib/utils/abilities/schema';
import type { BattleParticipant } from '@/types/battle';

export function ownTimedMoraleFlat(
    p: BattleParticipant,
    ps?: BattleParticipant[]
): number {
    let sum = 0;

    for (const ae of liveActiveEffects(p, ps)) {
        for (const e of ae.abilityEffects ?? []) {
            if (
                e.kind === 'modifyStat' &&
                e.stat === 'morale' &&
                typeof e.flat === 'number'
            )
                sum += e.flat;
        }
    }

    return sum;
}

// Without ps (formulas, recursion) dead owners' zones cannot be filtered; only identical auras are deduped.
function ownMinMorale(p: BattleParticipant): number | undefined {
    const values = [
        ...resolvedAbilitiesOf(p).flatMap((a) =>
            a.trigger.event === 'passive' ? a.effects : []
        ),
        ...liveActiveEffects(p).flatMap((ae) => ae.abilityEffects ?? []),
    ].flatMap((e) =>
        e.kind === 'flag' &&
        e.flag === 'minMorale' &&
        (e.target ?? 'self') === 'self'
            ? [e.value]
            : []
    );

    return values.length ? Math.max(...values) : undefined;
}

// Own flags only, no ally auras: formulas cannot call collectModifiers (recursion).
function ownHasFlag(p: BattleParticipant, flag: FlagKey): boolean {
    const passive = resolvedAbilitiesOf(p).some(
        (a) =>
            a.trigger.event === 'passive' &&
            a.effects.some(
                (e) =>
                    e.kind === 'flag' &&
                    e.flag === flag &&
                    (e.target ?? 'self') === 'self'
            )
    );

    return (
        passive ||
        liveActiveEffects(p).some((ae) =>
            (ae.abilityEffects ?? []).some(
                (e) => e.kind === 'flag' && e.flag === flag
            )
        )
    );
}

export function combineMorale(
    base: number,
    timedFlat: number,
    flags: { ignored: boolean; noNegative: boolean; min?: number },
    cap = 3
): { value: number; ignored: boolean } {
    if (flags.ignored || cap === 0) return { value: 0, ignored: true };

    const raw = clampMorale(base + timedFlat, cap);

    const value = raw < 0 && flags.noNegative ? 0 : raw;

    return {
        value: flags.min === undefined ? value : Math.max(flags.min, value),
        ignored: false,
    };
}

export function ownMorale(p: BattleParticipant): number {
    return combineMorale(
        p.combatStats.morale,
        ownTimedMoraleFlat(p),
        {
            ignored: ownHasFlag(p, 'ignoreMorale'),
            noNegative: ownHasFlag(p, 'noNegativeMorale'),
            min: ownMinMorale(p),
        },
        moraleCapOf(p)
    ).value;
}
