import { z } from "zod";

import { MENTION_TYPES } from "@/lib/constants/scenario";

const indexRefSchema = z.object({
  type: z.enum(MENTION_TYPES),
  id: z.string(),
  label: z.string(),
  count: z.number().int().positive(),
  secret: z.boolean(),
});

export const pageFactsSchema = z.object({
  sections: z.array(z.object({ id: z.string(), title: z.string(), played: z.boolean(), refs: z.array(indexRefSchema) })),
});
