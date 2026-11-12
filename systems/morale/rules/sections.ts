import { sectionItems } from '@/lib/utils/rules/section-items';
import type { SectionsContribution } from '@/lib/utils/rules/sections';

export const MORALE_SECTIONS: SectionsContribution = {
    sections: {
        morale: {
            owner: 'morale',
            mechanic: true,
            items: sectionItems('morale'),
        },
    },
};
