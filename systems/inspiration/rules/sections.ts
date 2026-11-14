import { sectionItems } from '@/lib/utils/rules/section-items';
import type { SectionsContribution } from '@/lib/utils/rules/sections';

export const INSPIRATION_SECTIONS: SectionsContribution = {
    extend: { outOfCombat: sectionItems('outOfCombat', ['inspiration']) },
};
