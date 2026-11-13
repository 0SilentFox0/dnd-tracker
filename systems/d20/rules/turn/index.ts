import { d20DeathSaveOnSkip } from '../death-saves/on-skipped-turn';
import { d20ResetState } from '../state-parts';
import { d20LairRoundStart } from './on-round-start';
import { d20DropStalePendingCast } from './on-turn-end';

import type { RuleSystemTurn } from '@/lib/utils/rules/systems/types';

export const D20_TURN: RuleSystemTurn = {
    resetState: [d20ResetState],
    onSkippedTurn: [d20DeathSaveOnSkip],
    onTurnEnd: [d20DropStalePendingCast],
    onRoundStart: [d20LairRoundStart],
};
