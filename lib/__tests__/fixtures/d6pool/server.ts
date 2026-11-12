import { z } from "zod";

import type { SystemServer } from "@/lib/server/systems/types";

export const D6POOL_SERVER: SystemServer = { balance: { heroPower: () => { throw new Error("not used"); }, unitStats: (base) => base, readsBuiltRules: false }, schemas: { characteristics: z.object({ pool: z.number().int().min(1) }) } };
