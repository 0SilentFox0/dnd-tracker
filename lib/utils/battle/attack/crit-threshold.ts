import { MIN_CRIT_ON } from '@/lib/constants/battle';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { critRulesOf } from '@/lib/utils/battle/attack/crit-rules';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';

export function critThresholdOf(
    rules: Ruleset,
    participants: BattleParticipant[],
    attackerId: string,
    extra?: StaticEffect[]
): number {
    const { critOn } = critRulesOf(rules);

    return Math.max(
        MIN_CRIT_ON,
        critOn +
            collectModifiers(
                participants,
                attackerId,
                { stat: 'critThreshold' },
                extra
            ).flat
    );
}
