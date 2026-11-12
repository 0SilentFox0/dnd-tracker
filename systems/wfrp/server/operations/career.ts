import { requireCharacterAccess } from '@/lib/server/characters/access';
import {
    characterRoute,
    defineCharacterOperation,
    gateOptions,
} from '@/lib/server/characters/operation-runner';
import { advanceCareer, setCareer } from '@/systems/wfrp/server/career-handler';
import {
    careerAdvanceSchema,
    careerSetSchema,
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

export const POST = characterRoute(careerSetOperation);
