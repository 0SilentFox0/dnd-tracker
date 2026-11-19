import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_SOUND_BYTES } from '@/lib/constants/soundboard';
import { assertLibraryRoom } from '@/lib/server/soundboard/library-store';
import { uploadSoundBytes } from '@/lib/supabase/soundboard-storage';
import { ContentError } from '@/lib/utils/api/content-error';
import { safeFetchBuffer, SafeFetchError } from '@/lib/utils/api/safe-fetch';
import { sniffAudioFormat } from '@/lib/utils/soundboard/sniff-audio';

const FETCH_LIMITS = { maxBytes: MAX_SOUND_BYTES, timeoutMs: 8000 };

async function fetchBytes(url: string): Promise<Uint8Array> {
    try {
        const res = await safeFetchBuffer(url, FETCH_LIMITS);

        if (res.status < 200 || res.status >= 300)
            throw new ContentError(API_ERRORS.SOUND_LINK_INVALID, 400);

        return res.body;
    } catch (e) {
        if (e instanceof ContentError) throw e;

        const tooLarge =
            e instanceof SafeFetchError &&
            e.message === API_ERRORS.SAFE_FETCH_TOO_LARGE;

        throw new ContentError(
            tooLarge
                ? API_ERRORS.SOUND_LINK_TOO_LARGE
                : API_ERRORS.SOUND_LINK_INVALID,
            400
        );
    }
}

export async function importSoundFromLink(
    userId: string,
    input: { url: string }
): Promise<{ path: string; url: string }> {
    await assertLibraryRoom(userId);

    const bytes = await fetchBytes(input.url);

    const format = sniffAudioFormat(bytes);

    if (!format) throw new ContentError(API_ERRORS.SOUND_FILE_INVALID, 400);

    const stored = await uploadSoundBytes(userId, format, bytes);

    if (!stored.ok) throw new ContentError(API_ERRORS.INTERNAL, 500);

    return stored.value;
}
