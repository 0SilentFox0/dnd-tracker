import { NextResponse } from 'next/server';
import type { z } from 'zod';

import {
    createLibrarySoundSchema,
    discardSoundSchema,
    importLinkSchema,
    soundUploadRequestSchema,
    updateLibrarySoundSchema,
} from '@/lib/schemas/soundboard';
import { importSoundFromLink } from '@/lib/server/soundboard/import-link';
import {
    createLibrarySound,
    deleteLibrarySound,
    discardUploadedSound,
    getLibrary,
    libraryEtag,
    updateLibrarySound,
} from '@/lib/server/soundboard/library-store';
import { createSoundUploadTicket } from '@/lib/supabase/soundboard-storage';
import { requireAuth } from '@/lib/utils/api/api-auth';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { ifNoneMatch, weakEtag } from '@/lib/utils/api/etag';
import { parseBody } from '@/lib/utils/api/parse-body';
import { validateSoundFile } from '@/lib/utils/soundboard/validate-file';

const REVALIDATE = 'private, max-age=0, must-revalidate';

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

async function withBody<T>(
    action: string,
    req: Request,
    schema: z.ZodType<T>,
    run: (userId: string, body: T) => Promise<Response>
): Promise<Response> {
    return withUser(action, async (userId) => {
        const body = await parseBody(schema, req);

        if (body instanceof NextResponse) return body;

        return run(userId, body);
    });
}

export const getLibraryHandler = (req: Request) =>
    withUser('get sound library', async (userId) => {
        const library = await getLibrary(userId);

        const etag = weakEtag(userId, libraryEtag(library));

        const notModified = ifNoneMatch(req, etag);

        if (notModified) {
            notModified.headers.set('Cache-Control', REVALIDATE);

            return notModified;
        }

        return NextResponse.json(library, {
            headers: { ETag: etag, 'Cache-Control': REVALIDATE },
        });
    });

export const createLibrarySoundHandler = (req: Request) =>
    withBody(
        'create library sound',
        req,
        createLibrarySoundSchema,
        async (userId, body) =>
            privateJson(await createLibrarySound(userId, body), 201)
    );

export const updateLibrarySoundHandler = (req: Request, id: string) =>
    withBody(
        'update library sound',
        req,
        updateLibrarySoundSchema,
        async (userId, body) =>
            privateJson(await updateLibrarySound(userId, id, body))
    );

export const deleteLibrarySoundHandler = (id: string) =>
    withUser('delete library sound', async (userId) => {
        await deleteLibrarySound(userId, id);

        return privateJson({ ok: true });
    });

export const issueUploadTicketHandler = (req: Request) =>
    withBody(
        'issue sound upload',
        req,
        soundUploadRequestSchema,
        async (userId, body) => {
            const file = validateSoundFile({
                name: body.name,
                type: body.contentType,
                size: body.size,
            });

            if (!file.ok) return errorResponse(file.message, 400);

            const ticket = await createSoundUploadTicket(userId, file.value);

            return ticket.ok
                ? NextResponse.json(ticket.value)
                : errorResponse(ticket.message, 500);
        }
    );

export const importLinkHandler = (req: Request) =>
    withBody('import sound link', req, importLinkSchema, async (userId, body) =>
        privateJson(await importSoundFromLink(userId, { url: body.url }))
    );

export const discardSoundHandler = (req: Request) =>
    withBody(
        'discard sound upload',
        req,
        discardSoundSchema,
        async (userId, body) => {
            await discardUploadedSound(userId, body.path);

            return privateJson({ ok: true });
        }
    );
