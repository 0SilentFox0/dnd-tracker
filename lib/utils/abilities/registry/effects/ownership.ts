import type { SystemEffectRow } from './system-row';

import {
    type Composition,
    composition,
    type SystemSelection,
} from '@/lib/utils/rules/systems/catalog';

export interface EffectOwnership {
    kinds: Readonly<Record<string, string>>;
    flags: Readonly<Record<string, string>>;
}

interface EffectLike {
    kind: string;
    flag?: unknown;
}

export const ownershipOf = (
    rows: readonly Pick<SystemEffectRow, 'kind' | 'system'>[],
    flags: Readonly<Record<string, string>> = {}
): EffectOwnership => ({
    kinds: Object.fromEntries(rows.map((r) => [r.kind, r.system])),
    flags,
});

export const effectKey = (effect: EffectLike): string =>
    effect.kind === 'flag' && typeof effect.flag === 'string'
        ? `flag:${effect.flag}`
        : effect.kind;

const ownerOf = (
    effect: EffectLike,
    own: EffectOwnership
): string | undefined =>
    effect.kind === 'flag' && typeof effect.flag === 'string'
        ? own.flags[effect.flag]
        : own.kinds[effect.kind];

export const activeIds = (c: Composition): Set<string> =>
    new Set([c.base, ...c.modules]);

/** Keys (`kind` or `flag:<key>`) of the owned effects whose module is active. */
export function effectKindsOf(
    c: Composition,
    own: EffectOwnership
): ReadonlySet<string> {
    const active = activeIds(c);

    return new Set([
        ...Object.entries(own.kinds)
            .filter(([, id]) => active.has(id))
            .map(([kind]) => kind),
        ...Object.entries(own.flags)
            .filter(([, id]) => active.has(id))
            .map(([flag]) => `flag:${flag}`),
    ]);
}

/** Effects nobody owns (core) are always in; an owned one needs its module active. */
export function isEffectInComposition(
    effect: EffectLike,
    c: Composition,
    own: EffectOwnership
): boolean {
    const owner = ownerOf(effect, own);

    return owner === undefined || activeIds(c).has(owner);
}

const hasOwners = (own: EffectOwnership) =>
    Object.keys(own.kinds).length + Object.keys(own.flags).length > 0;

export function filterEffectsInComposition<E extends EffectLike>(
    effects: readonly E[],
    c: Composition,
    own: EffectOwnership
): readonly E[] {
    return hasOwners(own)
        ? effects.filter((e) => isEffectInComposition(e, c, own))
        : effects;
}

const compositions = new WeakMap<object, Composition>();

const compositionOf = (system: SystemSelection): Composition => {
    const cached = compositions.get(system);

    if (cached) return cached;

    const c = composition(system);

    compositions.set(system, c);

    return c;
};

/** Engine-side skip: stored effects of modules outside the campaign composition stay in the row but do nothing. */
export const filterEffectsForSystem = <E extends EffectLike>(
    effects: readonly E[],
    system: SystemSelection,
    own: EffectOwnership
): readonly E[] =>
    hasOwners(own)
        ? filterEffectsInComposition(effects, compositionOf(system), own)
        : effects;

export const isEffectInSystem = (
    effect: EffectLike,
    system: SystemSelection,
    own: EffectOwnership
): boolean =>
    !hasOwners(own) ||
    isEffectInComposition(effect, compositionOf(system), own);
