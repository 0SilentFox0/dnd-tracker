import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerMcpTools } from '@/lib/ai/tools';
import { assistantActionTool } from '@/lib/ai/tools/assistant';
import type { AiToolContext } from '@/lib/ai/tools/define';
import { mcpDerivedKeys } from '@/lib/ai/tools/request-key';
import { dispatchAction } from '@/lib/server/assistant/execute';

vi.mock('server-only', () => ({}));

const used = vi.hoisted(() => ({ ids: new Set<string>() }));

vi.mock('@/lib/db', () => ({
    prisma: {
        assistantIntent: {
            findFirst: vi.fn(async ({ where }) =>
                used.ids.has(where.requestId) ? { id: 'x' } : null
            ),
        },
    },
}));
vi.mock('@/lib/server/assistant/execute', () => ({
    dispatchAction: vi.fn(async () => ({
        kind: 'pending',
        intent: { id: 'i', status: 'pending' },
        reviewUrl: '/r',
    })),
}));

const base: AiToolContext = {
    campaignId: 'c',
    userId: 'u',
    scopes: ['content:write'],
    threadId: null,
    locale: 'en',
    caller: {
        actor: {
            campaignId: 'c',
            userId: 'u',
            isDM: true,
            via: 'token',
            scopes: ['content:write'],
        },
        channel: 'mcp',
        threadId: null,
        tokenId: 'tok',
        locale: 'en',
    },
};

type Handler = (
    input: unknown,
    extra: { mcpReq: { id: number | string } }
) => Promise<{
    structuredContent: { kind: string };
    content: Array<{ text: string }>;
    isError: boolean;
}>;

function register() {
    const registered: Record<string, { config: unknown; cb: Handler }> = {};

    registerMcpTools(
        {
            registerTool: (name: string, config: unknown, cb: Handler) => {
                registered[name] = { config, cb };
            },
        } as never,
        [assistantActionTool],
        base
    );

    return registered.assistant_action;
}

const payload = { actionId: 'content.units.create', input: { data: {} } };

const keys = () =>
    vi.mocked(dispatchAction).mock.calls.map((c) => c[1].requestId);

beforeEach(() => vi.mocked(dispatchAction).mockClear());

describe('MCP write idempotency', () => {
    beforeEach(() => used.ids.clear());

    it('without a client requestId identical calls share a derived key, whatever the JSON-RPC id', async () => {
        const { cb } = register();

        await cb(payload, { mcpReq: { id: 7 } });
        await cb(payload, { mcpReq: { id: 8 } });

        const [first, second] = keys();

        expect(first).toBe(second);
        expect(first).toBe(
            mcpDerivedKeys('tok', 'assistant_action', payload)[0]
        );
        expect(first).toMatch(/^[a-zA-Z0-9_-]{1,100}$/);
    });

    it('arguments key order does not change the key', () => {
        const a = mcpDerivedKeys('tok', 't', { x: 1, y: { a: 1, b: 2 } }, 5);

        const b = mcpDerivedKeys('tok', 't', { y: { b: 2, a: 1 }, x: 1 }, 5);

        expect(a).toEqual(b);
    });

    it('a different token, tool or arguments gives a different key', () => {
        const [a] = mcpDerivedKeys('tok', 'assistant_action', payload, 5);

        expect(
            mcpDerivedKeys('other', 'assistant_action', payload, 5)[0]
        ).not.toBe(a);
        expect(
            mcpDerivedKeys('tok', 'propose_scenario_edit', payload, 5)[0]
        ).not.toBe(a);
        expect(
            mcpDerivedKeys(
                'tok',
                'assistant_action',
                { ...payload, input: 1 },
                5
            )[0]
        ).not.toBe(a);
    });

    it('the same call after the dedupe window gets a new key; the previous bucket key is exposed for boundary retries', () => {
        const w = 600_000;

        const [now, prev] = mcpDerivedKeys('tok', 't', payload, 10 * w + 1);

        const [later, laterPrev] = mcpDerivedKeys(
            'tok',
            't',
            payload,
            12 * w + 1
        );

        expect(later).not.toBe(now);
        expect(laterPrev).not.toBe(now);
        expect(mcpDerivedKeys('tok', 't', payload, 11 * w + 1)[1]).toBe(now);
        expect(prev).not.toBe(now);
    });

    it('reuses the previous bucket key when its intent already exists (retry across a boundary)', async () => {
        const { cb } = register();

        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(600_000 * 10 + 1000);

        await cb(payload, { mcpReq: { id: 1 } });

        const [first] = keys();

        vi.setSystemTime(600_000 * 11 + 1000);
        used.ids.add(first);
        await cb(payload, { mcpReq: { id: 2 } });
        vi.useRealTimers();

        expect(keys()[1]).toBe(first);
    });

    it('the client requestId wins over the derived key', async () => {
        const { cb } = register();

        await cb(
            { ...payload, requestId: 'client-key-1' },
            { mcpReq: { id: 1 } }
        );
        await cb(
            { ...payload, requestId: 'client-key-1' },
            { mcpReq: { id: 2 } }
        );

        expect(keys()).toEqual(['client-key-1', 'client-key-1']);
    });

    it('reads get no derived key', async () => {
        const registered: Record<string, { cb: Handler }> = {};

        registerMcpTools(
            {
                registerTool: (name: string, _c: unknown, cb: Handler) => {
                    registered[name] = { cb };
                },
            } as never,
            [{ ...assistantActionTool, effect: 'read' }],
            base
        );

        await registered.assistant_action.cb(payload, { mcpReq: { id: 1 } });

        expect(keys()[0]).not.toMatch(/^mcpd_/);
    });

    it('rejects a malformed client requestId before dispatch', async () => {
        const { cb } = register();

        const res = await cb(
            { ...payload, requestId: 'bad key!' },
            { mcpReq: { id: 1 } }
        );

        expect(res.isError).toBe(true);
        expect(dispatchAction).not.toHaveBeenCalled();
    });
});

describe('MCP structured output', () => {
    it('advertises an object outputSchema and mirrors the text envelope', async () => {
        const { config, cb } = register();

        expect(config).toMatchObject({ outputSchema: expect.anything() });

        const res = await cb(payload, { mcpReq: { id: 1 } });

        expect(res.structuredContent).toMatchObject({
            version: 2,
            kind: 'result',
        });
        expect(JSON.parse(res.content[0].text)).toEqual(res.structuredContent);
        expect(res.isError).toBe(false);
    });

    it('errors carry structuredContent with kind error', async () => {
        const { cb } = register();

        const res = await cb({ actionId: '' }, { mcpReq: { id: 1 } });

        expect(res.structuredContent).toMatchObject({
            kind: 'error',
            error: { code: 'INVALID_INPUT', status: 400 },
        });
        expect(res.isError).toBe(true);
    });
});
