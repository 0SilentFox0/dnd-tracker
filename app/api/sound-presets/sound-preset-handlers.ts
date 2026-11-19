import { NextResponse } from 'next/server';
import type { z } from 'zod';

import {
    createPresetSchema,
    reorderPresetsSchema,
    updatePresetSchema,
} from '@/lib/schemas/soundboard';
import {
    createPreset,
    deletePreset,
    reorderPresets,
    updatePreset,
} from '@/lib/server/soundboard/preset-store';
import { requireAuth } from '@/lib/utils/api/api-auth';
import { privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';

async function withUser(
    action: string,
    run: (userId: string) => Promise<Response>
): Promise<Response> {
    try {
        const auth = await requireAuth();

        if (auth instanceof NextResponse) return auth;

        return await run(auth.userId);
    } catch (error) {
        return handleApiError(error, { action });
    }
}

const withBody = <T>(
    action: string,
    req: Request,
    schema: z.ZodType<T>,
    run: (userId: string, body: T) => Promise<Response>
) =>
    withUser(action, async (userId) => {
        const body = await parseBody(schema, req);

        return body instanceof NextResponse ? body : run(userId, body);
    });

export const createPresetHandler = (req: Request) =>
    withBody(
        'create sound preset',
        req,
        createPresetSchema,
        async (userId, body) =>
            privateJson(await createPreset(userId, body.name), 201)
    );

export const updatePresetHandler = (req: Request, id: string) =>
    withBody(
        'update sound preset',
        req,
        updatePresetSchema,
        async (userId, body) =>
            privateJson(await updatePreset(userId, id, body))
    );

export const deletePresetHandler = (id: string) =>
    withUser('delete sound preset', async (userId) => {
        await deletePreset(userId, id);

        return privateJson({ ok: true });
    });

export const reorderPresetsHandler = (req: Request) =>
    withBody(
        'reorder sound presets',
        req,
        reorderPresetsSchema,
        async (userId, body) => {
            await reorderPresets(userId, body.ids);

            return privateJson({ ok: true });
        }
    );
