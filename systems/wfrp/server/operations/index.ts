import { z } from 'zod';

import { advanceOperation } from './advance';
import { advanceUndoOperation } from './advance-undo';
import {
    careerAdvanceOperation,
    careerRevertOperation,
    careerSetOperation,
    careerTrappingOperation,
} from './career';
import { corruptionGrantOperation } from './corruption';
import { corruptionUndoOperation } from './corruption-undo';
import { downtimeSetOperation } from './downtime';
import { downtimePeriodOperation } from './downtime-period';
import { downtimePeriodUndoOperation } from './downtime-period-undo';

import { characterIdSchema } from '@/lib/server/characters/character-id-schema';
import {
    asSystemOperation,
    withCharacterId,
} from '@/lib/server/systems/operation-helpers';
import type { SystemOperation } from '@/lib/server/systems/types';
import {
    corruptionExposureGrantSchema,
    corruptionManualGrantSchema,
    corruptionUndoSchema,
} from '@/systems/wfrp/server/corruption-schemas';
import {
    downtimePeriodSchema,
    downtimePeriodUndoSchema,
    downtimeSetSchema,
} from '@/systems/wfrp/server/downtime-schemas';
import {
    advanceSchema,
    careerAdvanceSchema,
    careerSetSchema,
    careerTrappingSchema,
} from '@/systems/wfrp/server/progression-schemas';

export const WFRP_OPERATIONS: Record<string, SystemOperation> = {
    advance: {
        operation: asSystemOperation(advanceOperation),
        input: withCharacterId(advanceSchema),
    },
    'advance.undo': {
        operation: asSystemOperation(advanceUndoOperation),
        input: characterIdSchema,
    },
    'career.set': {
        operation: asSystemOperation(careerSetOperation),
        input: withCharacterId(careerSetSchema),
    },
    'career.advance': {
        operation: asSystemOperation(careerAdvanceOperation),
        input: withCharacterId(careerAdvanceSchema),
    },
    'career.revert': {
        operation: asSystemOperation(careerRevertOperation),
        input: characterIdSchema,
    },
    'career.trapping': {
        operation: asSystemOperation(careerTrappingOperation),
        input: withCharacterId(careerTrappingSchema),
    },
    'corruption.grant': {
        operation: asSystemOperation(corruptionGrantOperation),
        input: z.union([
            withCharacterId(corruptionManualGrantSchema),
            withCharacterId(corruptionExposureGrantSchema),
        ]),
    },
    'corruption.undo': {
        operation: asSystemOperation(corruptionUndoOperation),
        input: withCharacterId(corruptionUndoSchema),
    },
    'downtime.set': {
        operation: asSystemOperation(downtimeSetOperation),
        input: withCharacterId(downtimeSetSchema),
    },
    'downtime.period': {
        operation: asSystemOperation(downtimePeriodOperation),
        input: downtimePeriodSchema.strict(),
    },
    'downtime.period.undo': {
        operation: asSystemOperation(downtimePeriodUndoOperation),
        input: downtimePeriodUndoSchema.strict(),
    },
};
