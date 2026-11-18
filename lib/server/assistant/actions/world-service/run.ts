import { conflict } from '../../errors';
import type { ActionExecutionContext, ActionResult } from '../../types';
import { parsedInput, WorldOperation } from './inputs';
import { dmAccess } from './prepare';
import { worldState } from './state';
import { getCampaignId } from './state-common';
import { runTravelOperation } from './travel-run';
import {
    WriteArgs,
    writeMapsCreate,
    writeMapsDelete,
    writeMapsUpdate,
    WriteResult,
} from './writers-maps';
import {
    writeMarkersCreate,
    writeMarkersDelete,
    writeMarkersUpdate,
} from './writers-markers';
import {
    writeNotesCreate,
    writeNotesDelete,
    writeNotesUpdate,
} from './writers-notes';

import 'server-only';
import { requestDigest } from '@/lib/utils/battle/store/stable-json';
import { jsonContent } from '@/lib/utils/common/json';

const WORLD_WRITERS: Partial<
    Record<WorldOperation, (args: WriteArgs) => Promise<WriteResult>>
> = {
    'maps.create': writeMapsCreate,
    'maps.update': writeMapsUpdate,
    'maps.delete': writeMapsDelete,
    'markers.create': writeMarkersCreate,
    'markers.update': writeMarkersUpdate,
    'markers.delete': writeMarkersDelete,
    'notes.create': writeNotesCreate,
    'notes.update': writeNotesUpdate,
    'notes.delete': writeNotesDelete,
};

export async function runWorldAction(
    ctx: ActionExecutionContext,
    operation: WorldOperation,
    raw: unknown
): Promise<ActionResult> {
    // The assistant executor wraps this action in runContentWriteContext; the scoped prisma proxy keeps these operations and nested domain-service transactions on ctx.db.
    const input = parsedInput(operation, raw);

    const campaignId = getCampaignId(ctx.caller);

    const before = await worldState(ctx.caller, operation, input);

    if (
        requestDigest(before) !==
        (ctx.expected as { fingerprint?: string })?.fingerprint
    )
        throw conflict();

    const emitWorldChanged = (mapId: string | null) =>
        ctx.afterCommit({
            key: `world-event:${ctx.intentId}`,
            kind: 'world-changed',
            payload: jsonContent({ campaignId, mapId }),
        });

    const write = WORLD_WRITERS[operation];

    if (write) {
        const { data, affected } = await write({
            ctx,
            campaignId,
            input,
            before,
            emitWorldChanged,
        });

        return { data: jsonContent(data), affected, warnings: [] };
    }

    const access = await dmAccess(ctx.caller);

    const result = await runTravelOperation(access, operation, input);

    if (result.mapId) emitWorldChanged(result.mapId);

    return {
        data: jsonContent(result.data),
        affected: result.affected,
        warnings: [],
    };
}
