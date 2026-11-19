import type { SpellTargeting } from '@/types/spells';

export const RANGED_KINDS = ['ally', 'enemy', 'allyDead', 'area', 'template'];

export function targetingOf(
    kind: string,
    previous: SpellTargeting,
    exactDefault = false
): SpellTargeting {
    const range =
        RANGED_KINDS.includes(kind) && 'range' in previous
            ? { range: previous.range }
            : {};

    const multi =
        previous.kind === 'area' || previous.kind === 'template'
            ? previous
            : null;

    const side = multi?.side ?? 'enemy';

    const areaSide = side === 'all' ? 'enemy' : side;

    const maxTargets = multi?.maxTargets ?? 3;

    if (kind === 'area')
        return {
            kind,
            side: areaSide,
            maxTargets,
            ...range,
            ...(previous.kind === 'area' && previous.chain
                ? { chain: true }
                : {}),
        };

    if (kind === 'template')
        return {
            kind,
            shape: previous.kind === 'template' ? previous.shape : 'circle',
            size: previous.kind === 'template' ? previous.size : 20,
            side,
            maxTargets,
            ...range,
            ...(previous.kind === 'template' && previous.zone
                ? { zone: previous.zone }
                : {}),
            ...(previous.kind === 'template' && previous.hollow
                ? { hollow: true }
                : {}),
            ...(previous.kind === 'template'
                ? previous.exact !== undefined && { exact: previous.exact }
                : exactDefault && { exact: true }),
        };

    return { kind, ...range } as SpellTargeting;
}
