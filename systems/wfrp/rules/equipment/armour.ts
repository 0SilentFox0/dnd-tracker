import { type HitLocation, LOCATIONS } from '../combat/constants';
import { AP_CAP, ARMOUR_SLOTS, MELEE_SLOT, SHIELD_SLOTS } from './constants';
import { readStats } from './guard';
import { hasQuality, qualityValue } from './qualities';
import type { WfrpItemStats } from './stats';

const SHIELD_LOCATIONS: readonly HitLocation[] = ['head', 'arm', 'body'];

type EquippedStatsRow = { slot: string; systemStats: unknown };

export const parseWfrpStats = (raw: unknown): WfrpItemStats | null =>
    readStats(raw);

export function armourAp(
    equipped: EquippedStatsRow[],
    opts: { singleShield?: boolean } = {}
): {
    ap: Record<HitLocation, number>;
    armourOnly: Record<HitLocation, number>;
    flexible: boolean;
    shield: number;
} {
    const ap = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<
        HitLocation,
        number
    >;

    const armourOnly = { ...ap };

    let layers = 0;

    let allFlexible = true;

    const shields: number[] = [];

    const twoHanded = equipped.some((row) => {
        const stats =
            row.slot === MELEE_SLOT ? parseWfrpStats(row.systemStats) : null;

        return stats?.type === 'weapon' && stats.twoHanded;
    });

    for (const row of equipped) {
        const stats = parseWfrpStats(row.systemStats);

        if (!stats) continue;

        if (
            stats.type === 'armour' &&
            ARMOUR_SLOTS.has(row.slot) &&
            LOCATIONS.some((l) => stats.locations[l] > 0)
        ) {
            for (const l of LOCATIONS) {
                ap[l] += stats.locations[l];
                armourOnly[l] += stats.locations[l];
            }
            layers += 1;

            if (!hasQuality(stats.qualities, 'flexible')) allFlexible = false;
        }

        if (
            !twoHanded &&
            SHIELD_SLOTS.has(row.slot) &&
            stats.type !== 'armour'
        ) {
            const x = qualityValue(stats.qualities, 'shield');

            if (x) shields.push(x);
        }
    }

    const counted = opts.singleShield ? [Math.max(0, ...shields)] : shields;

    const shield = counted.reduce((a, b) => a + b, 0);

    if (shield) for (const l of SHIELD_LOCATIONS) ap[l] += shield;

    for (const l of LOCATIONS) {
        ap[l] = Math.min(ap[l], AP_CAP);
        armourOnly[l] = Math.min(armourOnly[l], AP_CAP);
    }

    return { ap, armourOnly, flexible: layers > 0 && allFlexible, shield };
}
