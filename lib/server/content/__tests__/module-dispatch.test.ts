import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
    const { contentDatabaseDouble } = await import(
        '@/lib/server/content/__tests__/database-double'
    );

    return { prisma: contentDatabaseDouble({}) };
});
vi.mock('server-only', () => ({}));
vi.mock('@/lib/ai/api-tokens', async (orig) => ({
    ...(await orig<typeof import('@/lib/ai/api-tokens')>()),
    verifyApiToken: vi.fn(),
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireDM: vi.fn(async () => ({ userId: 'dm' })),
    requireCampaignAccess: vi.fn(async () => ({ userId: 'p', isDM: false })),
    requireCampaignDMOrDemoAccess: vi.fn(async () => ({ userId: 'dm' })),
}));
vi.mock('@/lib/server/content/service', () => ({
    listContent: vi.fn(async () => [{ id: 'listed' }]),
    getContent: vi.fn(async (_r: unknown, _a: unknown, id: string) => ({ id })),
    createContent: vi.fn(async () => ({ id: 'created' })),
    updateContent: vi.fn(async (_r: unknown, _a: unknown, id: string) => ({
        id,
    })),
    removeContent: vi.fn(async () => undefined),
    removeAllContent: vi.fn(async () => 3),
}));
vi.mock('@/lib/server/content/operation-service', () => ({
    runContentOperation: vi.fn(async () => ({ id: 'copy' })),
}));

import { verifyApiToken } from '@/lib/ai/api-tokens';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { moduleContentRoute } from '@/lib/server/content/module-dispatch';
import * as operations from '@/lib/server/content/module-operations';
import { runContentOperation } from '@/lib/server/content/operation-service';
import {
    createContent,
    getContent,
    removeAllContent,
    updateContent,
} from '@/lib/server/content/service';
import * as apiAuth from '@/lib/utils/api/api-auth';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const call = (
    method: Method,
    segments: string[],
    { body, campaign = 'c1' }: { body?: unknown; campaign?: string } = {}
) =>
    moduleContentRoute(method)(
        new Request(
            `http://x/api/campaigns/${campaign}/${segments.join('/')}`,
            {
                method,
                ...(body !== undefined && { body: JSON.stringify(body) }),
            }
        ),
        {
            params: Promise.resolve({
                id: campaign,
                kind: segments[0],
                ...(segments.length > 1 && { rest: segments.slice(1) }),
            }),
        }
    );

const tree = {
    race: 'Elf',
    skills: { race: 'Elf', mainSkills: [{ id: 'racial' }] },
};

const runModule = vi.spyOn(operations, 'runModuleContentOperation');

