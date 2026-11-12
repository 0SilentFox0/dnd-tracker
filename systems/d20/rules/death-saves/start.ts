import { D20_CONDITION_SET } from "../conditions";
import { DEATH_SAVES_TIMED_KEY, FRESH_DEATH_SAVES } from "./state";

import { CombatStatus } from "@/lib/constants/battle";
import { upsertLabeled } from "@/lib/utils/battle/actions/effects";
import { PERMANENT_ROUNDS } from "@/lib/utils/battle/conditions/set";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export function startDying(p: BattleParticipant, rules: Ruleset): BattleParticipant {
  const unconscious = D20_CONDITION_SET.effectInput("unconscious", { timedKey: DEATH_SAVES_TIMED_KEY, rounds: PERMANENT_ROUNDS, permanent: true, exhaustion: rules.conditions.exhaustion });

  const down = unconscious ? upsertLabeled(p, unconscious, 0) : p;

  return {
    ...down,
    combatStats: { ...down.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS },
    battleData: { ...down.battleData, deathSaves: { ...FRESH_DEATH_SAVES } },
  };
}
