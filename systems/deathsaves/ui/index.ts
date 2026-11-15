import { DeathSaveBadge } from './battle/DeathSaveBadge';
import { DeathSavesSection } from './rules/DeathSavesSection';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const DEATHSAVES_MODULE_UI = defineAddon<SystemUi>(() => ({
    rulesSections: { deathSaves: DeathSavesSection },
    battle: { badges: [DeathSaveBadge] },
}));
