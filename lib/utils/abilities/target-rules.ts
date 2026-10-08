import { ParticipantSourceType } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/participants";
import { conditionRequiresDeadTarget } from "@/lib/utils/abilities/registry/conditions";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export interface DeadTargetRules {
  requiresDead: boolean;
  unitsOnly: boolean;
  ownerSideOnly: boolean;
}

const flatten = (effects: Effect[]): Effect[] => effects.flatMap((e) => (e.kind === "randomOf" ? flatten(e.options) : [e]));

export function deadTargetRules(a: Pick<ResolvedAbility, "condition" | "effects">): DeadTargetRules {
  const effects = flatten(a.effects);

  const raises = effects.some((e) => e.kind === "raiseDead");

  const requiresDead = raises || conditionRequiresDeadTarget(a.condition);

  return { requiresDead, unitsOnly: raises, ownerSideOnly: requiresDead && effects.some((e) => e.kind === "heal" && e.revive === true) };
}

export function isEligibleDeadTarget(rules: DeadTargetRules, target: BattleParticipant, owner?: BattleParticipant): boolean {
  if (isActive(target)) return false;

  if (rules.unitsOnly && target.basicInfo.sourceType !== ParticipantSourceType.UNIT) return false;

  return !(rules.ownerSideOnly && owner && target.basicInfo.side !== owner.basicInfo.side);
}
