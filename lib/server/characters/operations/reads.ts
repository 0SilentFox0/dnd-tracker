import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
    type CharacterOpCtx,
    defineCharacterOperation,
} from '../operation-runner';

import { readCharacterLog } from '@/lib/server/characters/core/read-character-log';
import { readFreeArtifacts } from '@/lib/server/characters/core/read-free-artifacts';
import { readInventory } from '@/lib/server/characters/core/read-inventory';
import { readLog } from '@/lib/server/characters/core/read-log';
import { readCharacterSheet } from '@/lib/server/characters/core/read-sheet';
import { readStash } from '@/lib/server/characters/core/read-stash';
import { markLevelSeenUnlocked } from '@/lib/server/characters/core/seen-level-handler';

const byId = z.object({ characterId: z.string() });

const paged = byId.extend({ cursor: z.string().max(100).optional() });

/**
 * Reads that server pages and routes share as `NextResponse` handlers
 * (each resolves its own access); the assistant reaches them through the same registry.
 */
function viaResponse<I extends { characterId?: string }>(
    name: string,
    schema: z.ZodType<I>,
    call: (ctx: CharacterOpCtx, input: I) => Promise<NextResponse>
) {
    return defineCharacterOperation({
        name,
        action: name,
        schema,
        unlocked: true,
        gate: async (ctx: CharacterOpCtx) => ctx,
        run: call,
    });
}

export const READ_OPERATIONS = {
    inventory: viaResponse(
        'inventory',
        byId,
        ({ campaignId, characterId, actor }) =>
            readInventory(campaignId, characterId, actor, true)
    ),
    stash: viaResponse('stash', byId, ({ campaignId, characterId, actor }) =>
        readStash(campaignId, characterId, actor)
    ),
    'stash.log': viaResponse(
        'stash.log',
        paged,
        ({ campaignId, characterId, actor }, { cursor }) =>
            readLog(campaignId, characterId, cursor ?? null, actor)
    ),
    log: viaResponse(
        'log',
        paged,
        ({ campaignId, characterId, actor }, { cursor }) =>
            readCharacterLog(campaignId, characterId, cursor ?? null, actor)
    ),
    'stash.free-artifacts': viaResponse(
        'stash.free-artifacts',
        z.object({ characterId: z.string().optional() }),
        ({ campaignId, actor }) => readFreeArtifacts(campaignId, actor)
    ),
    sheet: viaResponse('sheet', byId, ({ campaignId, characterId, actor }) =>
        readCharacterSheet({ id: campaignId, characterId }, actor)
    ),
    'progression.seen-level': viaResponse(
        'progression.seen-level',
        byId,
        ({ campaignId, characterId, actor }) =>
            markLevelSeenUnlocked(campaignId, characterId, actor)
    ),
};
