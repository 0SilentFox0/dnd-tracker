import { sectionItems } from '@/lib/utils/rules/section-items';
import type { SectionsContribution } from '@/lib/utils/rules/sections';

export const OPPORTUNITY_SECTIONS: SectionsContribution = {
    extend: { actions: sectionItems('actions', ['opportunityAttacks']) },
};
