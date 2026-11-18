import { defineTool } from './define';
import { readAlias } from './read-alias';

import 'server-only';
import { battleStateInput } from '@/lib/server/assistant/reads/battle';
import { withSystemNotes } from '@/lib/server/systems/lookup';

export const getBattleStateTool = defineTool({
    name: 'get_battle_state',
    scopes: ['battles:read'],
    title: 'Battle state',
    get description() {
        return withSystemNotes(
            'State of a battle (the active one when battleId is omitted): round, turn order, participants with side, HP, AC, status, and the last events.',
            'get_battle_state'
        );
    },
    input: battleStateInput,
    handler: readAlias('battles.state'),
});
