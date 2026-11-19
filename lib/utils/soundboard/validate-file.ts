import { API_ERRORS } from '@/lib/constants/api-errors';
import type { TrackFormat } from '@/lib/constants/music';
import { MAX_SOUND_BYTES } from '@/lib/constants/soundboard';
import { detectTrackFormat } from '@/lib/utils/audio/track-file';
import type { Result } from '@/types/common';

export function validateSoundFile(file: {
    name: string;
    type: string;
    size: number;
}): Result<TrackFormat> {
    const format = detectTrackFormat(file);

    if (!format || file.size <= 0 || file.size > MAX_SOUND_BYTES)
        return { ok: false, message: API_ERRORS.TRACK_FILE_INVALID };

    return { ok: true, value: format };
}
