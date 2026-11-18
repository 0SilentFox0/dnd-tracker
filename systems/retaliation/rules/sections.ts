import { z } from 'zod';

import type { SectionsContribution } from '@/lib/utils/rules/sections';

declare module '@/lib/utils/rules/section-shapes' {
    interface ActionsRulesExtensions {
        retaliation?: boolean;
    }
}

export const RETALIATION_SECTIONS: SectionsContribution = {
    extend: {
        actions: { retaliation: { schema: z.boolean(), default: true } },
    },
};
