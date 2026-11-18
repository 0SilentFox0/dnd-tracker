import type { LogLine } from '@/types/text';

export interface MoraleCheckResult {
    shouldSkipTurn: boolean;
    hasExtraTurn: boolean;
    message: LogLine;
    moralePositive: boolean;
}

export interface PendingMoraleCheckPayload {
    participantId: string;
    d10Roll: number;
    moraleResult: MoraleCheckResult;
}

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
