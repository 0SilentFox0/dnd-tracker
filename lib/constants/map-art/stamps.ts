import type { StampBiome, StampDef } from './stamp-types';
import { STAMP_DATA } from './stamps-data';

export type {
    StampBiome,
    StampBlocks,
    StampDef,
    StampLayer,
} from './stamp-types';

export const STAMP_BIOMES: readonly StampBiome[] = [
    'dungeon',
    'building',
    'nature',
    'settlement',
];

export const STAMPS: readonly StampDef[] = STAMP_DATA;

const BY_ID: ReadonlyMap<string, StampDef> = new Map(
    STAMPS.map((d) => [d.id, d])
);

export const stampDef = (id: string): StampDef | undefined => BY_ID.get(id);

export const isStampId = (id: string): boolean => BY_ID.has(id);
