import { z } from 'zod';

import {
    itemsFromShape,
    type SectionsContribution,
} from '@/lib/utils/rules/sections';

export const DeathSavesRulesSchema = z.strictObject({
    enabled: z.boolean(),
    unitsDieAtZero: z.boolean(),
});

export const DEFAULT_DEATH_SAVES_RULES: z.output<typeof DeathSavesRulesSchema> =
    { enabled: false, unitsDieAtZero: true };

declare module '@/lib/utils/rules/section-shapes' {
    interface RulesetExtensions {
        deathSaves: z.output<typeof DeathSavesRulesSchema>;
    }
}

export const DEATHSAVES_SECTIONS: SectionsContribution = {
    sections: {
        deathSaves: {
            owner: 'deathsaves',
            mechanic: true,
            labels: 'rulesDeathSaves',
            items: itemsFromShape(
                DeathSavesRulesSchema.shape as never,
                DEFAULT_DEATH_SAVES_RULES
            ),
        },
    },
};
