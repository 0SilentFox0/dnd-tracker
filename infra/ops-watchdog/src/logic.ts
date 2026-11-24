export type Decision = 'down' | 'recovered' | 'none';

export interface DecideInput {
    collectOk: boolean;
    healthOk: boolean;
    hasDownFlag: boolean;
}

export const DOWN_TTL_SECONDS = 1800;

export function decide({ collectOk, healthOk, hasDownFlag }: DecideInput): Decision {
    const down = !healthOk || !collectOk;

    if (down) {
        return hasDownFlag ? 'none' : 'down';
    }

    return hasDownFlag ? 'recovered' : 'none';
}

export const messageFor = (decision: 'down' | 'recovered', input: Omit<DecideInput, 'hasDownFlag'>): string =>
    decision === 'down'
        ? `[ops] APP DOWN: health=${input.healthOk ? 'ok' : 'fail'} collect=${input.collectOk ? 'ok' : 'fail'}`
        : '[ops] APP RECOVERED: health and collect are ok';
