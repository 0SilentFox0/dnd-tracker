import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface BattleMapBrief {
    id: string;
    name: string;
    cols: number;
    rows: number;
    version: number;
    updatedAt: string;
    thumb: string | null;
}

export interface BattleMapFull extends BattleMapBrief {
    map: Omit<BattleMapConfig, 'walls' | 'bars'>;
    walls: string[];
    bars: string[];
}

export interface BattleMapTileChunks {
    version: number;
    chunks: Partial<Record<TileLayer, Record<string, string>>>;
}

export type OpeningKind = 'door' | 'window' | 'bars' | 'portcullis';

export interface MapArtOpening {
    kind: OpeningKind;
    material: string;
    locked?: boolean;
    open?: boolean;
}

export interface MapArtLight {
    id: string;
    x: number;
    y: number;
    radius: number;
    color: string;
    intensity: number;
}

export interface MapArtScene {
    v: 1;
    floors: Record<string, string>;
    walls: Record<string, string>;
    openings: Record<string, MapArtOpening>;
    blocked: Record<string, string | null>;
    lights: MapArtLight[];
    ambient: { tint: string; darkness: number };
    stamps: [];
}

export interface MapArtRecord {
    scene: MapArtScene | null;
    sceneVersion: number;
    bakedSceneVersion: number | null;
    bakedUrl: string | null;
    bakedAt: string | null;
}

export type ArtMapPatch = Pick<
    BattleMapConfig,
    | 'walls'
    | 'bars'
    | 'doors'
    | 'blocked'
    | 'background'
    | 'backgroundCols'
    | 'backgroundRows'
    | 'gridOffset'
    | 'artBaked'
>;

export interface MapArtSaveResult {
    brief: BattleMapBrief;
    art: MapArtRecord;
    patch: ArtMapPatch;
}
