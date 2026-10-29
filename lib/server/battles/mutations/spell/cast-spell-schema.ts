import type { z } from "zod";

import { spellSchema } from "@/lib/schemas/battles";


export { spellSchema };

export type SpellRequestData = z.infer<typeof spellSchema>;
