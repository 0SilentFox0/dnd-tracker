import { reverseRoll } from '../percentile';
import type { HitLocation } from './constants';

// Upper bounds of the reversed roll (00 counts as 100).
const LOCATION_TABLE: [number, HitLocation][] = [
    [9, 'head'],
    [44, 'arm'],
    [79, 'body'],
    [100, 'leg'],
];

export const LOCATION_WEIGHTS = Object.fromEntries(
    LOCATION_TABLE.map(([max, loc], i) => [
        loc,
        (max - (i === 0 ? 0 : LOCATION_TABLE[i - 1][0])) / 100,
    ])
) as Record<HitLocation, number>;

export const asLocation = (value: string | undefined): HitLocation =>
    LOCATION_TABLE.find(([, loc]) => loc === value)?.[1] ?? 'body';

export function hitLocation(roll: number): HitLocation {
    const reversed = reverseRoll(roll);

    return (LOCATION_TABLE.find(([max]) => reversed <= max) ??
        LOCATION_TABLE[3])[1];
}
