import { timingSafeEqual } from 'node:crypto';

export function safeEqual(given: string, expected: string): boolean {
    const a = Buffer.from(given);

    const b = Buffer.from(expected);

    return a.length === b.length && timingSafeEqual(a, b);
}
