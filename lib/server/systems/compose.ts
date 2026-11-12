import type { SystemServer } from "./types";

import "server-only";
import { type Addon, composeParts } from "@/lib/utils/rules/systems/compose";

export const composeServer = (base: SystemServer, addons: readonly Addon<SystemServer>[]): SystemServer =>
  composeParts(base, addons, { dictionaries: ["operations", "battle", "ai.heroSelect", "ai.toolNotes"] });
