import { MIN_CRIT_ON } from "@/lib/constants/battle";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export function critThresholdOf(rules: Pick<Ruleset, "criticals"> | undefined, participants: BattleParticipant[], attackerId: string, extra?: StaticEffect[]): number {
  const critOn = (rules ?? DEFAULT_RULES).criticals.critOn;

  return Math.max(MIN_CRIT_ON, critOn + collectModifiers(participants, attackerId, { stat: "critThreshold" }, extra).flat);
}
