import { NextResponse } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import '@/lib/server/systems/registry';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/utils/api/api-auth', () => ({ requireCampaignAccess: vi.fn() }));
vi.mock('@/systems/wfrp/server/draft/create-wfrp-draft', () => ({
    createWfrpDraft: vi.fn(async () => NextResponse.json({ wfrp: true })),
}));
vi.mock('@/lib/server/systems/lookup', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/lib/server/systems/lookup')>();

    return {
        ...actual,
        systemServerOf: (rules: Parameters<typeof actual.systemServerOf>[0]) =>
            rules.system.key === 'stub'
                ? ({} as ReturnType<typeof actual.systemServerOf>)
                : actual.systemServerOf(rules),
    };
});
vi.mock('@/lib/utils/rules/systems/lookup', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@/lib/utils/rules/systems/lookup')
        >();

    return {
        ...actual,
        ruleSystemOf: (rules: Parameters<typeof actual.ruleSystemOf>[0]) =>
            rules.system.key === 'stub'
                ? { ...actual.ruleSystemOf(WFRP_RULES), creation: undefined }
                : actual.ruleSystemOf(rules),
    };
});

import * as apiAuth from '@/lib/utils/api/api-auth';
import { createWfrpDraft } from '@/systems/wfrp/server/draft/create-wfrp-draft';

let createDraft: typeof import('../create-draft').createDraft;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    createDraft = (await import('../create-draft')).createDraft;
}, 30_000);

const as = (rules: object) =>
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
        userId: 'u1',
        campaign: { rules, members: [] },
    } as never);

const post = () =>
    createDraft(new Request('http://x', { method: 'POST', body: '{}' }), 'c1');

describe('createDraft system dispatch', () => {
    it('wfrp campaigns go to the wfrp handler', async () => {
        as(WFRP_RULES);

        expect(await (await post()).json()).toEqual({ wfrp: true });
        expect(createWfrpDraft).toHaveBeenCalled();
    });

    it('a system without a drafts slot and without d20 classes -> 409', async () => {
        as({
            ...DEFAULT_RULES,
            system: { ...DEFAULT_RULES.system, key: 'stub' },
        });

        const res = await post();

        expect(res.status).toBe(409);
    });
});
