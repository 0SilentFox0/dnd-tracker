import { z } from 'zod';

import { requireCharacterAccess } from '@/lib/server/characters/access';
import {
    defineCharacterOperation,
    gateOptions,
} from '@/lib/server/characters/operation-runner';
import {
    advanceCareer,
    revertCareer,
    setCareer,
    tickTrapping,
} from '@/systems/wfrp/server/career-handler';
import {
    careerAdvanceSchema,
    careerSetSchema,
    careerTrappingSchema,
} from '@/systems/wfrp/server/progression-schemas';

export const careerSetOperation = defineCharacterOperation({
    name: 'career-set',
    action: 'set character career',
    schema: careerSetSchema,
    gate: (ctx) =>
        requireCharacterAccess(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx, true)
        ),
    run: setCareer,
});

export const careerAdvanceOperation = defineCharacterOperation({
    name: 'career-advance',
    action: 'advance character career',
    schema: careerAdvanceSchema,
    gate: (ctx) =>
        requireCharacterAccess(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx, true)
        ),
    run: advanceCareer,
});

export const careerRevertOperation = defineCharacterOperation({
    name: 'career-revert',
    action: 'revert character career change',
    schema: z.object({}),
    gate: (ctx) =>
        requireCharacterAccess(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx, true)
        ),
    query: () => ({}),
    run: (gate, _input) => revertCareer(gate),
});

export const careerTrappingOperation = defineCharacterOperation({
    name: 'career-trapping',
    action: 'tick career trapping',
    schema: careerTrappingSchema,
    gate: (ctx) =>
        requireCharacterAccess(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx, true)
        ),
    run: tickTrapping,
});
