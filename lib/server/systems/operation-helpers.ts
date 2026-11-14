import type { z } from 'zod';

import { characterIdSchema } from '@/lib/server/characters/character-id-schema';
import type { SystemOperation } from '@/lib/server/systems/types';

export const withCharacterId = <T extends z.ZodRawShape>(
    schema: z.ZodObject<T>
) => schema.extend(characterIdSchema.shape).strict();

export const asSystemOperation = (operation: unknown) =>
    operation as SystemOperation['operation'];
