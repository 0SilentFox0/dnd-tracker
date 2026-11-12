import { requireCharacterAccess } from '@/lib/server/characters/access';
import {
    characterRoute,
    defineCharacterOperation,
    gateOptions,
} from '@/lib/server/characters/operation-runner';
import { setDowntime } from '@/systems/wfrp/server/downtime-handler';
import { downtimeSetSchema } from '@/systems/wfrp/server/downtime-schemas';

export const downtimeSetOperation = defineCharacterOperation({
    name: 'downtime.set',
    action: 'set downtime',
    schema: downtimeSetSchema,
    gate: (ctx) =>
        requireCharacterAccess(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx)
        ),
    run: setDowntime,
});

export const PUT = characterRoute(downtimeSetOperation);
