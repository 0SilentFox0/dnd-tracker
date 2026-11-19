import { d20RegenWake } from '../regen-down';
import { d20DropStalePendingCast } from './on-turn-end';

import type { RuleSystemTurn } from '@/lib/utils/rules/systems/types';

export const D20_TURN: RuleSystemTurn = {
    onSkippedTurn: [d20RegenWake],
    onTurnEnd: [d20DropStalePendingCast],
};
