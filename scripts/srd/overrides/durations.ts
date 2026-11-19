import { ROUNDS_PER_HOUR, ROUNDS_PER_MINUTE } from '@/lib/constants/duration';

export const rounds = (n: number) => ({ rounds: n });

// canon durations: 1 minute = 10 rounds, 10 minutes = 100, 1 hour = 600
export const MINUTE = ROUNDS_PER_MINUTE;

export const TEN_MINUTES = 10 * ROUNDS_PER_MINUTE;

export const HOUR = ROUNDS_PER_HOUR;

/** Placeholder for "as long as the spell lasts"; the converter swaps it for the spell's own duration in rounds. */
export const SPELL_DURATION = -1;

export function resolveSpellDuration<T>(value: T, spellRounds: number): T {
    if (value === SPELL_DURATION) return spellRounds as T;

    if (Array.isArray(value))
        return value.map((v) => resolveSpellDuration(v, spellRounds)) as T;

    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [
                k,
                resolveSpellDuration(v, spellRounds),
            ])
        ) as T;

    return value;
}
