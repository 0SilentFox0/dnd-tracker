import { canStandUp, coreActionAvailability, coreActionCost, coreActionTargets } from "./availability";
import { releaseInvalidGrapples } from "./grapple";
import { legendaryAttack } from "./legendary";
import { resolveMovement } from "./movement";
import { CORE_ACTION_REGISTRY } from "./registry";
import { runCoreAction } from "./run";

import type { RuleSystemActions } from "@/lib/utils/rules/systems/types";

export const D20_ACTIONS: RuleSystemActions = {
  enabled: (rules) => rules.actions.enabled,
  catalog: CORE_ACTION_REGISTRY,
  cost: coreActionCost,
  targets: coreActionTargets,
  available: coreActionAvailability,
  canStandUp,
  run: runCoreAction,
  legendaryAttack,
  move: resolveMovement,
  releaseInvalidGrapples,
};
