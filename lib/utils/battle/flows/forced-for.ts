import { type ForcedMode, forcedModeOf } from './attack-flow';

import { predictAttack } from '@/lib/utils/battle/attack/bonus';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    BattleAttack,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';

export interface AttackContext {
    order: BattleParticipant[];
    round: number;
    map?: BattleMapConfig | null;
    rules: Ruleset;
}

/** Режим кидка, нав'язаний умовами (перевага/недолік), або undefined, якщо гравець обирає сам. */
export function forcedFor(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    ctx: AttackContext,
    opts: { inspiration?: boolean } = {}
): ForcedMode | undefined {
    return forcedModeOf(
        predictAttack(attacker, target, attack, ctx.order, {
            ...opts,
            round: ctx.round,
            map: ctx.map,
            rules: ctx.rules,
        })
    );
}
