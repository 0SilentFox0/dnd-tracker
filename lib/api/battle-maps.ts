import {
    campaignDelete,
    campaignGet,
    campaignPost,
    campaignPut,
} from './client';

import type {
    BattleMapInput,
    BattleMapSaveInput,
    BattleMapTilePatchInput,
} from '@/lib/schemas/battle-maps';
import type { MapArtSaveInput } from '@/lib/schemas/map-art';
import type {
    BattleMapBrief,
    BattleMapFull,
    BattleMapTileChunks,
    MapArtRecord,
    MapArtSaveResult,
} from '@/types/battle-map';

export const getBattleMaps = (campaignId: string) =>
    campaignGet<BattleMapBrief[]>(campaignId, '/maps', { cache: 'no-store' });

export const getBattleMap = (
    campaignId: string,
    mapId: string,
    version?: number
) =>
    campaignGet<BattleMapFull>(
        campaignId,
        `/maps/${mapId}${version === undefined ? '' : `?version=${version}`}`,
        version === undefined ? { cache: 'no-store' } : {}
    );

export const createBattleMap = (campaignId: string, data: BattleMapInput) =>
    campaignPost<BattleMapBrief>(campaignId, '/maps', data);

export const updateBattleMap = (
    campaignId: string,
    mapId: string,
    data: BattleMapSaveInput
) => campaignPut<BattleMapBrief>(campaignId, `/maps/${mapId}`, data);

export const deleteBattleMap = (campaignId: string, mapId: string) =>
    campaignDelete<{ success: true }>(campaignId, `/maps/${mapId}`);

export const getBattleMapTiles = (
    campaignId: string,
    mapId: string,
    version?: number
) =>
    campaignGet<BattleMapTileChunks>(
        campaignId,
        `/maps/${mapId}/tiles${version === undefined ? '' : `?version=${version}`}`,
        { cache: 'no-store' }
    );

export const patchBattleMapTiles = (
    campaignId: string,
    mapId: string,
    data: BattleMapTilePatchInput
) => campaignPut<{ version: number }>(campaignId, `/maps/${mapId}/tiles`, data);

export const cloneBattleMap = (
    campaignId: string,
    mapId: string,
    name?: string
) => campaignPost<BattleMapBrief>(campaignId, `/maps/${mapId}/clone`, { name });

export const getMapArt = (campaignId: string, mapId: string) =>
    campaignGet<MapArtRecord>(campaignId, `/maps/${mapId}/art`, {
        cache: 'no-store',
    });

export const saveMapArt = (
    campaignId: string,
    mapId: string,
    data: MapArtSaveInput
) => campaignPut<MapArtSaveResult>(campaignId, `/maps/${mapId}/art`, data);

export const deleteMapArt = (campaignId: string, mapId: string) =>
    campaignDelete<{ success: true }>(campaignId, `/maps/${mapId}/art`);
