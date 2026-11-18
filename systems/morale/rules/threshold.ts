import type { LogLine } from '@/types/text';

export interface MoraleCheckResult {
    shouldSkipTurn: boolean;
    hasExtraTurn: boolean;
    message: LogLine;
    /** true = перевірка на додатковий хід (+мораль), false = перевірка на пропуск (-мораль) */
    moralePositive: boolean;
}

export interface PendingMoraleCheckPayload {
    participantId: string;
    d10Roll: number;
    moraleResult: MoraleCheckResult;
}

/** Межа d10: позитивна мораль +N — додатковий хід на ≥ 11−N, кожні повні 10 % лідерства знижують її на грань; негативна −N — пропуск на ≤ N. */
export function moraleThreshold(
    value: number,
    bonusPercent = 0
): { kind: 'extra' | 'skip'; threshold: number } {
    const n = Math.min(10, Math.abs(value));

    return value > 0
        ? {
              kind: 'extra',
              threshold: Math.max(1, 11 - n - Math.floor(bonusPercent / 10)),
          }
        : { kind: 'skip', threshold: n };
}
