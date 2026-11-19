'use client';

import { soundKeys } from './keys';

import {
    createLibrarySound,
    discardSoundObject,
    importSoundLink,
} from '@/lib/api/sound-library';
import { MAX_SOUND_SECONDS } from '@/lib/constants/soundboard';
import { useCrudMutation } from '@/lib/hooks/common';
import { decodeDurationMs } from '@/lib/utils/soundboard/decode-duration';

export type ImportLinkResult = { rejected: 'invalid' | 'tooLong' | null };

async function importAndCreate(sourceUrl: string): Promise<ImportLinkResult> {
    const imported = await importSoundLink(sourceUrl);

    let created = false;

    try {
        const durationMs = await decodeDurationMs(imported.url).catch(
            () => null
        );

        if (durationMs === null) return { rejected: 'invalid' };

        if (durationMs > MAX_SOUND_SECONDS * 1000)
            return { rejected: 'tooLong' };

        await createLibrarySound({
            path: imported.path,
            durationMs,
            source: 'link',
            sourceUrl,
        });

        created = true;

        return { rejected: null };
    } finally {
        if (!created) await discardSoundObject(imported.path).catch(() => {});
    }
}

export const useImportSoundLink = () =>
    useCrudMutation({
        mutationFn: importAndCreate,
        invalidateKeys: (data) => (data.rejected ? [] : [soundKeys.library()]),
    });
