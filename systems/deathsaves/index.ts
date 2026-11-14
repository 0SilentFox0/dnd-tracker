import { deathSavesHoldsOn } from './rules/holds';
import { deathSaveOnSkip } from './rules/on-skipped-turn';
import { deathSavesOnZeroHp } from './rules/on-zero-hp';
import { reviveFromDying } from './rules/revive';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const DEATHSAVES_MODULE = defineAddon<RuleSystemDefinition>((prev) => ({
    combat: {
        onZeroHp: (ctx) => {
            const own = deathSavesOnZeroHp(ctx);

            const rest = prev.combat.onZeroHp({
                ...ctx,
                after: own.participant,
                participants: own.participants,
            });

            return { ...rest, messages: [...own.messages, ...rest.messages] };
        },
        onRevived: reviveFromDying,
        holdsOn: deathSavesHoldsOn,
        turn: { onSkippedTurn: [deathSaveOnSkip] },
    },
}));
