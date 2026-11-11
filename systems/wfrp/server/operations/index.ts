import { z } from "zod";

import { advanceOperation } from "./advance";
import { advanceUndoOperation } from "./advance-undo";
import { careerAdvanceOperation, careerSetOperation } from "./career";
import { corruptionGrantOperation } from "./corruption";
import { corruptionUndoOperation } from "./corruption-undo";
import { downtimeSetOperation } from "./downtime";
import { downtimePeriodOperation } from "./downtime-period";
import { downtimePeriodUndoOperation } from "./downtime-period-undo";

import { characterIdSchema } from "@/lib/server/characters/character-id-schema";
import type { SystemOperation } from "@/lib/server/systems/types";
import { corruptionGrantSchema, corruptionUndoSchema } from "@/systems/wfrp/server/corruption-schemas";
import { downtimePeriodSchema, downtimePeriodUndoSchema, downtimeSetSchema } from "@/systems/wfrp/server/downtime-schemas";
import { advanceSchema, careerAdvanceSchema, careerSetSchema } from "@/systems/wfrp/server/progression-schemas";

const withId = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.extend(characterIdSchema.shape).strict();

const erased = (operation: unknown) => operation as SystemOperation["operation"];

export const WFRP_OPERATIONS: Record<string, SystemOperation> = {
  advance: { operation: erased(advanceOperation), input: withId(advanceSchema) },
  "advance.undo": { operation: erased(advanceUndoOperation), input: characterIdSchema },
  "career.set": { operation: erased(careerSetOperation), input: withId(careerSetSchema) },
  "career.advance": { operation: erased(careerAdvanceOperation), input: withId(careerAdvanceSchema) },
  "corruption.grant": { operation: erased(corruptionGrantOperation), input: withId(corruptionGrantSchema) },
  "corruption.undo": { operation: erased(corruptionUndoOperation), input: withId(corruptionUndoSchema) },
  "downtime.set": { operation: erased(downtimeSetOperation), input: withId(downtimeSetSchema) },
  "downtime.period": { operation: erased(downtimePeriodOperation), input: downtimePeriodSchema.strict() },
  "downtime.period.undo": { operation: erased(downtimePeriodUndoOperation), input: downtimePeriodUndoSchema.strict() },
};
