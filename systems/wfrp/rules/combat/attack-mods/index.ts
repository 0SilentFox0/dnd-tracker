import { helplessMods } from './helpless';
import { meleeMods } from './melee';
import { rangedMods } from './ranged';
import { sizeMods } from './size';
import { talentMods } from './talents';
import { traitMods } from './traits';
import type { AttackMod, AttackModSource } from './types';

export type { AttackMod, AttackModCtx, AttackModSource } from './types';

const SOURCES: readonly AttackModSource[] = [
    sizeMods,
    rangedMods,
    meleeMods,
    helplessMods,
    traitMods,
    talentMods,
];

export function collectAttackMods(c: Parameters<AttackModSource>[0]): {
    sl: number;
    advantage: number;
    disadvantage: number;
    mods: AttackMod[];
} {
    const mods = SOURCES.flatMap((source) => source(c)).filter(
        (m) => m.sl !== 0 || m.advantage || m.disadvantage
    );

    return {
        sl: mods.reduce((n, m) => n + m.sl, 0),
        advantage: mods.reduce((n, m) => n + (m.advantage ?? 0), 0),
        disadvantage: mods.reduce((n, m) => n + (m.disadvantage ?? 0), 0),
        mods,
    };
}
