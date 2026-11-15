import { d20LairRoundStart } from './rules/round-start';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const LAIR_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    combat: { turn: { onRoundStart: [d20LairRoundStart] } },
}));
