'use client';

import { useTranslations } from 'next-intl';
import { Music, Play, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTracks } from '@/lib/hooks/music';

export function SectionTrackChip({
    campaignId,
    trackId,
    onPlay,
    onRemove,
    disabled,
}: {
    campaignId: string;
    trackId: string;
    onPlay?: () => void;
    onRemove?: () => void;
    disabled?: boolean;
}) {
    const t = useTranslations('scenario.sectionTrack');

    const { data: tracks } = useTracks(campaignId);

    const track = tracks?.find((x) => x.id === trackId);

    return (
        <span className="sb-bind">
            <Music className="size-4 shrink-0" />
            <span className="sb-bind-name">
                {track?.title ?? (tracks ? t('missing') : t('loading'))}
            </span>
            {onPlay && track && (
                <Button
                    variant="plain"
                    size="auto"
                    type="button"
                    className="toggle"
                    aria-label={t('play')}
                    disabled={disabled}
                    onClick={onPlay}
                >
                    <Play className="size-3" /> {t('play')}
                </Button>
            )}
            {onRemove && (
                <Button
                    variant="plain"
                    size="auto"
                    type="button"
                    aria-label={t('unbind')}
                    onClick={onRemove}
                >
                    <X className="size-3" />
                </Button>
            )}
        </span>
    );
}
