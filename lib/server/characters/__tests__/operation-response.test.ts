import { NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
    defineCharacterOperation,
    executeCharacterRoute,
    runCharacterOperation,
} from '@/lib/server/characters/operation-runner';
import { ContentError } from '@/lib/server/content/errors';

const operation = (response: NextResponse) =>
    defineCharacterOperation({
        name: 'x',
        action: 'x',
        schema: z.object({}),
        unlocked: true,
        gate: async (ctx) => ctx,
        run: async () => response,
    });

const call = { campaignId: 'c', params: { characterId: 'h' } };

describe('operations answering with a NextResponse', () => {
    it('HTTP passes a rejection through with its body', async () => {
        const response = await executeCharacterRoute(
            operation(NextResponse.json({ reason: 'x' }, { status: 422 })),
            {
                ...call,
                request: new Request('http://x', {
                    method: 'POST',
                    body: '{}',
                }),
            }
        );

        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ reason: 'x' });
    });

    it('HTTP passes an ok response through', async () => {
        const response = await executeCharacterRoute(
            operation(NextResponse.json({ ok: 1 })),
            {
                ...call,
                request: new Request('http://x', {
                    method: 'POST',
                    body: '{}',
                }),
            }
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: 1 });
    });

    it('the assistant gets a ContentError for a rejection and the body otherwise', async () => {
        const error = await runCharacterOperation(
            operation(NextResponse.json({ error: 'nope' }, { status: 422 })),
            { campaignId: 'c', characterId: 'h' },
            {}
        ).catch((e) => e);

        expect(error).toBeInstanceOf(ContentError);
        expect(error).toMatchObject({ status: 422 });

        await expect(
            runCharacterOperation(
                operation(NextResponse.json({ ok: 1 })),
                { campaignId: 'c', characterId: 'h' },
                {}
            )
        ).resolves.toEqual({ ok: 1 });
    });
});
