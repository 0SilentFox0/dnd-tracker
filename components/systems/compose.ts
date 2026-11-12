import type { SystemUi } from "./types";

import { type Addon, composeParts } from "@/lib/utils/rules/systems/compose";

export const composeUi = (base: SystemUi, addons: readonly Addon<SystemUi>[]): SystemUi => composeParts(base, addons, { dictionaries: ["rulesSections", "rulesItems"] });
