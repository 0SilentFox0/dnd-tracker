import { requireCharacterAccess } from '@/lib/server/characters/access';
import {
    defineCharacterOperation,
    gateOptions,
} from '@/lib/server/characters/operation-runner';
import { advanceCharacter } from '@/systems/wfrp/server/advance-handler';
import { advanceSchema } from '@/systems/wfrp/server/progression-schemas';

export const advanceOperation = defineCharacterOperation({
    name: 'advance',
    action: 'advance character',
    schema: advanceSchema,
    gate: (ctx) =>
        requireCharacterAccess(
            ctx.campaignId,
            ctx.characterId,
            gateOptions(ctx)
        ),
    run: advanceCharacter,
});
