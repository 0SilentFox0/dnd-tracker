import { heroDicePart } from './rules/dice';
import { heroMaxHp } from './rules/max-hp';

import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const HEROSCALING_MODULE = defineAddon<RuleSystemDefinition>((prev) => ({
    progression: { maxHp: heroMaxHp(prev.progression.maxHp) },
    participant: { fromCharacter: [heroDicePart] },
}));
