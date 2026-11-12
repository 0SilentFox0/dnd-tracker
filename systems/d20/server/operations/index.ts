import { z } from 'zod';

import { arcaneRecoveryOperation } from './arcane-recovery';
import { LevelUpBodySchema } from './class-level-up';
import { hitDiceOperation } from './hit-dice';
import { levelUpOperation } from './level-up';

import {
    arcaneRecoverySchema,
    hitDieSchema,
} from '@/lib/schemas/out-of-combat';
import { characterIdSchema } from '@/lib/server/characters/character-id-schema';
import type { SystemOperation } from '@/lib/server/systems/types';

const withId = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
    schema.extend(characterIdSchema.shape).strict();

const erased = (operation: unknown) =>
    operation as SystemOperation['operation'];

export const D20_OPERATIONS: Record<string, SystemOperation> = {
    'level-up': {
        operation: erased(levelUpOperation),
        input: withId(LevelUpBodySchema),
    },
    'hit-dice': {
        operation: erased(hitDiceOperation),
        input: withId(hitDieSchema),
    },
    'arcane-recovery': {
        operation: erased(arcaneRecoveryOperation),
        input: withId(arcaneRecoverySchema),
    },
};
