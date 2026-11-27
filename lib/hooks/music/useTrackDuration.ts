'use client';

import { useEffect, useState } from 'react';

import { toMediaUrl } from '@/lib/utils/common/image-url';
import type { CampaignTrack } from '@/types/audio';

export function useTrackDuration(track: CampaignTrack, enabled: boolean) {
    const stored = track.durationSec;

    const [loaded, setLoaded] = useState<number | null>(null);

    const url = track.kind === 'file' ? track.url : null;

    useEffect(() => {
        if (!enabled || stored || !url) return;

        const audio = new Audio();

        audio.preload = 'metadata';

        const onMeta = () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                setLoaded(Math.round(audio.duration));
            }
        };

        audio.addEventListener('loadedmetadata', onMeta);
        audio.src = toMediaUrl(url);

        return () => {
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeAttribute('src');
            audio.load();
        };
    }, [enabled, stored, url]);

    return stored || loaded;
}
