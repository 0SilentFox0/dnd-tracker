import { z } from 'zod';

import {
    itemsFromShape,
    type SectionsContribution,
} from '@/lib/utils/rules/sections';

export const MoraleRulesSchema = z.strictObject({
    enabled: z.boolean(),
    cap: z.number().int().min(1).max(10),
});

export const DEFAULT_MORALE_RULES: z.output<typeof MoraleRulesSchema> = {
    enabled: true,
    cap: 3,
};

declare module '@/lib/utils/rules/section-shapes' {
    interface RulesetExtensions {
        morale: z.output<typeof MoraleRulesSchema>;
    }
}

export const MORALE_SECTIONS: SectionsContribution = {
    sections: {
        morale: {
            owner: 'morale',
            mechanic: true,
            labels: 'rulesMorale',
            items: itemsFromShape(
                MoraleRulesSchema.shape as never,
                DEFAULT_MORALE_RULES
            ),
        },
    },
};
