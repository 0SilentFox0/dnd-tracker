import type { z } from 'zod';

import {
    itemsFromShape,
    type SectionsContribution,
} from '@/lib/utils/rules/sections';
import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';
import { AdvancementRulesSchema } from '@/systems/wfrp/rules/advancement/schema';
import { EditionRulesSchema } from '@/systems/wfrp/rules/edition/schema';
import { TablesRulesSchema } from '@/systems/wfrp/rules/tables/schema';

declare module '@/lib/utils/rules/section-shapes' {
    interface RulesetExtensions {
        advancement: z.output<typeof AdvancementRulesSchema>;
        tables: z.output<typeof TablesRulesSchema>;
        edition: z.output<typeof EditionRulesSchema>;
    }
}

export const WFRP_SECTIONS: SectionsContribution = {
    sections: {
        advancement: {
            owner: 'wfrp',
            mechanic: true,
            items: itemsFromShape(
                AdvancementRulesSchema.shape as never,
                DEFAULT_ADVANCEMENT_RULES
            ),
        },
        edition: {
            owner: 'wfrp',
            mechanic: true,
            items: itemsFromShape(EditionRulesSchema.shape as never, {
                preset: 'legacy',
                helplessKills: false,
            }),
        },
        tables: {
            owner: 'wfrp',
            mechanic: true,
            playerHidden: true,
            items: itemsFromShape(TablesRulesSchema.shape as never, {}),
            merge: (current, patch) => ({
                next: Object.fromEntries(
                    Object.entries({ ...current, ...patch }).filter(
                        ([, rows]) => rows !== null
                    )
                ),
            }),
        },
    },
};
