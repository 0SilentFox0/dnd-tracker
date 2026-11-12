import type { Owned } from "./owned";

import type { AbilityVariables } from "@/lib/utils/abilities/engine/core/variables";
// <systems:generated>
import { D20_ABILITY_VARIABLES } from "@/systems/d20/rules/ability-variables";
import { MORALE_ABILITY_VARIABLES } from "@/systems/morale/rules/ability-variables";
// </systems:generated>

export const SYSTEM_ABILITY_VARIABLES: readonly Owned<AbilityVariables>[] = [
  // <systems:generated>
  { system: "d20", items: D20_ABILITY_VARIABLES },
  { system: "morale", items: MORALE_ABILITY_VARIABLES },
  // </systems:generated>
];
