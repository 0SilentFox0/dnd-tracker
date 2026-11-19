import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_SOUND_BYTES, type SoundFormat } from '@/lib/constants/soundboard';
import { detectTrackFormat } from '@/lib/utils/audio/track-file';
import type { Result } from '@/types/common';

const WEBM_MIME = new Set(['audio/webm', 'video/webm']);

function detectSoundFormat(file: {
    name: string;
    type: string;
}): SoundFormat | null {
    const type = file.type.toLowerCase().split(';')[0];

    if (WEBM_MIME.has(type)) return 'webm';

    const track = detectTrackFormat({ name: file.name, type });

    if (track) return track;

    const untyped = type === '' || type === 'application/octet-stream';

    return untyped && file.name.toLowerCase().endsWith('.webm') ? 'webm' : null;
}

export function validateSoundFile(file: {
    name: string;
    type: string;
    size: number;
}): Result<SoundFormat> {
    const format = detectSoundFormat(file);

    if (!format || file.size <= 0 || file.size > MAX_SOUND_BYTES)
        return {
            ok: false,
            message: API_ERRORS.SOUND_FILE_INVALID,
        };

    return { ok: true, value: format };
}
