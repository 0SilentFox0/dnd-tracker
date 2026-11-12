import {
    campaignGate,
    characterRoute,
    defineCharacterOperation,
} from '@/lib/server/characters/operation-runner';
import { undoPeriod } from '@/systems/wfrp/server/downtime-handler';
import { downtimePeriodUndoSchema } from '@/systems/wfrp/server/downtime-schemas';

export const downtimePeriodUndoOperation = defineCharacterOperation({
    name: 'downtime.period.undo',
    action: 'undo downtime period',
    schema: downtimePeriodUndoSchema,
    gate: campaignGate,
    run: undoPeriod,
});

export const POST = characterRoute(downtimePeriodUndoOperation);
