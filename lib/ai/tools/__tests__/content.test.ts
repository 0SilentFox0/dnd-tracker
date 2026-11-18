import { beforeEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/server/assistant/execute', () => ({
    dispatchAction: f.dispatch,
    rejectIntent: vi.fn(),
}));
import { CONTENT_TOOLS } from '../content';
import { type AiToolContext, runTool } from '../define';
import { toolsFor } from '../index';

const ctx: AiToolContext = {
    campaignId: 'c',
    userId: 'dm',
    scopes: ['content:write'],
    threadId: null,
    caller: {
        actor: {
            campaignId: 'c',
            userId: 'dm',
            isDM: true,
            via: 'token',
            scopes: ['content:write'],
        },
        tokenId: 'verified',
        channel: 'mcp',
        threadId: null,
        locale: 'uk' as const,
    },
    locale: 'uk' as const,
};

function toolOf(name: string) {
    const found = CONTENT_TOOLS.find((t) => t.name === name);

    if (!found) throw new Error(name);

    return found;
}

beforeEach(() => {
    f.dispatch.mockReset();
    f.dispatch.mockResolvedValue({
        kind: 'pending',
        intent: { id: 'i', status: 'pending' },
        reviewUrl: '/review',
    });
});
it.each([
    ['content_kinds', {}, 'content.kinds'],
    ['content_schema', { kind: 'units' }, 'content.schema'],
    ['content_list', { kind: 'units', offset: 50 }, 'content.units.list'],
    ['content_get', { kind: 'units', id: 'u' }, 'content.units.get'],
    ['get_rules', {}, 'rules.get'],
    ['get_skill_tree', { race: 'Human' }, 'skill-trees.get'],
    ['source_diff', { scope: 'units', offset: 2, limit: 1 }, 'source.diff'],
] as const)(
    '%s uses the canonical dispatcher and returns pending metadata',
    async (name, input, actionId) => {
        const output = JSON.parse(await runTool(toolOf(name), ctx, input));

        expect(output).toMatchObject({
            version: 2,
            kind: 'result',
            data: { kind: 'pending', intent: { status: 'pending' } },
        });
        expect(f.dispatch).toHaveBeenCalledWith(
            ctx.caller,
            expect.objectContaining({ actionId }),
            undefined
        );
        expect(JSON.stringify(output)).not.toContain('verified');
    }
);
it('missing caller cannot become a token actor', async () => {
    const out = JSON.parse(
        await runTool(
            toolOf('content_get'),
            { ...ctx, caller: undefined },
            { kind: 'units', id: 'u' }
        )
    );

    expect(out).toMatchObject({ kind: 'error', error: { status: 403 } });
    expect(f.dispatch).not.toHaveBeenCalled();
});
it('filters content writes while keeping read and generic discovery', () => {
    const names = toolsFor(['content:read']).map((t) => t.name);

    expect(names).toContain('content_list');
    expect(names).toContain('assistant_capabilities');
    expect(names).not.toContain('content_create');
    expect(names).not.toContain('source_apply');
});
it('content writes are not exposed as separate tools', () => {
    const names = CONTENT_TOOLS.map((t) => t.name);

    for (const write of [
        'content_create',
        'content_update',
        'content_delete',
        'content_import',
        'update_rules',
        'save_skill_tree',
        'source_apply',
        'source_apply_safe',
    ])
        expect(names).not.toContain(write);
});
