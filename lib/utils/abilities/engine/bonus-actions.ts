import { resolvedAbilitiesOf } from "./participants";
import { withinLimits } from "./usage";

import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export function getBonusActionAbilities(p: BattleParticipant): ResolvedAbility[] {
  return resolvedAbilitiesOf(p).filter((a) => a.trigger.event === "bonusAction" && withinLimits(p, a));
}
