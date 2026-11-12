import { CORE_ACTION_REGISTRY } from "./registry";

import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive, isAttackable, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { CoreActionDef, CoreActionKey } from "@/lib/utils/battle/actions/keys";
import { actionReason } from "@/lib/utils/battle/actions/reasons";
import type { CoreActionAvailability } from "@/lib/utils/battle/actions/types";
import { canAttackFromPool } from "@/lib/utils/battle/attack/attacks-left";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import { bothOnMap, isAdjacent } from "@/lib/utils/battle/grid/occupancy";
import { baseMovement, remainingMovement } from "@/lib/utils/battle/grid/path";
import { isHostile } from "@/lib/utils/battle/modes/engine";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const STAND_UP_COST_DIVISOR = 2;

const CUNNING_ACTIONS: readonly CoreActionKey[] = ["dash", "disengage", "hide"];

export function coreActionCost(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[]): CoreActionDef["cost"] {
  const { cost } = CORE_ACTION_REGISTRY[key];

  return cost === "action" && CUNNING_ACTIONS.includes(key) && findFlags(withSelf(participants, actor), actor.basicInfo.id, "cunningAction").length > 0 ? "bonusAction" : cost;
}

export const isAttackAction = (key: CoreActionKey) => key === "grapple" || key === "shove";

export const standUpCost = (p: BattleParticipant, rules: Ruleset) => Math.ceil(baseMovement(p, rules) / STAND_UP_COST_DIVISOR);

export function canStandUp(p: BattleParticipant, rules: Ruleset): boolean {
  return hasCondition(p, "prone") && baseMovement(p, rules) > 0 && remainingMovement(p, rules) >= standUpCost(p, rules);
}

export function coreActionTargets(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined): BattleParticipant[] {
  const target = CORE_ACTION_REGISTRY[key].target;

  if (target === "none") return [];

  const sideOk = (p: BattleParticipant) => (target === "allyAdjacent" ? !isHostile(map, actor, p) && isActive(p) : isHostile(map, actor, p) && isAttackable(p));

  return participants.filter((p) => p.basicInfo.id !== actor.basicInfo.id && !p.battleData.reserved && sideOk(p) && (!bothOnMap(map, actor, p) || isAdjacent(actor, p)));
}

export function validateCoreAction(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined, rules: Ruleset, targetId?: string): LogLine | null {
  const { target } = CORE_ACTION_REGISTRY[key];

  if (key === "standUp") {
    if (!hasCondition(actor, "prone")) return actionReason("notProne");

    if (baseMovement(actor, rules) <= 0) return actionReason("standSpeedZero");

    if (!canStandUp(actor, rules)) return actionReason("standNoMovement");
  }

  if (key === "escape" && !hasCondition(actor, "grappled")) return actionReason("notGrappled");

  if (target === "none") return null;

  const targets = coreActionTargets(key, actor, participants, map);

  if (targetId === undefined ? !targets.length : !targets.some((t) => t.basicInfo.id === targetId)) return actionReason(target === "allyAdjacent" ? "noAdjacentAlly" : "noAdjacentEnemy");

  return null;
}

export function coreActionAvailability(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined, rules: Ruleset): CoreActionAvailability {
  const cost = coreActionCost(key, actor, participants);

  if (cost === "bonusAction" && actor.actionFlags.hasUsedBonusAction) return { ok: false, reason: actionReason("bonusUsed") };

  if (cost === "action" && actor.actionFlags.hasUsedAction && !(isAttackAction(key) && canAttackFromPool(actor))) return { ok: false, reason: actionReason("actionUsed") };

  const reason = validateCoreAction(key, actor, participants, map, rules);

  return reason ? { ok: false, reason } : { ok: true };
}