describe('module content dispatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        runModule.mockResolvedValue({
            id: 't1',
            race: 'Elf',
            skills: {},
            extra: 'hidden',
        });
    });

    it.each([
        ['GET', ['skill-trees'], 200],
        ['PATCH', ['skill-trees', 't1'], 200],
        ['GET', ['artifact-sets'], 200],
        ['POST', ['artifact-sets'], 201],
        ['GET', ['artifact-sets', 's1'], 200],
        ['PATCH', ['artifact-sets', 's1'], 200],
        ['DELETE', ['artifact-sets', 's1'], 200],
        ['GET', ['main-skills'], 200],
        ['POST', ['main-skills'], 201],
        ['GET', ['main-skills', 'm1'], 200],
        ['PATCH', ['main-skills', 'm1'], 200],
        ['DELETE', ['main-skills', 'm1'], 200],
        ['GET', ['skills'], 200],
        ['POST', ['skills'], 201],
        ['DELETE', ['skills'], 200],
        ['GET', ['skills', 'k1'], 200],
        ['PATCH', ['skills', 'k1'], 200],
        ['DELETE', ['skills', 'k1'], 200],
        ['POST', ['skills', 'k1', 'duplicate'], 200],
    ] as [Method, string[], number][])(
        '%s /%s -> %i',
        async (method, path, status) => {
            const body =
                method === 'PATCH' && path[0] === 'skill-trees'
                    ? tree
                    : method === 'GET' || method === 'DELETE'
                      ? undefined
                      : {};

            const res = await call(method, path, { body });

            expect(res.status, await res.clone().text()).toBe(status);
        }
    );

    it.each([
        ['POST', ['skill-trees']],
        ['PUT', ['skill-trees', 't1']],
        ['DELETE', ['skill-trees', 't1']],
        ['DELETE', ['artifact-sets']],
        ['DELETE', ['main-skills']],
        ['PATCH', ['skills']],
        ['PUT', ['skills', 'k1']],
        ['GET', ['skills', 'k1', 'duplicate']],
    ] as [Method, string[]][])('%s /%s -> 405 JSON', async (method, path) => {
        const res = await call(method, path);

        expect(res.status).toBe(405);
        expect((await res.json()).error).toBe(API_ERRORS.METHOD_NOT_ALLOWED);
        expect(res.headers.get('Allow')).toBeTruthy();
    });

    it('unknown kind, extra segments and static kinds -> 404 JSON', async () => {
        for (const path of [
            ['nope'],
            ['units'],
            ['units', 'u1', 'x'],
            ['skills', 'a', 'b', 'c'],
            ['skill-trees', 't1', 'x'],
        ]) {
            const res = await call('GET', path);

            expect(res.status, path.join('/')).toBe(404);
            expect((await res.json()).error).toBe(API_ERRORS.NOT_FOUND);
        }
        expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
    });

    it('skill-trees list and save run directly with the old input and projection', async () => {
        await call('GET', ['skill-trees']);
        expect(runModule).toHaveBeenLastCalledWith(
            'skill-trees.list',
            expect.objectContaining({ campaignId: 'c1' }),
            {}
        );

        const res = await call('PATCH', ['skill-trees', 't1'], { body: tree });

        expect(runModule).toHaveBeenLastCalledWith(
            'skill-trees.save',
            expect.anything(),
            { treeId: 't1', body: tree }
        );
        expect(await res.json()).toEqual({ id: 't1', race: 'Elf', skills: {} });
        expect(runContentOperation).not.toHaveBeenCalled();
    });

    it('skills duplicate goes through the gated runner with path params and body key', async () => {
        const res = await call('POST', ['skills', 'k1', 'duplicate']);

        expect(await res.json()).toEqual({ id: 'copy' });
        expect(runContentOperation).toHaveBeenCalledWith(
            'skills.duplicate',
            expect.anything(),
            { id: 'c1', skillId: 'k1', body: undefined }
        );
        expect(runModule).not.toHaveBeenCalled();
    });

    it('kind routes: list is private no-store, create is 201, item id comes from rest[0]', async () => {
        const list = await call('GET', ['skills']);

        expect(list.headers.get('Cache-Control')).toBe('private, no-store');
        expect(await list.json()).toEqual([{ id: 'listed' }]);

        expect((await call('POST', ['main-skills'], { body: {} })).status).toBe(
            201
        );
        expect(createContent).toHaveBeenCalled();

        await call('PATCH', ['artifact-sets', 's9'], { body: {} });
        expect(updateContent).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'artifact-sets' }),
            expect.anything(),
            's9',
            {}
        );

        await call('GET', ['skills', 'k7']);
        expect(getContent).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'skills' }),
            expect.anything(),
            'k7'
        );

        const all = await call('DELETE', ['skills']);

        expect(await all.json()).toEqual({ ok: true, deleted: 3 });
        expect(removeAllContent).toHaveBeenCalled();
    });

    it('session access: write routes need DM-level write, reads need membership', async () => {
        await call('GET', ['skills']);
        expect(apiAuth.requireCampaignAccess).toHaveBeenCalledWith(
            'c1',
            false,
            { allowDemo: true }
        );

        await call('POST', ['skills', 'k1', 'duplicate']);
        await call('DELETE', ['skills']);
        expect(apiAuth.requireDM).toHaveBeenCalledTimes(2);
        expect(apiAuth.requireDM).toHaveBeenCalledWith('c1');
    });

    it('denied access is returned as is and nothing runs', async () => {
        vi.mocked(apiAuth.requireDM).mockResolvedValueOnce(
            NextResponse.json({ error: 'x' }, { status: 403 }) as never
        );

        expect((await call('DELETE', ['skills'])).status).toBe(403);
        expect(removeAllContent).not.toHaveBeenCalled();
    });

    it('401 without a session', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValueOnce(
            NextResponse.json({ error: 'u' }, { status: 401 }) as never
        );

        expect((await call('GET', ['skill-trees'])).status).toBe(401);
        expect(runModule).not.toHaveBeenCalled();
    });

    it('a token without content:write gets 403; a token of another campaign is rejected', async () => {
        const bearer = (method: Method, path: string[]) =>
            moduleContentRoute(method)(
                new Request('http://x/api/campaigns/c1/' + path.join('/'), {
                    method,
                    headers: { authorization: 'Bearer dndt_x' },
                    body: method === 'POST' ? '{}' : undefined,
                }),
                {
                    params: Promise.resolve({
                        id: 'c1',
                        kind: path[0],
                        rest: path.slice(1),
                    }),
                }
            );

        vi.mocked(verifyApiToken).mockResolvedValue({
            campaignId: 'c1',
            userId: 'dm',
            scopes: ['content:read'],
        } as never);
        expect((await bearer('POST', ['skills'])).status).toBe(403);
        expect((await bearer('GET', ['skills'])).status).toBe(200);
        expect(createContent).not.toHaveBeenCalled();

        vi.mocked(verifyApiToken).mockResolvedValue({
            campaignId: 'other',
            userId: 'dm',
            scopes: ['content:read', 'content:write'],
        } as never);
        expect((await bearer('GET', ['skills'])).status).toBe(403);
    });
});
