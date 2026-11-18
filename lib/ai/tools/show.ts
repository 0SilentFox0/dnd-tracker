import { defineTool } from './define';
import { readAlias } from './read-alias';

import { showStateInput } from '@/lib/server/assistant/reads/show';

export const getShowStateTool = defineTool({
    name: 'get_show_state',
    scopes: ['show:read'],
    title: 'Current show',
    description:
        'What the players currently see on the show screen: deck, slide title and caption, battle call.',
    input: showStateInput,
    handler: readAlias('show.state'),
});
