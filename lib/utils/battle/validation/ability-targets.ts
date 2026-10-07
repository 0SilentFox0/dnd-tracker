import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/participants";
import { conditionRequiresDeadTarget } from "@/lib/utils/abilities/registry/conditions";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export const abilityMaxTargets = (a: ResolvedAbility): number => a.maxTargets ?? 1;

export function assertAbilityTargets(ability: ResolvedAbility, ps: BattleParticipant[], targetIds: string[]): void {
  if (targetIds.length > abilityMaxTargets(ability)) throw new BattleRuleError("invalid_target", API_ERRORS.ABILITY_TOO_MANY_TARGETS);

  const targets = targetIds.map((id) => findParticipant(ps, id));

  if (targets.some((t) => !t)) throw new BattleRuleError("invalid_target", API_ERRORS.NOT_FOUND);

  if (conditionRequiresDeadTarget(ability.condition) && (targets.length === 0 || targets.some((t) => t && isActive(t)))) {
    throw new BattleRuleError("invalid_target", API_ERRORS.BONUS_TARGET_MUST_BE_DEAD);
  }
}

export function toggleAbilityTarget(selected: string[], id: string, max: number): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);

  return selected.length >= max ? selected : [...selected, id];
}
