import { D20_BALANCE } from "./balance";

import type { SystemServer } from "@/lib/server/systems/types";

export const D20_MODULE_SERVER: SystemServer = { schemas: {}, balance: D20_BALANCE };
