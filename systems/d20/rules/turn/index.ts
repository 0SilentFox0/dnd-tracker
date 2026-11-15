import { d20DropStalePendingCast } from './on-turn-end';

import type { RuleSystemTurn } from '@/lib/utils/rules/systems/types';

export const D20_TURN: RuleSystemTurn = {
    onTurnEnd: [d20DropStalePendingCast],
};
