import "server-only";

import type { SystemServer } from "./types";

import type { RuleSystemKey } from "@/lib/utils/rules/systems";
import type { Ruleset } from "@/lib/utils/rules/schema";
// <systems:generated>
import { WFRP_SERVER } from "@/systems/wfrp/server";
// </systems:generated>

export type { SystemSchemas, SystemServer } from "./types";

const D20_SERVER: SystemServer = { schemas: {} };

export const SYSTEM_SERVER: Readonly<Record<RuleSystemKey, SystemServer>> = {
  homm: D20_SERVER,
  dnd5e: D20_SERVER,
  // <systems:generated>
  wfrp: WFRP_SERVER,
  // </systems:generated>
};

export const systemServerOf = (rules: Pick<Ruleset, "system">): SystemServer => SYSTEM_SERVER[rules.system.key];
