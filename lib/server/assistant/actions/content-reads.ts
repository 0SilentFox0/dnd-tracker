import { z } from 'zod';

import type { AssistantActionDef } from '../types';
import { jsonContent } from './content-snapshot';

import 'server-only';
import { getTranslator } from '@/lib/i18n/translator';
import { isKindActive } from '@/lib/server/content/kind-active';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';
import {
    EXTRA,
    KINDS,
    SCHEMA_TARGETS,
} from '@/lib/server/content/schema-targets';
import { contentSchema } from '@/lib/server/content/tool-schemas';
import { systemContent } from '@/lib/server/systems/registry';
import { NEED } from '@/lib/utils/api/need';

export function createContentReadActions(): AssistantActionDef[] {
    return [
        {
            id: 'content.kinds',
            title: 'Content kinds',
            description:
                'Kinds of content and the operations available for them',
            need: NEED.read('dm'),
            input: z.object({}),
            effect: 'read',
            execute: async (caller) => ({
                data: jsonContent({
                    kinds: (
                        await Promise.all(
                            KINDS.map(async (kind) =>
                                (await isKindActive(kind, caller.actor))
                                    ? kind
                                    : null
                            )
                        )
                    )
                        .filter((kind) => kind !== null)
                        .map((kind) => {
                            const r = CONTENT_RESOURCES[kind];

                            return {
                                kind,
                                label: r.label,
                                description: r.description,
                                listFields: r.listFields,
                                ops: [
                                    'list',
                                    'get',
                                    'create',
                                    'update',
                                    'delete',
                                    ...(r.removeAll ? ['delete-all'] : []),
                                ],
                            };
                        }),
                    extra: EXTRA,
                }),
                affected: [],
                warnings: [],
            }),
        },
        {
            id: 'content.schema',
            title: 'Content schema',
            description: 'Current create/update or abilities schema',
            need: NEED.read('dm'),
            input: z.object({
                kind: z.enum(SCHEMA_TARGETS),
                op: z.enum(['create', 'update']).optional(),
                effectKind: z.string().optional(),
            }),
            effect: 'read',
            execute: async (_caller, input) => ({
                data: jsonContent(
                    contentSchema(input as Parameters<typeof contentSchema>[0])
                ),
                affected: [],
                warnings: [],
            }),
        },
        ...Object.values(systemContent('readActions')),
        {
            id: 'content.media',
            title: 'Add media in the editor',
            description: 'The existing UI for icons and music files',
            need: NEED.write,
            input: z.object({
                kind: z.enum([
                    'artifacts',
                    ...Object.keys(systemContent('mediaKinds')),
                    'tracks',
                ] as [string, ...string[]]),
            }),
            effect: 'handoff',
            execute: async (caller, input) => ({
                href: `/campaigns/${caller.actor.campaignId}/dm/${(input as { kind: string }).kind === 'tracks' ? 'music' : (input as { kind: string }).kind}`,
                reason: (await getTranslator(caller.locale, 'assistant'))(
                    'handoffs.contentMedia'
                ),
            }),
        },
    ];
}
