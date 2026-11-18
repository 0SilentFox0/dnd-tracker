import { defineTool } from './define';
import { readAlias } from './read-alias';

import {
    findScenarioMentionsInput,
    listScenarioPagesInput,
    outlineScenarioPageInput,
    readScenarioPageInput,
    searchScenarioInput,
} from '@/lib/server/assistant/reads/scenario';

export const listScenarioPagesTool = defineTool({
    name: 'list_scenario_pages',
    scopes: ['scenario:read'],
    title: 'Scenario pages',
    description:
        'List all scenario pages of the campaign: id, kind (scene|hero), arc, title, status.',
    input: listScenarioPagesInput,
    handler: readAlias('scenario.pages-list'),
});

export const readScenarioPageTool = defineTool({
    name: 'read_scenario_page',
    scopes: ['scenario:read'],
    title: 'Read scenario page',
    description:
        'Read a scenario page as the scenario markdown dialect: sections with [sectionId], rows with ids, story and DM notes. ||text|| is a DM-only secret. Pass sectionId to read one section. Offsets are page-absolute (same as outline @N); with sectionId the read stops at the section end. Long pages come in chunks: the last line [next offset N of TOTAL] gives the offset for the next call; [row split] marks one oversize row cut in the middle.',
    input: readScenarioPageInput,
    handler: readAlias('scenario.page-read'),
});

export const outlineScenarioPageTool = defineTool({
    name: 'outline_scenario_page',
    scopes: ['scenario:read'],
    title: 'Scenario page outline',
    description:
        'Compact map of a scenario page: sections [id], row ids with story/notes sizes in characters, a short text start and the offset of each section/row for read_scenario_page. Use it first on a large page, then read only what you need.',
    input: outlineScenarioPageInput,
    handler: readAlias('scenario.page-outline'),
});

export const findScenarioMentionsTool = defineTool({
    name: 'find_scenario_mentions',
    scopes: ['scenario:read'],
    title: 'Find scenario mentions',
    description:
        "Find every occurrence of a name in scenario story and DM notes, in any grammatical form (matched by word stem). `forms` keep the text's capitalisation. linkMentions matches a capitalised form only at a capital letter: for names that are also common words (Hope, Rose) pass only capitalised forms. Returns hits {pageId, sectionId, rowId, field, snippet, forms, inMention} (inMention = already a mention chip) and the distinct forms found. Paginated: up to 100 hits per call (fewer when they are large); pass the returned nextOffset as offset for the next call until it is null. Searches the whole campaign unless pageId/sectionId is given.",
    input: findScenarioMentionsInput,
    handler: readAlias('scenario.mentions-find'),
});

export const searchScenarioTool = defineTool({
    name: 'search_scenario',
    scopes: ['scenario:read'],
    title: 'Scenario search',
    description:
        'Full-text search across all scenario pages (titles, stories, notes). Returns page, section and a snippet.',
    input: searchScenarioInput,
    handler: readAlias('scenario.text-search'),
});
