import { CORE_ACTION_REGISTRY, type CoreActionKey } from "./registry";

import { isActive, isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { canAttackFromPool } from "@/lib/utils/battle/attack/attacks-left";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import { bothOnMap, isAdjacent } from "@/lib/utils/battle/grid/occupancy";
import { baseMovement, remainingMovement } from "@/lib/utils/battle/grid/path";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface CoreActionAvailability {
  ok: boolean;
  reason?: string;
}

const STAND_UP_COST_DIVISOR = 2;

export const isAttackAction = (key: CoreActionKey) => key === "grapple" || key === "shove";

export const standUpCost = (p: BattleParticipant) => Math.ceil(baseMovement(p) / STAND_UP_COST_DIVISOR);

export function canStandUp(p: BattleParticipant): boolean {
  return hasCondition(p, "prone") && baseMovement(p) > 0 && remainingMovement(p) >= standUpCost(p);
}

export function coreActionTargets(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined): BattleParticipant[] {
  const target = CORE_ACTION_REGISTRY[key].target;

  if (target === "none") return [];

  const sideOk = (p: BattleParticipant) => (target === "allyAdjacent" ? p.basicInfo.side === actor.basicInfo.side && isActive(p) : p.basicInfo.side !== actor.basicInfo.side && isAttackable(p));

  return participants.filter((p) => p.basicInfo.id !== actor.basicInfo.id && !p.battleData.reserved && sideOk(p) && (!bothOnMap(map, actor, p) || isAdjacent(actor, p)));
}

export function validateCoreAction(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined, targetId?: string): string | null {
  const { target } = CORE_ACTION_REGISTRY[key];

  if (key === "standUp") {
    if (!hasCondition(actor, "prone")) return "Ви не лежите";

    if (baseMovement(actor) <= 0) return "Не можна встати: швидкість 0";

    if (!canStandUp(actor)) return "Недостатньо руху";
  }

  if (key === "escape" && !hasCondition(actor, "grappled")) return "Ви не схоплені";

  if (target === "none") return null;

  const targets = coreActionTargets(key, actor, participants, map);

  if (targetId === undefined ? !targets.length : !targets.some((t) => t.basicInfo.id === targetId)) return target === "allyAdjacent" ? "Немає суміжного союзника" : "Немає суміжного ворога";

  return null;
}

export function coreActionAvailability(key: CoreActionKey, actor: BattleParticipant, participants: BattleParticipant[], map: BattleMapConfig | null | undefined): CoreActionAvailability {
  if (CORE_ACTION_REGISTRY[key].cost === "action" && actor.actionFlags.hasUsedAction && !(isAttackAction(key) && canAttackFromPool(actor))) return { ok: false, reason: "Дію вже витрачено" };

  const reason = validateCoreAction(key, actor, participants, map);

  return reason ? { ok: false, reason } : { ok: true };
}
