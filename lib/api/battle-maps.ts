import {
    campaignDelete,
    campaignGet,
    campaignPost,
    campaignPut,
} from './client';

import type { BattleMapInput } from '@/lib/schemas/battle-maps';
import type { BattleMapBrief, BattleMapFull } from '@/types/battle-map';

export const getBattleMaps = (campaignId: string) =>
    campaignGet<BattleMapBrief[]>(campaignId, '/maps', { cache: 'no-store' });

export const getBattleMap = (
    campaignId: string,
    mapId: string,
    version?: number
) =>
    campaignGet<BattleMapFull>(
        campaignId,
        `/maps/${mapId}${version === undefined ? '' : `?version=${version}`}`
    );

export const createBattleMap = (campaignId: string, data: BattleMapInput) =>
    campaignPost<BattleMapBrief>(campaignId, '/maps', data);

export const updateBattleMap = (
    campaignId: string,
    mapId: string,
    data: BattleMapInput
) => campaignPut<BattleMapBrief>(campaignId, `/maps/${mapId}`, data);

export const deleteBattleMap = (campaignId: string, mapId: string) =>
    campaignDelete<{ success: true }>(campaignId, `/maps/${mapId}`);

export const cloneBattleMap = (campaignId: string, mapId: string) =>
    campaignPost<BattleMapBrief>(campaignId, `/maps/${mapId}/clone`, {});
