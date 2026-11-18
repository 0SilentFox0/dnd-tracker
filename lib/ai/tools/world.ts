import { z } from 'zod';

import { callerOf } from './assistant-caller';
import { AiToolError, defineTool } from './define';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { TRAVEL_LOG_LIMIT } from '@/lib/constants/world';
import { authorizeAssistant } from '@/lib/server/assistant/authorize';
import {
    listWorldMaps,
    readWorldMapDetail,
} from '@/lib/server/world/map-store';
import { listPublicMapNotes } from '@/lib/server/world/note-store';
import {
    listHeroesOnMap,
    readTravelLog,
} from '@/lib/server/world/travel-store';

export const listWorldMapsTool = defineTool({
    name: 'world_maps_list',
    scopes: ['world:read'],
    title: 'List world maps',
    description:
        'Lists maps in the current campaign. Use the map id with world_map_get to read markers, heroes, and public notes.',
    input: z.strictObject({}),
    handler: async (ctx) => {
        const caller = callerOf(ctx);

        await authorizeAssistant(
            caller,
            { access: 'dm', scope: 'world:read' },
            'prepare'
        );

        return listWorldMaps(ctx.campaignId);
    },
});

export const getWorldMapTool = defineTool({
    name: 'world_map_get',
    scopes: ['world:read'],
    title: 'Read world map',
    description:
        'Reads a DM map with its markers, hero positions, and public notes. DM-only notes on markers are included.',
    input: z.strictObject({ mapId: z.string().min(1) }),
    handler: async (ctx, { mapId }) => {
        const caller = callerOf(ctx);

        await authorizeAssistant(
            caller,
            { access: 'dm', scope: 'world:read' },
            'prepare'
        );

        const detail = await readWorldMapDetail(mapId);

        if (!detail || detail.campaignId !== ctx.campaignId)
            throw new AiToolError(API_ERRORS.WORLD_MAP_NOT_FOUND);

        const [heroes, notes] = await Promise.all([
            listHeroesOnMap(ctx.campaignId, mapId),
            listPublicMapNotes(mapId, ctx.userId),
        ]);

        return { ...detail, heroes, notes };
    },
});

export const getWorldTravelLogTool = defineTool({
    name: 'world_travel_log',
    scopes: ['world:read'],
    title: 'Read world travel log',
    description:
        'Reads recent travel, map entry and exit, and rest records for this campaign.',
    input: z.strictObject({
        limit: z
            .number()
            .int()
            .min(1)
            .max(TRAVEL_LOG_LIMIT)
            .default(TRAVEL_LOG_LIMIT),
    }),
    handler: async (ctx, { limit }) => {
        const caller = callerOf(ctx);

        await authorizeAssistant(
            caller,
            { access: 'dm', scope: 'world:read' },
            'prepare'
        );

        return readTravelLog(ctx.campaignId, limit);
    },
});

export const WORLD_TOOLS = [
    listWorldMapsTool,
    getWorldMapTool,
    getWorldTravelLogTool,
];
