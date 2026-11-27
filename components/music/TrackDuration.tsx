'use client';

import { useInView } from '@/lib/hooks/common';
import { useTrackDuration } from '@/lib/hooks/music';
import { formatTrackDuration } from '@/lib/utils/audio/track-duration';
import type { CampaignTrack } from '@/types/audio';

export function TrackDuration({
    track,
    onDuration,
}: {
    track: CampaignTrack;
    onDuration?: (id: string, sec: number) => void;
}) {
    const [ref, visible] = useInView<HTMLSpanElement>();

    const text = formatTrackDuration(
        useTrackDuration(track, visible, onDuration)
    );

    return <span ref={ref}>{text}</span>;
}
