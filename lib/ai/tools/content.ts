import { z } from 'zod';

import { aliasHandler } from './alias-handler';
import { defineTool } from './define';

import { SYNC_SCOPES } from '@/lib/constants/source-sync';
import { KINDS, SCHEMA_TARGETS } from '@/lib/server/content/schema-targets';

const kindSchema = z.enum(KINDS);

const DEFAULT_LIMIT = 20;

export const contentKindsTool = defineTool({
    name: 'content_kinds',
    title: 'Campaign content kinds',
    description:
        'List of content kinds you can manage (units, races, spells, skills, artifacts…): name, description, list fields and available operations. Also: abilities, rules (campaign rules), skill-tree (race skill tree). Start here.',
    scopes: ['content:read'],
    input: z.strictObject({}),
    handler: aliasHandler('content_kinds'),
});

export const contentSchemaTool = defineTool({
    name: 'content_schema',
    title: 'Content JSON schema',
    description:
        'JSON schema of the create/update body for a content kind (or "abilities", "rules", "skill-tree"). Call before writing through assistant_action (content.<kind>.create / content.<kind>.update). For abilities: kind "abilities", and the schema of a specific effect comes from effectKind.',
    scopes: ['content:read'],
    input: z.strictObject({
        kind: z.enum(SCHEMA_TARGETS),
        op: z.enum(['create', 'update']).optional(),
        effectKind: z.string().max(100).optional(),
    }),
    handler: aliasHandler('content_schema'),
});

export const contentListTool = defineTool({
    name: 'content_list',
    title: 'Content list',
    description:
        'A page of records of a content kind: { total, offset, items: [{ id, name, …short fields }] }. Full record data: content_get. The query filter depends on the kind (e.g. skills: { mainSkillId }). For more than 50 records use offset.',
    scopes: ['content:read'],
    input: z.strictObject({
        kind: kindSchema,
        query: z
            .record(z.string().max(60), z.string().max(200))
            .refine((q) => Object.keys(q).length <= 10)
            .optional(),
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).optional(),
    }),
    handler: aliasHandler('content_list'),
});

export const contentGetTool = defineTool({
    name: 'content_get',
    title: 'Content record',
    description: 'Full record by id (take the id from content_list).',
    scopes: ['content:read'],
    input: z.strictObject({ kind: kindSchema, id: z.string().min(1).max(200) }),
    handler: aliasHandler('content_get'),
});

export const getRulesTool = defineTool({
    name: 'get_rules',
    title: 'Campaign rules',
    description:
        'Full set of campaign rules (ruleset) with default values, plus composition (active base and rule modules). Schema: content_schema(kind: "rules").',
    scopes: ['content:read'],
    input: z.strictObject({}),
    handler: aliasHandler('get_rules'),
});

export const getSkillTreeTool = defineTool({
    name: 'get_skill_tree',
    title: 'Race skill tree',
    description:
        'Skill tree of a race by its name (race): { id, race, skills }. References ids of main skills and library skills. Schema: content_schema(kind: "skill-tree").',
    scopes: ['content:read'],
    input: z.strictObject({ race: z.string().min(1).max(200) }),
    handler: aliasHandler('get_skill_tree'),
});

export const sourceDiffTool = defineTool({
    name: 'source_diff',
    title: 'Campaign source changes',
    description:
        'What changed in the template (or campaign) this campaign was created from: items with scope (table, rules or settings), key, name, status (new | updated | conflict | deletedInSource | deletedLocally), changedFields, sourceHash, requires. To apply, pass scope, key, sourceHash and status to assistant_action (source.apply). Paged: scope narrows, offset/limit (default 20, up to 50) page through; total is the number of items, counts is per scope, nextOffset is where to continue (null = end).',
    scopes: ['content:read'],
    input: z.strictObject({
        scope: z.enum(SYNC_SCOPES).optional(),
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(50).default(DEFAULT_LIMIT),
    }),
    handler: aliasHandler('source_diff'),
});

export const CONTENT_TOOLS = [
    contentKindsTool,
    contentSchemaTool,
    contentListTool,
    contentGetTool,
    getRulesTool,
    getSkillTreeTool,
    sourceDiffTool,
];

// T14 connects these aliases together with trusted caller identity and catalog.
export { dispatchContentAlias } from '@/lib/server/assistant/actions/content-aliases';
