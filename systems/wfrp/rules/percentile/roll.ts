import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';

export function rollPercentile(rng: Rng, preset?: number): number {
    return preset ?? rollDie(100, rng);
}

export function reverseRoll(n: number): number {
    return n === 100 ? 100 : (n % 10) * 10 + Math.floor(n / 10);
}
