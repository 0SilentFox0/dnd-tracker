import { defineTool } from './define';
import { readAlias } from './read-alias';

import {
    readReferenceInput,
    searchReferenceInput,
} from '@/lib/server/assistant/reads/reference';

export const searchReferenceTool = defineTool({
    name: 'search_reference',
    scopes: ['content:read'],
    title: 'Reference search',
    description:
        'Search the campaign reference by name: units, spells, races, skills, artifacts. Returns id and name; use read_reference for details.',
    input: searchReferenceInput,
    handler: readAlias('reference.search'),
});

export const readReferenceTool = defineTool({
    name: 'read_reference',
    scopes: ['content:read'],
    title: 'Reference entry',
    description:
        'Full reference entry (unit stats and abilities, spell effects, race traits, skill or artifact description) by kind and id.',
    input: readReferenceInput,
    handler: readAlias('reference.read'),
});
