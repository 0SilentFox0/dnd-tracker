import { z } from 'zod';

import { requireCharacterAccess } from '@/lib/server/characters/access';
import {
    defineCharacterOperation,
    gateOptions,
} from '@/lib/server/characters/operation-runner';
import { undoAdvance } from '@/systems/wfrp/server/advance-handler';

export const advanceUndoOperation = defineCharacterOperation({
    name: 'advance-undo',
    action: 'undo advance',
    schema: z.object({}),
    gate: (ctx) =>
        requireCharacterAccess(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx, true)
        ),
    query: () => ({}),
    run: (gate, _input) => undoAdvance(gate),
});
