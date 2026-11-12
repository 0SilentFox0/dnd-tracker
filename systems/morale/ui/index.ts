import { MoraleField } from './MoraleField';
import { MoraleRow } from './MoraleRow';
import { MoraleSection } from './MoraleSection';

import type { SystemUi } from '@/components/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const MORALE_MODULE_UI = defineAddon<SystemUi>(() => ({
    rulesSections: { morale: MoraleSection },
    forms: { fields: [MoraleField] },
    sheet: { combatRows: [MoraleRow] },
}));
