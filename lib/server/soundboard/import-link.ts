import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_LIBRARY_SOUNDS, MAX_SOUND_BYTES } from '@/lib/constants/soundboard';
import { prisma } from '@/lib/db';
import { uploadSoundBytes } from '@/lib/supabase/soundboard-storage';
import { ContentError } from '@/lib/utils/api/content-error';
import { safeFetchBytes } from '@/lib/utils/net/safe-fetch';
import { sniffAudioFormat } from '@/lib/utils/soundboard/sniff-audio';

const FETCH_LIMITS = {
    maxBytes: MAX_SOUND_BYTES,
    timeoutMs: 8000,
    maxRedirects: 3,
};

export async function importSoundFromLink(
    userId: string,
    input: { url: string }
): Promise<{ path: string; url: string }> {
    const count = await prisma.soundLibraryItem.count({ where: { userId } });

    if (count >= MAX_LIBRARY_SOUNDS)
        throw new ContentError(API_ERRORS.SOUND_LIMIT, 400, undefined, {
            max: MAX_LIBRARY_SOUNDS,
        });

    const fetched = await safeFetchBytes(input.url, FETCH_LIMITS);

    if (!fetched.ok) throw new ContentError(fetched.message, 400);

    const format = sniffAudioFormat(fetched.value.bytes);

    if (!format) throw new ContentError(API_ERRORS.SOUND_FILE_INVALID, 400);

    const stored = await uploadSoundBytes(userId, format, fetched.value.bytes);

    if (!stored.ok) throw new ContentError(API_ERRORS.INTERNAL, 500);

    return stored.value;
}
