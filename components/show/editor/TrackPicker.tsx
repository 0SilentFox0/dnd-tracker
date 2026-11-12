'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pause, Play } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/hooks/common';
import { useTrackPreview, useTracks } from '@/lib/hooks/music';
import { cn } from '@/lib/utils';
import { filterTracks, groupTracks } from '@/lib/utils/audio/playlist-groups';

function Row({
    selected,
    onClick,
    children,
}: {
    selected: boolean;
    onClick(): void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'w-full rounded px-2 py-1.5 text-left text-sm text-hud-bone hover:bg-white/10',
                selected && 'bg-white/10 text-hud-gold'
            )}
        >
            {children}
        </button>
    );
}

export function TrackPicker({
    campaignId,
    value,
    onChange,
}: {
    campaignId: string;
    value: string | undefined;
    onChange(trackId: string | undefined): void;
}) {
    const t = useTranslations('show');

    const tList = useTranslations('music.list');

    const preview = useTrackPreview();

    const { data: tracks = [] } = useTracks(campaignId);

    const [query, setQuery] = useState('');

    const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

    const groups = groupTracks(
        filterTracks(tracks, { query: debouncedQuery, group: null, kind: null })
    );

    return (
        <div className="space-y-2">
            <Input
                aria-label={t('trackPicker.search')}
                placeholder={t('trackPicker.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto rounded border border-hud-rule p-1">
                <Row
                    selected={value === undefined}
                    onClick={() => onChange(undefined)}
                >
                    {t('trackPicker.none')}
                </Row>
                {groups.map((group) => (
                    <div key={group.name}>
                        <p className="px-2 pt-2 text-xs text-hud-muted uppercase">
                            {group.name}
                        </p>
                        {group.tracks.map((track) => (
                            <div
                                key={track.id}
                                className="flex items-center gap-1"
                            >
                                <button
                                    type="button"
                                    aria-label={`${preview.playingId === track.id ? tList('pause') : tList('play')}: ${track.title}`}
                                    aria-pressed={
                                        preview.playingId === track.id
                                    }
                                    className={cn(
                                        'shrink-0 rounded p-1.5 text-hud-bone hover:bg-white/10',
                                        preview.failedId === track.id &&
                                            'text-destructive'
                                    )}
                                    title={
                                        preview.failedId === track.id
                                            ? tList('playFailed')
                                            : undefined
                                    }
                                    onClick={() => preview.toggle(track)}
                                >
                                    {preview.playingId === track.id ? (
                                        <Pause className="size-4" />
                                    ) : (
                                        <Play className="size-4" />
                                    )}
                                </button>
                                <div className="min-w-0 flex-1">
                                    <Row
                                        selected={value === track.id}
                                        onClick={() => onChange(track.id)}
                                    >
                                        {track.title}
                                    </Row>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
