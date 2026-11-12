import { defineAddon } from '@/lib/utils/rules/systems/compose';
import type {
    LevelResetPart,
    RuleSystemDefinition,
} from '@/lib/utils/rules/systems/types';

const resetTreeOnLevelDown: LevelResetPart = ({ from, to }) =>
    to < from ? { skillTreeProgress: {} } : {};

export const SKILLTREES_MODULE = defineAddon<RuleSystemDefinition>(() => ({
    progression: { levelResets: [resetTreeOnLevelDown] },
    stats: { columns: [{ owns: ['personalSkillId'] }] },
}));
