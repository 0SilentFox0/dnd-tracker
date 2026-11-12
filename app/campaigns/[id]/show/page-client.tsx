'use client';

import { useTranslations } from 'next-intl';

import { AudioDock } from '@/components/audio/AudioDock';
import { AudioPlayerProvider } from '@/components/audio/AudioPlayerProvider';
import { DiceRoller } from '@/components/common/DiceRoller';
import { PlayerViewToggle } from '@/components/common/PlayerViewToggle';
import { FullscreenButton } from '@/components/show/stage/FullscreenButton';
import { ShowBattleCall } from '@/components/show/stage/ShowBattleCall';
import { ShowControlPanel } from '@/components/show/stage/ShowControlPanel';
import { ShowStage } from '@/components/show/stage/ShowStage';
import { useNotify, usePlayerView, usePlayerViewKey } from '@/lib/hooks/common';
import {
    usePusherShowSync,
    useShowAudioHost,
    useShowControl,
    useShowKeys,
    useShowState,
} from '@/lib/hooks/show';

export function ShowPageClient({
    campaignId,
    isDM,
    userId,
}: {
    campaignId: string;
    isDM: boolean;
    userId: string;
}) {
    const t = useTranslations('show');

    const notify = useNotify();

    usePusherShowSync(campaignId);

    const { show } = useShowState(campaignId);

    const control = useShowControl(campaignId, notify);

    const playerView = usePlayerView(
        isDM ? { kind: 'show', id: campaignId } : null
    );

    usePlayerViewKey(playerView.toggle, isDM);

    const readOnly = isDM && playerView.enabled;

    const effectiveDM = isDM && !readOnly;

    useShowKeys(effectiveDM ? control : null);

    const host = useShowAudioHost({
        campaignId,
        isDM: effectiveDM,
        silent: readOnly,
        onFailure: notify,
    });

    return (
        <AudioPlayerProvider host={host}>
            <div className="flex min-h-[calc(100dvh-var(--app-header-h))] flex-col">
                <div className="relative min-h-[60dvh] flex-1">
                    <ShowStage
                        show={show}
                        campaignId={campaignId}
                        isDM={effectiveDM}
                        readOnly={readOnly}
                        userId={userId}
                    />
                    {show?.battle && (
                        <ShowBattleCall
                            campaignId={campaignId}
                            battle={show.battle}
                            playerView={readOnly}
                        />
                    )}
                    <div className="absolute top-3 right-3 z-20 flex gap-2">
                        {!isDM && <DiceRoller />}
                        {isDM && (
                            <PlayerViewToggle
                                enabled={playerView.enabled}
                                onToggle={playerView.toggle}
                                labels={{
                                    on: t('playerView.on'),
                                    off: t('playerView.off'),
                                }}
                                className="rounded bg-black/50"
                            />
                        )}
                        <FullscreenButton />
                    </div>
                    <div className="absolute top-3 left-3 z-30">
                        <AudioDock placement="corner" />
                    </div>
                </div>
                {effectiveDM && (
                    <ShowControlPanel
                        campaignId={campaignId}
                        show={show}
                        control={control}
                    />
                )}
            </div>
        </AudioPlayerProvider>
    );
}
