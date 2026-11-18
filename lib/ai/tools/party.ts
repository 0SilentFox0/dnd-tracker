import { defineTool } from './define';
import { readAlias } from './read-alias';

import 'server-only';
import '@/lib/server/systems/registry';
import {
    partyInput,
    readCharacterInput,
} from '@/lib/server/assistant/reads/party';
import { withSystemNotes } from '@/lib/server/systems/lookup';

export const getPartyTool = defineTool({
    name: 'get_party',
    scopes: ['characters:read'],
    title: 'Party',
    get description() {
        return withSystemNotes(
            'Player heroes of the campaign: id, name, level, class, race, AC, DM notes.',
            'get_party'
        );
    },
    input: partyInput,
    handler: readAlias('characters.party'),
});

export const readCharacterTool = defineTool({
    name: 'read_character',
    scopes: ['characters:read'],
    title: 'Character sheet',
    get description() {
        return withSystemNotes(
            'Full character sheet (player hero or NPC hero): ability scores, AC, HP-related stats, goals, DM notes and the hero biography from the scenario.',
            'read_character'
        );
    },
    input: readCharacterInput,
    handler: readAlias('characters.sheet-read'),
});
