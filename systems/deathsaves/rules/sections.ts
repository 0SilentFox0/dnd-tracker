import { sectionItems } from '@/lib/utils/rules/section-items';
import type { SectionsContribution } from '@/lib/utils/rules/sections';

export const DEATHSAVES_SECTIONS: SectionsContribution = {
    sections: {
        deathSaves: {
            owner: 'deathsaves',
            mechanic: true,
            items: sectionItems('deathSaves'),
        },
    },
};
