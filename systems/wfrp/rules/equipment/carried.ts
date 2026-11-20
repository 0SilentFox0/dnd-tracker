import type { Characteristics } from '../characteristics/keys';
import { ARMOUR_SLOTS } from './constants';
import { encumbrance, type EncumbranceReport } from './encumbrance';

export type CarriedArtifact = {
    id?: string;
    slot: string;
    systemStats?: unknown;
    carried?: boolean;
};

export type CarriedSpecial = {
    artifactId?: string | null;
    systemStats?: unknown;
    quantity: number;
};

/** One load calculation for the sheet and for the battle snapshot; `canon` adds the worn discount and coin weight (p299) */
export function carriedLoad(
    input: {
        artifacts: CarriedArtifact[];
        specials: CarriedSpecial[];
        coins: number;
    },
    characteristics: Pick<Characteristics, 'base' | 'advances'>,
    canon: boolean
): EncumbranceReport {
    const held = new Set(input.artifacts.flatMap((a) => (a.id ? [a.id] : [])));

    const items = [
        ...input.artifacts.map((a) => ({
            systemStats: a.systemStats,
            quantity: 1,
            worn: canon && !a.carried && ARMOUR_SLOTS.has(a.slot),
        })),
        ...input.specials
            .filter((s) => !(s.artifactId && held.has(s.artifactId)))
            .map((s) => ({ systemStats: s.systemStats, quantity: s.quantity })),
    ];

    return encumbrance(items, characteristics, {
        coins: canon ? input.coins : 0,
        canon,
    });
}
