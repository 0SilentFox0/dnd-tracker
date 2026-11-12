import { retaliationAfterAttack } from './rules/after-attack';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const RETALIATION_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: { afterAttack: [retaliationAfterAttack] },
}));
