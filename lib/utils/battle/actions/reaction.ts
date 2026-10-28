import { AttackType, EffectMarker } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function reactionBlocker(p: BattleParticipant): string | null {
  if (p.actionFlags.hasUsedReaction) return "Реакцію вже витрачено";

  return !isActive(p) || hasCondition(p, "incapacitated") || hasEffectMarker(p, EffectMarker.NO_REACTION) ? "Недієздатний учасник не може реагувати" : null;
}

export const canReact = (p: BattleParticipant) => reactionBlocker(p) === null;

export function pickMeleeAttack(p: BattleParticipant): BattleAttack | null {
  if (getDisabledAttackKinds(p).melee) return null;

  return p.battleData.attacks.find((a) => a.hand !== "off" && attackKindOf(a.type) === AttackType.MELEE) ?? null;
}
