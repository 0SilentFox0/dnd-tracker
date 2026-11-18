import { z } from 'zod';

import { readAction } from './define';

import 'server-only';
import { readLegacyBattleState } from '@/lib/server/battles/read-service';

export const battleStateInput = z.strictObject({
    battleId: z.string().min(1).max(200).optional(),
});

export const BATTLE_STATE_ACTION = readAction({
    id: 'battles.state',
    title: 'Battle state',
    description:
        'State of a battle (the active one when battleId is omitted): round, turn order, participants and the last events.',
    scope: 'battles:read',
    input: battleStateInput,
    run: (scope, { battleId }) => readLegacyBattleState(scope, battleId),
});
