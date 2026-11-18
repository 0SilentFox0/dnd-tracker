import { beforeEach, expect, it, vi } from 'vitest';

const dispatch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
    prisma: { assistantIntent: { findFirst: vi.fn(async () => null) } },
}));
vi.mock('@/lib/server/assistant/execute', () => ({
    dispatchAction: dispatch,
    rejectIntent: vi.fn(),
}));
import { type AiToolContext, runTool } from '../define';
import { proposeScenarioEditTool } from '../propose';

const ctx: AiToolContext = {
    campaignId: 'c',
    userId: 'dm',
    scopes: ['scenario:write'],
    threadId: 't',
    caller: {
        actor: {
            campaignId: 'c',
            userId: 'dm',
            isDM: true,
            via: 'session',
            scopes: null,
        },
        tokenId: null,
        channel: 'chat',
        threadId: 't',
        locale: 'uk' as const,
    },
    locale: 'uk' as const,
};

beforeEach(() => dispatch.mockReset());
it('stages a canonical review rather than independently writing an applicable proposal', async () => {
    dispatch.mockResolvedValue({
        kind: 'pending',
        intent: { id: 'i', status: 'pending' },
        reviewUrl: '/review',
    });

    const input = {
        pageId: 'p',
        summary: 'Edit',
        ops: [{ op: 'renameSection', sectionId: 's', title: 'Title' }],
    };

    const out = JSON.parse(await runTool(proposeScenarioEditTool, ctx, input));

    expect(out).toMatchObject({ version: 2, data: { kind: 'pending' } });
    expect(dispatch).toHaveBeenCalledWith(
        ctx.caller,
        expect.objectContaining({ actionId: 'scenario.propose-edit', input }),
        undefined
    );
});
it('malformed ops fail before dispatch', async () => {
    expect(
        JSON.parse(
            await runTool(proposeScenarioEditTool, ctx, {
                pageId: 'p',
                summary: 'x',
                ops: [{ op: 'writeSQL' }],
            })
        )
    ).toMatchObject({ kind: 'error', error: { status: 400 } });
    expect(dispatch).not.toHaveBeenCalled();
});
it('a client requestId is the idempotency key and is not part of the action input', async () => {
    dispatch.mockResolvedValue({
        kind: 'pending',
        intent: {},
        reviewUrl: '/r',
    });

    const input = {
        pageId: 'p',
        summary: 'Edit',
        ops: [{ op: 'renameSection', sectionId: 's', title: 'Title' }],
    };

    await runTool(proposeScenarioEditTool, ctx, { ...input, requestId: 'k-1' });
    await runTool(proposeScenarioEditTool, ctx, { ...input, requestId: 'k-1' });

    expect(dispatch.mock.calls.map((c) => c[1])).toEqual([
        expect.objectContaining({ requestId: 'k-1', input }),
        expect.objectContaining({ requestId: 'k-1', input }),
    ]);
});
it('an MCP retry without requestId reuses the derived key', async () => {
    dispatch.mockResolvedValue({
        kind: 'pending',
        intent: {},
        reviewUrl: '/r',
    });

    const input = {
        pageId: 'p',
        summary: 'Edit',
        ops: [{ op: 'renameSection', sectionId: 's', title: 'Title' }],
    };

    const keyed = { ...ctx, requestKeys: ['mcpd_cur', 'mcpd_prev'] as const };

    await runTool(proposeScenarioEditTool, keyed, input);
    await runTool(proposeScenarioEditTool, keyed, input);

    expect(dispatch.mock.calls.map((c) => c[1].requestId)).toEqual([
        'mcpd_cur',
        'mcpd_cur',
    ]);
});
