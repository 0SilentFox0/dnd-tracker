'use client';

import { useEffect, useRef, useState } from 'react';

import { toMediaUrl } from '@/lib/utils/common/image-url';
import type { CampaignTrack } from '@/types/audio';

export function useTrackDuration(
    track: CampaignTrack,
    enabled: boolean,
    onDuration?: (id: string, sec: number) => void
) {
    const stored = track.durationSec;

    const [loaded, setLoaded] = useState<number | null>(null);

    const onDurationRef = useRef(onDuration);

    useEffect(() => {
        onDurationRef.current = onDuration;
    });

    const id = track.id;

    const url = track.kind === 'file' ? track.url : null;

    useEffect(() => {
        if (!enabled || stored || !url) return;

        const audio = new Audio();

        audio.preload = 'metadata';

        const onMeta = () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                const sec = Math.round(audio.duration);

                setLoaded(sec);
                onDurationRef.current?.(id, sec);
            }
        };

        audio.addEventListener('loadedmetadata', onMeta);
        audio.src = toMediaUrl(url);

        return () => {
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeAttribute('src');
            audio.load();
        };
    }, [enabled, stored, url, id]);

    return stored || loaded;
}
