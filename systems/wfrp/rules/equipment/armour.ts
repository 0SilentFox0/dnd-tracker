import { type HitLocation, LOCATIONS } from '../combat/constants';
import { METAL_ARMOUR_KINDS } from '../traits/constants';
import { AP_CAP, ARMOUR_SLOTS, MELEE_SLOT, SHIELD_SLOTS } from './constants';
import { readStats } from './guard';
import { hasQuality, qualityValue } from './qualities';
import type { WfrpItemStats } from './stats';

export const ARMOUR_MARKS = ['impenetrable', 'partial', 'weakpoints'] as const;

export type ArmourMark = (typeof ARMOUR_MARKS)[number];

const SHIELD_LOCATIONS: readonly HitLocation[] = ['head', 'arm', 'body'];

const zeroAp = (): Record<HitLocation, number> =>
    Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<
        HitLocation,
        number
    >;

type EquippedStatsRow = { slot: string; systemStats: unknown };

export const parseWfrpStats = (raw: unknown): WfrpItemStats | null =>
    readStats(raw);

export function armourAp(
    equipped: EquippedStatsRow[],
    opts: { singleShield?: boolean } = {}
): {
    ap: Record<HitLocation, number>;
    armourOnly: Record<HitLocation, number>;
    /** AP of mail and plate per location; absent without any */
    metalAp?: Record<HitLocation, number>;
    flexible: boolean;
    shield: number;
    /** Per mark (impenetrable, partial, weakpoints), the AP of the marked pieces per location */
    marks?: Partial<Record<ArmourMark, Record<HitLocation, number>>>;
} {
    const ap = zeroAp();

    const armourOnly = { ...ap };

    const metal = { ...ap };

    const marks: Partial<Record<ArmourMark, Record<HitLocation, number>>> = {};

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

                if (METAL_ARMOUR_KINDS.includes(stats.kind))
                    metal[l] += stats.locations[l];
            }
            for (const mark of ARMOUR_MARKS) {
                if (!hasQuality(stats.qualities, mark)) continue;

                const at = (marks[mark] ??= zeroAp());

                for (const l of LOCATIONS) at[l] += stats.locations[l];
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

    const hasMetal = LOCATIONS.some((l) => metal[l] > 0);

    return {
        ap,
        armourOnly,
        ...(hasMetal && { metalAp: metal }),
        flexible: layers > 0 && allFlexible,
        shield,
        ...(Object.keys(marks).length > 0 && { marks }),
    };
}

/** SL lost per skill from worn armour; Practical (p299) lowers each of its piece's penalties by one level */
export function armourTestPenalties(
    equipped: EquippedStatsRow[]
): Record<string, number> {
    const out: Record<string, number> = {};

    for (const row of equipped) {
        const stats = parseWfrpStats(row.systemStats);

        if (stats?.type !== 'armour' || !ARMOUR_SLOTS.has(row.slot)) continue;

        const eased = hasQuality(stats.qualities, 'practical') ? 1 : 0;

        for (const { skill, sl } of stats.penalty ?? []) {
            const left = sl - eased;

            if (left > 0) out[skill] = (out[skill] ?? 0) - left;
        }
    }

    return out;
}
