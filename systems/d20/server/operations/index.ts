import { arcaneRecoveryOperation } from './arcane-recovery';
import { LevelUpBodySchema } from './class-level-up';
import { hitDiceOperation } from './hit-dice';
import { levelUpOperation } from './level-up';

import {
    arcaneRecoverySchema,
    hitDieSchema,
} from '@/lib/schemas/out-of-combat';
import {
    asSystemOperation,
    withCharacterId,
} from '@/lib/server/systems/operation-helpers';
import type { SystemOperation } from '@/lib/server/systems/types';

export const D20_OPERATIONS: Record<string, SystemOperation> = {
    'level-up': {
        operation: asSystemOperation(levelUpOperation),
        input: withCharacterId(LevelUpBodySchema),
    },
    'hit-dice': {
        operation: asSystemOperation(hitDiceOperation),
        input: withCharacterId(hitDieSchema),
    },
    'arcane-recovery': {
        operation: asSystemOperation(arcaneRecoveryOperation),
        input: withCharacterId(arcaneRecoverySchema),
    },
};
