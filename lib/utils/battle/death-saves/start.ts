import { DEATH_SAVES_TIMED_KEY, FRESH_DEATH_SAVES } from "./index";

import { CombatStatus } from "@/lib/constants/battle";
import { upsertLabeled } from "@/lib/utils/battle/actions/effects";
import { PERMANENT_ROUNDS } from "@/lib/utils/battle/conditions/set";
import type { Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";

// Separate from index: ruleSystemOf here would close an import cycle through wfrp → hp → death-saves.
export function startDying(p: BattleParticipant, rules: Ruleset): BattleParticipant {
  const unconscious = ruleSystemOf(rules).conditionSet.effectInput("unconscious", { timedKey: DEATH_SAVES_TIMED_KEY, rounds: PERMANENT_ROUNDS, permanent: true, exhaustion: rules.conditions.exhaustion });

  const down = unconscious ? upsertLabeled(p, unconscious, 0) : p;

  return {
    ...down,
    combatStats: { ...down.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS },
    battleData: { ...down.battleData, deathSaves: { ...FRESH_DEATH_SAVES } },
  };
}
