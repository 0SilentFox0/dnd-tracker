import { ROUNDS_PER_HOUR, ROUNDS_PER_MINUTE } from '@/lib/constants/duration';
import { textRef } from '@/lib/i18n/text-ref';
import type { TextRef } from '@/types/text';

export type DurationArgs = Record<'unit', string> &
    Record<'n' | 'approx', number>;

const oneDecimal = (v: number) => Math.round(v * 10) / 10;

/** Rounds are the only stored unit; this picks the compact display unit for the `abilityRegistry.duration` message. */
export function durationArgs(rounds: number): DurationArgs {
    if (rounds >= ROUNDS_PER_HOUR && rounds % ROUNDS_PER_HOUR === 0)
        return { unit: 'hours', n: rounds / ROUNDS_PER_HOUR, approx: 0 };

    if (
        rounds >= ROUNDS_PER_MINUTE &&
        rounds < ROUNDS_PER_HOUR &&
        rounds % ROUNDS_PER_MINUTE === 0
    )
        return { unit: 'minutes', n: rounds / ROUNDS_PER_MINUTE, approx: 0 };

    if (rounds < ROUNDS_PER_MINUTE)
        return { unit: 'rounds', n: rounds, approx: 0 };

    return rounds < ROUNDS_PER_HOUR
        ? {
              unit: 'roundsMinutes',
              n: rounds,
              approx: oneDecimal(rounds / ROUNDS_PER_MINUTE),
          }
        : {
              unit: 'roundsHours',
              n: rounds,
              approx: oneDecimal(rounds / ROUNDS_PER_HOUR),
          };
}

export const DURATION_SEGMENT_KEY = 'duration';

export const DURATION_KEY = `abilityRegistry.${DURATION_SEGMENT_KEY}`;

export const durationRef = (rounds: number): TextRef =>
    textRef(DURATION_KEY, durationArgs(rounds));
