import { ENGAGEMENT_FRESH } from '../combat/engagement';
import { wfrpState, withWfrpState } from '../state';

import type { TurnHook, TurnHookCtx } from '@/lib/utils/rules/systems/types';

/** Each round start wears the attack journal down: an engagement untouched for a whole round lapses (p163) */
export const wfrpEngagementAge: TurnHook<TurnHookCtx> = ({ participants }) => ({
    participants: participants.map((p) => {
        const journal = wfrpState(p).engagedWith;

        if (!journal) return p;

        const aged = Object.fromEntries(
            Object.entries(journal).flatMap(([id, age]) => {
                const left = Math.min(age, ENGAGEMENT_FRESH) - 1;

                return left > 0 ? [[id, left]] : [];
            })
        );

        return withWfrpState(p, {
            engagedWith: Object.keys(aged).length > 0 ? aged : undefined,
        });
    }),
    messages: [],
});
