import { lairStateOf } from './state';

import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import type { TurnHook, TurnHookCtx } from '@/lib/utils/rules/systems/types';

export const lairRoundStart: TurnHook<TurnHookCtx> = ({ participants }) => ({
    participants,
    messages: participants
        .filter(
            (p) =>
                lairStateOf(p)?.active &&
                isActive(p) &&
                p.battleData.resolvedAbilities.some((a) => a.limits?.lair)
        )
        .map((p) =>
            textRef('battleLog.round.lair', { name: p.basicInfo.name })
        ),
});
