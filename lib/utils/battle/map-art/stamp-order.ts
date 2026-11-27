import { type StampDef, stampDef } from '@/lib/constants/map-art/stamps';
import type { MapArtStamp } from '@/types/battle-map';

/** Editor keeps z inside this band; renumbering fires before the schema bound is reached. */
export const STAMP_Z_SOFT_LIMIT = 1000;

/** Dense-ranks z within each layer (ties stay ties) so a long editing session never overflows the schema bound. */
export function renumberZ(
    stamps: readonly MapArtStamp[],
    lookup: (id: string) => StampDef | undefined = stampDef
): MapArtStamp[] {
    if (stamps.every((s) => Math.abs(s.z) <= STAMP_Z_SOFT_LIMIT)) return [...stamps];

    const layerOf = (s: MapArtStamp) => lookup(s.asset)?.layer ?? '';

    const byLayer = new Map<string, number[]>();

    for (const s of stamps) {
        const key = layerOf(s);

        byLayer.set(key, [...(byLayer.get(key) ?? []), s.z]);
    }

    const rank = new Map<string, Map<number, number>>();

    for (const [layer, zs] of byLayer)
        rank.set(
            layer,
            new Map([...new Set(zs)].sort((a, b) => a - b).map((z, i) => [z, i]))
        );

    return stamps.map((s) => ({ ...s, z: rank.get(layerOf(s))?.get(s.z) ?? s.z }));
}
