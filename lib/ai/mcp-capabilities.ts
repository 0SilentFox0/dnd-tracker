import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

import type { AiToolContext } from '@/lib/ai/tools/define';
import { hasScope } from '@/lib/constants/ai';
import { prisma } from '@/lib/db';
import { authorizeAssistant } from '@/lib/server/assistant/authorize';
import { listPages } from '@/lib/server/scenario/page-store';
import { listWorldMaps } from '@/lib/server/world/map-store';

const RESOURCE_PAGE_SIZE = 100;

const RESOURCE_TEXT_MAX = 18_000;

const text = (value: unknown, max = 4000) =>
    typeof value === 'string' ? value.slice(0, max) : '';

function resourceText(value: unknown) {
    const serialized = JSON.stringify(value);

    return serialized.length <= RESOURCE_TEXT_MAX
        ? serialized
        : JSON.stringify({
              truncated: true,
              message: 'Use the campaign tools for complete, paginated data.',
          });
}

function registerResource(
    server: McpServer,
    name: string,
    uri: string,
    title: string,
    description: string,
    read: (uri: URL) => Promise<unknown>
) {
    server.registerResource(
        name,
        uri,
        { title, description, mimeType: 'application/json' },
        async (requestedUri) => ({
            contents: [
                {
                    uri: requestedUri.href,
                    mimeType: 'application/json',
                    text: resourceText(await read(requestedUri)),
                },
            ],
        })
    );
}

export function registerMcpCapabilities(
    server: McpServer,
    context: AiToolContext
): void {
    const caller = context.caller;

    if (
        !caller ||
        caller.actor.campaignId !== context.campaignId ||
        caller.actor.userId !== context.userId ||
        caller.actor.via !== 'token' ||
        caller.channel !== 'mcp'
    )
        return;

    if (hasScope(context.scopes, 'campaign:read')) {
        registerResource(
            server,
            'campaign_brief',
            `dnd://campaign/${encodeURIComponent(context.campaignId)}/brief`,
            'Campaign brief',
            'Campaign name, description, and DM instructions.',
            async () => {
                await authorizeAssistant(
                    caller,
                    { access: 'dm', scope: 'campaign:read' },
                    'prepare'
                );

                const row = await prisma.campaign.findUnique({
                    where: { id: context.campaignId },
                    select: {
                        name: true,
                        description: true,
                        aiInstructions: true,
                    },
                });

                return row
                    ? {
                          name: text(row.name, 200),
                          description: text(row.description),
                          instructions: text(row.aiInstructions),
                      }
                    : { error: 'Campaign not found' };
            }
        );
    }

    if (hasScope(context.scopes, 'scenario:read')) {
        registerResource(
            server,
            'scenario_index',
            `dnd://campaign/${encodeURIComponent(context.campaignId)}/scenario-index`,
            'Scenario index',
            'First page of the campaign scenario pages; use scenario tools for search and full content.',
            async () => {
                await authorizeAssistant(
                    caller,
                    { access: 'dm', scope: 'scenario:read' },
                    'prepare'
                );

                const pages = await listPages(context.campaignId);

                const items = pages
                    .slice(0, RESOURCE_PAGE_SIZE)
                    .map(({ id, title, kind, arc, status }) => ({
                        id,
                        title: text(title, 300),
                        kind,
                        arc,
                        status,
                    }));

                return {
                    items,
                    total: pages.length,
                    truncated: pages.length > items.length,
                    nextStep:
                        pages.length > items.length
                            ? 'Use list_scenario_pages for complete results.'
                            : undefined,
                };
            }
        );
    }

    if (hasScope(context.scopes, 'world:read')) {
        registerResource(
            server,
            'world_map_index',
            `dnd://campaign/${encodeURIComponent(context.campaignId)}/world-map-index`,
            'World map index',
            'World maps in the current campaign; use world_map_get for markers and positions.',
            async () => {
                await authorizeAssistant(
                    caller,
                    { access: 'dm', scope: 'world:read' },
                    'prepare'
                );

                const maps = await listWorldMaps(context.campaignId);

                return {
                    items: maps.slice(0, RESOURCE_PAGE_SIZE),
                    total: maps.length,
                    truncated: maps.length > RESOURCE_PAGE_SIZE,
                };
            }
        );
    }

    if (
        hasScope(context.scopes, 'campaign:read') &&
        hasScope(context.scopes, 'scenario:read')
    ) {
        server.registerPrompt(
            'prepare_session',
            {
                title: 'Prepare a session',
                description:
                    'Use the campaign and scenario tools to prepare a focused DM session.',
                argsSchema: z.strictObject({
                    goal: z
                        .string()
                        .max(1000)
                        .default('Prepare the next session'),
                }),
            },
            ({ goal }) => ({
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `${goal}\n\nRead the campaign brief and scenario index. Ask for missing context before inventing canon. Return a concise session outline with likely scenes, open threads, and preparation questions.`,
                        },
                    },
                ],
            })
        );
    }

    if (hasScope(context.scopes, 'world:read')) {
        server.registerPrompt(
            'summarize_world_travel',
            {
                title: 'Summarize world travel',
                description:
                    'Summarize recent travel and map changes for the DM.',
                argsSchema: z.strictObject({
                    focus: z.string().max(500).default('Recent travel'),
                }),
            },
            ({ focus }) => ({
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `Focus: ${focus}. Read the world travel log and relevant map details. Summarize where the party went, notable places entered, rests, and unresolved travel choices. Separate recorded facts from suggestions.`,
                        },
                    },
                ],
            })
        );
    }

    if (hasScope(context.scopes, 'scenario:read')) {
        server.registerPrompt(
            'prepare_scene',
            {
                title: 'Prepare a scene',
                description:
                    "Prepare a playable scene using the DM's campaign material.",
                argsSchema: z.strictObject({
                    pageId: z.string().min(1).max(200),
                    direction: z
                        .string()
                        .max(1000)
                        .default('Prepare this scene for play'),
                }),
            },
            ({ pageId, direction }) => ({
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `${direction}. Read scenario page ${pageId} and relevant campaign references. Preserve the written canon, distinguish DM notes from player-facing material, and return a compact run sheet with opening, beats, NPC motives, and contingencies.`,
                        },
                    },
                ],
            })
        );
    }
}
