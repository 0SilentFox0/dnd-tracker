import type { TestMode } from './resolve';

export interface ModeSources {
    advantage?: number;
    disadvantage?: number;
}

/** Advantage and Disadvantage cancel in pairs; each source of the winning kind after the first is worth ±1 SL (p130) */
export function resolveModeSources({
    advantage = 0,
    disadvantage = 0,
}: ModeSources): { mode: TestMode; slMod: number } {
    const net = advantage - disadvantage;

    if (net === 0) return { mode: 'normal', slMod: 0 };

    return net > 0
        ? { mode: 'advantage', slMod: net - 1 }
        : { mode: 'disadvantage', slMod: net + 1 };
}
