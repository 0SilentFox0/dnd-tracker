import { z } from 'zod';

import type { SectionsContribution } from '@/lib/utils/rules/sections';

declare module '@/lib/utils/rules/section-shapes' {
    interface OutOfCombatRulesExtensions {
        inspiration: boolean;
    }
}

export const INSPIRATION_SECTIONS: SectionsContribution = {
    extend: {
        outOfCombat: { inspiration: { schema: z.boolean(), default: false } },
    },
};
