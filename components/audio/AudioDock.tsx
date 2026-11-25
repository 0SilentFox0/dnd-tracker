'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

import { AudioPlayerPanel } from './AudioPlayerPanel';
import { NowPlayingLabel } from './NowPlayingLabel';
import { PlayerErrorBoundary } from './PlayerErrorBoundary';
import { UnlockSoundButton } from './UnlockSoundButton';
import { YoutubePlayer } from './YoutubePlayer';

import { HudButton } from '@/components/hud';
import { usePlayerAudio } from '@/lib/hooks/audio';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export function AudioDock({
    placement,
    collapseOn = null,
    collapseTick = 0,
    defaultExpanded,
}: {
    placement: 'corner' | 'strip';
    collapseOn?: string | null;
    collapseTick?: number;
    defaultExpanded?: boolean;
}) {
    const t = useTranslations('music');

    const { state, sound, dm, prefs } = usePlayerAudio();

    const wide = useMediaQuery(DESKTOP_QUERY);

    const [choice, setChoice] = useState<boolean | null>(null);

    const [seenCollapseOn, setSeenCollapseOn] = useState(collapseOn);

    const [seenTick, setSeenTick] = useState(collapseTick);

    if (collapseOn !== seenCollapseOn || collapseTick !== seenTick) {
        setSeenCollapseOn(collapseOn);
        setSeenTick(collapseTick);

        if (
            (collapseOn !== null && collapseOn !== seenCollapseOn) ||
            collapseTick > seenTick
        )
            setChoice(false);
    }

    const expanded =
        choice ?? defaultExpanded ?? (placement === 'corner' && wide);

    const strip = placement === 'strip';

    const showVideo = prefs.video.set;

    const onNeedsTap = useCallback(() => {
        showVideo(true);
        setChoice(true);
    }, [showVideo]);

    const track = state?.track ?? null;

    if (!track && !dm) return null;

    const youtubeId =
        sound.unlocked && track?.kind === 'youtube' ? track.youtubeId : null;

    return (
        <div
            data-battle-audio={placement}
            data-tour="music.dock"
            className={cn(
                strip &&
                    'pointer-events-none absolute inset-x-2 top-[2.25rem] bottom-2 z-40 flex flex-col items-start justify-start'
            )}
        >
            <div
                className={cn(
                    strip && 'pointer-events-auto flex min-h-0 flex-col'
                )}
            >
                <div
                    data-audio-panel={expanded ? 'open' : 'collapsed'}
                    aria-hidden={!expanded || undefined}
                    inert={!expanded}
                    className={cn(
                        !expanded ? 'sr-only' : strip && 'flex min-h-0 flex-col'
                    )}
                >
                    <AudioPlayerPanel
                        view={{
                            onCollapse: () => setChoice(false),
                            capped: strip,
                        }}
                    >
                        {youtubeId && (
                            <PlayerErrorBoundary resetKey={youtubeId}>
                                <YoutubePlayer
                                    videoId={youtubeId}
                                    onNeedsTap={onNeedsTap}
                                />
                            </PlayerErrorBoundary>
                        )}
                    </AudioPlayerPanel>
                </div>
                {!expanded && (
                    <div className="flex items-center gap-1.5">
                        {track && !sound.unlocked && (
                            <UnlockSoundButton className="px-3" />
                        )}
                        <HudButton
                            type="button"
                            data-tour="music.expand"
                            aria-label={t('player.expand', {
                                title: track?.title ?? t('player.label'),
                            })}
                            onClick={() => setChoice(true)}
                            className="flex max-w-48 items-center gap-1.5 rounded-full border border-hud-rule bg-black/85 px-3 py-1.5 text-xs text-hud-bone shadow-lg"
                        >
                            <NowPlayingLabel
                                title={track?.title ?? t('player.label')}
                            />
                        </HudButton>
                    </div>
                )}
            </div>
        </div>
    );
}
