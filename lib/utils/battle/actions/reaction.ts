import { actionReason } from "./reasons";

import { AttackType, EffectMarker } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function reactionBlocker(p: BattleParticipant, rules?: Pick<Ruleset, "system">): LogLine | null {
  if (rules && !ruleSystemOf(rules).combat.actionEconomy.reaction) return actionReason("noReaction");

  if (p.actionFlags.hasUsedReaction) return actionReason("reactionUsed");

  return !isActive(p) || hasCondition(p, "incapacitated") || hasEffectMarker(p, EffectMarker.NO_REACTION) ? actionReason("cannotReact") : null;
}

export const canReact = (p: BattleParticipant, rules?: Pick<Ruleset, "system">) => reactionBlocker(p, rules) === null;

export function pickMeleeAttack(p: BattleParticipant): BattleAttack | null {
  if (getDisabledAttackKinds(p).melee) return null;

  return p.battleData.attacks.find((a) => a.hand !== "off" && attackKindOf(a.type) === AttackType.MELEE) ?? null;
}
