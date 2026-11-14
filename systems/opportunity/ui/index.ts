import { OpportunityItem } from './OpportunityItem';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const OPPORTUNITY_MODULE_UI = defineAddon<SystemUi>(() => ({
    rulesItems: { 'actions.opportunityAttacks': OpportunityItem },
}));
