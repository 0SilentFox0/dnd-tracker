import { z } from 'zod';

import { setInspiration } from './set-inspiration';

import { requireCharacterRow } from '@/lib/server/characters/access';
import { characterIdSchema } from '@/lib/server/characters/character-id-schema';
import {
    defineCharacterOperation,
    gateOptions,
} from '@/lib/server/characters/operation-runner';
import { asSystemOperation } from '@/lib/server/systems/operation-helpers';
import type { SystemOperation } from '@/lib/server/systems/types';

export const inspirationSchema = z.object({ value: z.boolean() });

export const inspirationOperation = defineCharacterOperation({
    name: 'inspiration',
    action: 'set inspiration',
    schema: inspirationSchema,
    gate: (ctx) =>
        requireCharacterRow(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx, true)
        ),
    run: (gate, body) => setInspiration(gate, body.value),
});

export const INSPIRATION_OPERATIONS: Record<string, SystemOperation> = {
    inspiration: {
        operation: asSystemOperation(inspirationOperation),
        input: characterIdSchema.extend(inspirationSchema.shape).strict(),
    },
};
