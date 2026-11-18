import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerMcpTools } from '@/lib/ai/tools';
import { assistantActionTool } from '@/lib/ai/tools/assistant';
import type { AiToolContext } from '@/lib/ai/tools/define';
import { mcpRequestKey } from '@/lib/ai/tools/request-key';
import { dispatchAction } from '@/lib/server/assistant/execute';

vi.mock('server-only', () => ({}));
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
    it('a retry with the same JSON-RPC id and arguments reuses the request key', async () => {
        const { cb } = register();

        await cb(payload, { mcpReq: { id: 7 } });
        await cb(payload, { mcpReq: { id: 7 } });

        const [first, second] = keys();

        expect(first).toBe(second);
        expect(first).toBe(mcpRequestKey('tok', 7, 'assistant_action', payload));
        expect(first).toMatch(/^[a-zA-Z0-9_-]{1,100}$/);
    });

    it('a different id, token or arguments gives a different key', () => {
        const a = mcpRequestKey('tok', 7, 'assistant_action', payload);

        expect(mcpRequestKey('tok', 8, 'assistant_action', payload)).not.toBe(a);
        expect(mcpRequestKey('other', 7, 'assistant_action', payload)).not.toBe(a);
        expect(
            mcpRequestKey('tok', 7, 'assistant_action', { ...payload, input: 1 })
        ).not.toBe(a);
    });

    it('the client requestId wins over the JSON-RPC derived key', async () => {
        const { cb } = register();

        await cb({ ...payload, requestId: 'client-key-1' }, { mcpReq: { id: 1 } });
        await cb({ ...payload, requestId: 'client-key-1' }, { mcpReq: { id: 2 } });

        expect(keys()).toEqual(['client-key-1', 'client-key-1']);
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
