import { z } from 'zod';

import type { SectionsContribution } from '@/lib/utils/rules/sections';

declare module '@/lib/utils/rules/section-shapes' {
    interface ActionsRulesExtensions {
        opportunityAttacks?: boolean;
    }
}

export const OPPORTUNITY_SECTIONS: SectionsContribution = {
    extend: {
        actions: {
            opportunityAttacks: { schema: z.boolean(), default: true },
        },
    },
};
