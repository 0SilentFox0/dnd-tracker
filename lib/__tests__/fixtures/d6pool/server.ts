import { z } from "zod";

import type { SystemServer } from "@/lib/server/systems/types";

export const D6POOL_SERVER: SystemServer = { schemas: { characteristics: z.object({ pool: z.number().int().min(1) }) } };
