import { MAX_DURATION_ROUNDS } from '@/lib/constants/duration';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import type { CastExtension } from '@/lib/utils/rules/systems/types';
import type { SpellEffect, SpellTargeting } from '@/lib/utils/spells/model/schema';

export const NO_EXTENSION: CastExtension = {
    targets: 0,
    rangeMul: 1,
    rangeAddFt: 0,
    aoeMul: 1,
    durationMul: 1,
    durationAddRounds: 0,
};

export const isExtended = (e: CastExtension | undefined): e is CastExtension =>
    !!e &&
    (e.targets > 0 ||
        e.rangeMul > 1 ||
        e.rangeAddFt > 0 ||
        e.aoeMul > 1 ||
        e.durationMul > 1 ||
        e.durationAddRounds > 0);

/** Instant effects (no rounds) stay instant */
export const scaledRounds = (rounds: number, e: CastExtension): number =>
    rounds > 0
        ? Math.min(
              MAX_DURATION_ROUNDS,
              rounds * e.durationMul + e.durationAddRounds
          )
        : rounds;

/** Range and template size of a targeting; the extra targets are added by the target resolver */
export function widenTargeting(
    targeting: SpellTargeting,
    e: CastExtension | undefined
): SpellTargeting {
    if (!isExtended(e)) return targeting;

    const ranged =
        'range' in targeting && targeting.range !== undefined
            ? { range: Math.round(targeting.range * e.rangeMul + e.rangeAddFt) }
            : {};

    const sized =
        targeting.kind === 'template' && e.aoeMul > 1
            ? { size: Math.round(targeting.size * e.aoeMul) }
            : {};

    return { ...targeting, ...ranged, ...sized } as SpellTargeting;
}

export function scaleEffectRounds(
    effects: SpellEffect[],
    e: CastExtension
): SpellEffect[] {
    return effects.map((effect) => {
        const raw = effect as unknown as Record<string, unknown>;

        const duration = raw.duration as { rounds?: number } | undefined;

        if (raw.kind === 'chooseOne')
            return {
                ...effect,
                options: scaleEffectRounds(raw.options as SpellEffect[], e),
            } as SpellEffect;

        if (duration?.rounds)
            return {
                ...effect,
                duration: { ...duration, rounds: scaledRounds(duration.rounds, e) },
            } as SpellEffect;

        if (typeof raw.rounds === 'number')
            return {
                ...effect,
                rounds: scaledRounds(raw.rounds, e),
            } as SpellEffect;

        return effect;
    });
}

export function extendSpell<S extends Pick<CastableSpell, 'definition'>>(
    spell: S,
    e: CastExtension | undefined
): S {
    if (!isExtended(e)) return spell;

    const { targeting } = spell.definition;

    const zone =
        targeting.kind === 'template' && targeting.zone
            ? {
                  ...targeting,
                  zone: {
                      ...targeting.zone,
                      rounds: scaledRounds(targeting.zone.rounds, e),
                  },
              }
            : targeting;

    return {
        ...spell,
        definition: {
            ...spell.definition,
            targeting: zone,
            effects: scaleEffectRounds(spell.definition.effects, e),
        },
    };
}
