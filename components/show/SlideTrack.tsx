'use client';

import { useTranslations } from 'next-intl';
import { Music, Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTrackPreview, useTracks } from '@/lib/hooks/music';

export function SlideTrack({
    campaignId,
    trackId,
}: {
    campaignId: string;
    trackId: string;
}) {
    const t = useTranslations('show.decksPage');

    const tList = useTranslations('music.list');

    const preview = useTrackPreview();

    const { data: tracks = [] } = useTracks(campaignId);

    const track = tracks.find((x) => x.id === trackId);

    if (!track) return null;

    const playing = preview.playingId === track.id;

    return (
        <div className="flex items-center gap-2 text-sm text-hud-bone">
            <Music aria-hidden className="size-4 text-hud-muted" />
            <span className="text-hud-muted">{t('slideTrack')}</span>
            <span className="min-w-0 truncate">{track.title}</span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={playing}
                aria-label={playing ? tList('pause') : tList('play')}
                onClick={() => preview.toggle(track)}
            >
                {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            </Button>
        </div>
    );
}
