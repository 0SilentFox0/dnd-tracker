import { MIN_CRIT_ON } from '@/lib/constants/battle';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';

export function critThresholdOf(
    rules: Pick<Ruleset, 'criticals'>,
    participants: BattleParticipant[],
    attackerId: string,
    extra?: StaticEffect[]
): number {
    const critOn = rules.criticals.critOn;

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
