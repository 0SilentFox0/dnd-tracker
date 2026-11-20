import { reverseRoll } from '../percentile';
import type { HitLocation, HitSide, HitSpot } from './constants';

// Upper bounds of the reversed roll (00 counts as 100).
const LOCATION_TABLE: [number, HitLocation][] = [
    [9, 'head'],
    [44, 'arm'],
    [79, 'body'],
    [100, 'leg'],
];

const SPLIT_TABLE: [number, HitSpot][] = [
    [9, 'head'],
    [24, 'leftArm'],
    [44, 'rightArm'],
    [79, 'body'],
    [89, 'leftLeg'],
    [100, 'rightLeg'],
];

export const LOCATION_WEIGHTS = Object.fromEntries(
    LOCATION_TABLE.map(([max, loc], i) => [
        loc,
        (max - (i === 0 ? 0 : LOCATION_TABLE[i - 1][0])) / 100,
    ])
) as Record<HitLocation, number>;

const SPOT_ZONE: Record<string, [HitLocation, HitSide?]> = {
    leftArm: ['arm', 'left'],
    rightArm: ['arm', 'right'],
    leftLeg: ['leg', 'left'],
    rightLeg: ['leg', 'right'],
};

export const asLocation = (value: string | undefined): HitLocation =>
    (value && SPOT_ZONE[value]?.[0]) ||
    LOCATION_TABLE.find(([, loc]) => loc === value)?.[1] ||
    'body';

/** The side of a split spot; undefined for a zone-only value */
export const sideOf = (value: string | undefined): HitSide | undefined =>
    value ? SPOT_ZONE[value]?.[1] : undefined;

export const spotOf = (zone: string, side: HitSide | undefined): HitSpot =>
    side && (zone === 'arm' || zone === 'leg')
        ? (`${side}${zone === 'arm' ? 'Arm' : 'Leg'}` as HitSpot)
        : asLocation(zone);

/** `split` (canon5e) tells left from right; legacy returns the zone only */
export function hitLocation(roll: number, split = false): HitSpot {
    const reversed = reverseRoll(roll);

    const table = split ? SPLIT_TABLE : LOCATION_TABLE;

    return (table.find(([max]) => reversed <= max) ??
        table[table.length - 1])[1];
}

/** Effect type of a marker on one side; a bare marker predates sides and counts as the right (primary) one */
export const sidedMarker = (key: string, side: HitSide) => `${key}:${side}`;
