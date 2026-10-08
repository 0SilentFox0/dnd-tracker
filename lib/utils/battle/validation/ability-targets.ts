import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/participants";
import { deadTargetRules, isEligibleDeadTarget } from "@/lib/utils/abilities/target-rules";
import { BattleRuleError } from "@/lib/utils/battle/store";
import { needsBonusTarget } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export const abilityMaxTargets = (a: ResolvedAbility): number => a.maxTargets ?? 1;

export function assertAbilityTargets(ability: ResolvedAbility, ps: BattleParticipant[], rawTargetIds: string[], owner?: BattleParticipant): string[] {
  const targetIds = [...new Set(rawTargetIds)];

  if (targetIds.length > abilityMaxTargets(ability)) throw new BattleRuleError("invalid_target", API_ERRORS.ABILITY_TOO_MANY_TARGETS);

  const targets = targetIds.map((id) => findParticipant(ps, id));

  if (targets.some((t) => !t)) throw new BattleRuleError("invalid_target", API_ERRORS.NOT_FOUND);

  if (targets.length === 0 && needsBonusTarget(ability)) {
    throw new BattleRuleError("invalid_target", deadTargetRules(ability).requiresDead ? API_ERRORS.BONUS_TARGET_MUST_BE_DEAD : API_ERRORS.ABILITY_TARGET_REQUIRED);
  }

  const rules = deadTargetRules(ability);

  if (rules.requiresDead) {
    for (const t of targets) {
      if (t && isActive(t)) throw new BattleRuleError("invalid_target", API_ERRORS.BONUS_TARGET_MUST_BE_DEAD);

      if (t && !isEligibleDeadTarget(rules, t, owner)) throw new BattleRuleError("invalid_target", API_ERRORS.ABILITY_TARGET_INVALID);
    }
  }

  return targetIds;
}

export function toggleAbilityTarget(selected: string[], id: string, max: number): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);

  return selected.length >= max ? selected : [...selected, id];
}
