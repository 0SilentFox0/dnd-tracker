import { z } from "zod";

import { AbilityTargetSchema, DurationSchema } from "./common";

export const flagBase = { kind: z.literal("flag"), target: AbilityTargetSchema.optional(), duration: DurationSchema.optional() };
