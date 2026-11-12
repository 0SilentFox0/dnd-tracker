import { reactionBlocker } from './reaction';

import type { RuleSystemReactions } from '@/lib/utils/rules/systems/types';

export { d20ProvokedOpportunity } from './provoked';

export const D20_REACTIONS: RuleSystemReactions = { blocker: reactionBlocker };
