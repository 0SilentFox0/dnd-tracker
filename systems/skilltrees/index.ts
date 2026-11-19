import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

export const SKILLTREES_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    stats: { columns: [{ owns: ['personalSkillId'] }] },
}));
