import { z } from "zod";

import type { SystemServer } from "@/lib/server/systems/types";
import type { AddonBuilder } from "@/lib/utils/rules/systems/compose";

export const D6POOL_PLUS_SERVER: AddonBuilder<SystemServer> = () => ({ operations: { d6poolFocus: { operation: (() => undefined) as never, input: z.object({ focus: z.number() }) } } });
