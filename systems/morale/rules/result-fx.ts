import type { ResultFx } from '@/types/battle-scene';

export const MORALE_RESULT = 'morale';

export interface MoraleResultData {
    outcome: 'extra' | 'skip';
    name: string;
    d10: number;
    morale: number;
}

export const moraleResultFx = (data: MoraleResultData): ResultFx => ({
    kind: 'system',
    module: MORALE_RESULT,
    data,
});

export function moraleResultOf(fx: ResultFx | null): MoraleResultData | null {
    if (fx?.kind !== 'system' || fx.module !== MORALE_RESULT) return null;

    const { data } = fx;

    if (
        typeof data === 'object' &&
        data !== null &&
        'outcome' in data &&
        (data.outcome === 'extra' || data.outcome === 'skip') &&
        'name' in data &&
        typeof data.name === 'string' &&
        'd10' in data &&
        typeof data.d10 === 'number' &&
        'morale' in data &&
        typeof data.morale === 'number'
    )
        return {
            outcome: data.outcome,
            name: data.name,
            d10: data.d10,
            morale: data.morale,
        };

    return null;
}
