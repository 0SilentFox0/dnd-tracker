import { moduleVocab } from '@/lib/utils/rules/systems/vocab';
import type { BattleParticipantCombatStats } from '@/types/battle';

type StatKey = keyof BattleParticipantCombatStats;

/** Combat stats that modules add to the participant (stored in `combatStats`) */
export const MODULE_COMBAT_STATS: readonly StatKey[] = moduleVocab(
    'combatStats'
).map((e) => e.id as StatKey);

/** Stats an opponent never sees; they read as `neutral` in the projection */
export const HIDDEN_COMBAT_STATS: readonly StatKey[] = moduleVocab(
    'combatStats'
)
    .filter((e) => e.hidden)
    .map((e) => e.id as StatKey);

export const NEUTRAL_HIDDEN_STATS: Partial<BattleParticipantCombatStats> =
    Object.fromEntries(
        moduleVocab('combatStats')
            .filter((e) => e.hidden)
            .map((e) => [e.id, e.neutral ?? 0])
    );
