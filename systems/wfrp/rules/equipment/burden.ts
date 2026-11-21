import { value } from '../characteristics/derive';
import {
    type Characteristics,
    readCharacteristics,
} from '../characteristics/keys';
import { foldCorruption } from '../corruption/fold';
import { modifiersOf } from '../corruption/modifiers';
import { editionOf } from '../edition';
import { carriedLoad } from './carried';
import {
    burdenedAgility,
    type BurdenTier,
    burdenTierOf,
    encumbrance,
} from './encumbrance';

import type { RuleSystemEquipment } from '@/lib/utils/rules/systems/types';

export const asBurdenTier = (n: number | undefined): BurdenTier =>
    n === 1 || n === 2 || n === 3 ? n : 0;

/** Bakes the Agility penalty into base/advances so every test and tie-break reads the effective value */
export function applyBurden(
    c: Characteristics,
    tier: BurdenTier
): Characteristics {
    if (tier === 0) return c;

    const target =
        burdenedAgility(value(c, 'ag'), tier) -
        (modifiersOf(c.corruption).characteristics.ag ?? 0);

    const base = Math.min(100, Math.max(1, target - c.advances.ag));

    return {
        ...c,
        base: { ...c.base, ag: base },
        advances: { ...c.advances, ag: target - base },
    };
}

export const wfrpBurden: NonNullable<RuleSystemEquipment['burden']> = ({
    rows,
    specials,
    coins,
    characteristics,
    rules,
}) => {
    if (editionOf(rules).gearModel !== 'canon') return 0;

    return carriedLoad(
        {
            artifacts: rows,
            specials,
            coins,
        },
        foldCorruption(readCharacteristics({ characteristics })),
        true
    ).tier;
};

export const wfrpBurdenLoad: NonNullable<RuleSystemEquipment['burdenLoad']> = ({
    rows,
    specials,
    coins,
    characteristics,
    rules,
}) => {
    if (editionOf(rules).gearModel !== 'canon') return undefined;

    const chars = foldCorruption(readCharacteristics({ characteristics }));

    const report = carriedLoad(
        { artifacts: rows, specials, coins },
        chars,
        true
    );

    const held = new Set(rows.flatMap((r) => (r.id ? [r.id] : [])));

    const perUse = Object.fromEntries(
        specials.flatMap((s) => {
            if (!s.id || (s.artifactId && held.has(s.artifactId))) return [];

            const enc = encumbrance(
                [{ systemStats: s.systemStats, quantity: 1 }],
                chars,
                { canon: true }
            ).carried;

            return enc > 0 ? [[s.id, enc] as const] : [];
        })
    );

    return Object.keys(perUse).length
        ? { carried: report.carried, limit: report.limit, perUse }
        : undefined;
};

/** Tier of the load once `spent` units per item id are gone */
export function tierAfterSpend(
    load: { carried: number; limit: number; perUse: Record<string, number> },
    spent: Record<string, number>
): BurdenTier {
    const freed = Object.entries(spent).reduce(
        (sum, [id, n]) => sum + (load.perUse[id] ?? 0) * n,
        0
    );

    return burdenTierOf(Math.max(0, load.carried - freed), load.limit);
}
