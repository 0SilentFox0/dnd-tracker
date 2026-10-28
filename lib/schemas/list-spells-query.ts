import { z } from "zod";

import { SPELL_IDS_QUERY_MAX } from "@/lib/constants/spells";

const idList = z
  .string()
  .transform((raw) => [...new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))])
  .pipe(z.array(z.string().max(64)).min(1).max(SPELL_IDS_QUERY_MAX));

export const listSpellsQuerySchema = z.object({ ids: idList.optional() });
