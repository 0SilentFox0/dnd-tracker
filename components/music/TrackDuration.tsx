'use client';

import { useEffect, useRef, useState } from 'react';

import { useTrackDuration } from '@/lib/hooks/music';
import { formatTrackDuration } from '@/lib/utils/audio/track-duration';
import type { CampaignTrack } from '@/types/audio';

export function TrackDuration({ track }: { track: CampaignTrack }) {
    const ref = useRef<HTMLSpanElement>(null);

    const [visible, setVisible] = useState(
        typeof IntersectionObserver === 'undefined'
    );

    useEffect(() => {
        const el = ref.current;

        if (visible || !el) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setVisible(true);
                observer.disconnect();
            }
        });

        observer.observe(el);

        return () => observer.disconnect();
    }, [visible]);

    const text = formatTrackDuration(useTrackDuration(track, visible));

    return <span ref={ref}>{text}</span>;
}
