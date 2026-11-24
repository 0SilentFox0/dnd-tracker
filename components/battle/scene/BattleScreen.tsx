'use client';

import { type ComponentType, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { BattleToast } from './banners/BattleToast';
import { CornerStack } from './layout/CornerStack';
import { NoticeStackContext } from './layout/MapStrip';
import { MobileBattleLayout } from './layout/MobileBattleLayout';
import { BattlePlayerViewToggle } from './BattlePlayerViewToggle';

import { AudioDock } from '@/components/audio/AudioDock';
import { BattleAudioProvider } from '@/components/battle/audio/BattleAudioProvider';
import { CounterWindowBanner } from '@/components/battle/counter/CounterWindowBanner';
import { CounterWindowDialog } from '@/components/battle/counter/CounterWindowDialog';
import {
    useSystemBattleUi,
    useSystemFx,
} from '@/components/battle/use-system-battle-ui';
import { hudFontClassName } from '@/components/hud';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { BattleStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    useBattleScene,
    useFxEnabled,
    useModeAutoSkip,
    useSpellBookPrefetch,
} from '@/lib/hooks/battle';
import {
    DESKTOP_QUERY,
    useMediaQuery,
    usePlayerViewKey,
} from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import type { BattlePreparationParticipant } from '@/types/battle';

type DesktopLayout = ComponentType<{ onComplete: () => void }>;

let desktopLayout: DesktopLayout | null = null;

let desktopLoad: Promise<void> | null = null;

// phones always use the mobile layout (in the entry chunk); the desktop one loads only on wide screens
function loadDesktopLayout() {
    desktopLoad ??= import('./layout/DesktopBattleLayout').then((m) => {
        desktopLayout = m.DesktopBattleLayout;
    });

    return desktopLoad;
}

if (typeof window !== 'undefined' && window.matchMedia?.(DESKTOP_QUERY).matches)
    void loadDesktopLayout();

function useDesktopLayout(wide: boolean): DesktopLayout | null {
    const [, setLoaded] = useState(desktopLayout !== null);

    useEffect(() => {
        if (wide && !desktopLayout)
            void loadDesktopLayout().then(() => setLoaded(true));
    }, [wide]);

    return wide ? desktopLayout : null;
}

const CompleteBattleDialog = dynamic(
    () =>
        import('@/components/battle/dm/CompleteBattleDialog').then(
            (m) => m.CompleteBattleDialog
        ),
    { ssr: false }
);

const BattleResultScreen = dynamic(
    () =>
        import('@/components/battle/overlays/BattleResultScreen').then(
            (m) => m.BattleResultScreen
        ),
    { ssr: false }
);

const DmRevivePrompt = dynamic(
    () =>
        import('@/components/battle/dm/DmRevivePrompt').then(
            (m) => m.DmRevivePrompt
        ),
    { ssr: false }
);

const BattleFxLayer = dynamic(
    () => import('@/components/fx/BattleFxLayer').then((m) => m.BattleFxLayer),
    { ssr: false }
);

const BattlePreparationView = dynamic(() =>
    import('@/components/battle/overlays/BattlePreparationView').then(
        (m) => m.BattlePreparationView
    )
);

const sideCount = (
    participants: BattlePreparationParticipant[],
    side: string
) =>
    participants
        .filter((p) => p.side === side)
        .reduce((s, p) => s + (p.quantity ?? 1), 0);

const onFieldCount = (participants: BattlePreparationParticipant[]) =>
    participants.reduce(
        (s, p) =>
            s + (p.quantity ?? 1) - Math.min(p.reserved ?? 0, p.quantity ?? 1),
        0
    );

export function BattleScreen() {
    const tTop = useTranslations('battle.topBar');

    const {
        battle,
        viewer: { isDM, readOnly },
        actions,
        turn: { isMyTurn },
        roster: { hero },
        playerView,
    } = useBattleScene();

    usePlayerViewKey(playerView.toggle, playerView.available);

    const { notices: systemNotices, dialogs: systemDialogs } =
        useSystemBattleUi();

    // first HTML is the mobile layout so phones see no swap after hydration
    const fx = useSystemFx();

    const wide = useMediaQuery(DESKTOP_QUERY);

    const Desktop = useDesktopLayout(wide);

    const [completeOpen, setCompleteOpen] = useState(false);

    const onComplete = () => setCompleteOpen(true);

    useEffect(() => {
        if (readOnly) setCompleteOpen(false);
    }, [readOnly]);

    const [notices, setNotices] = useState<HTMLElement | null>(null);

    useSpellBookPrefetch();

    useModeAutoSkip();

    const { userEnabled: fxOn } = useFxEnabled();

    useEffect(() => {
        if (!fxOn) return;

        import('@/components/fx/preload')
            .then((m) => m.preloadFx())
            .catch(() => undefined);
    }, [fxOn]);

    // one provider for both branches: its <audio> survives "Start battle"
    return (
        <BattleAudioProvider>
            {battle.status === BattleStatus.PREPARED ? (
                <div
                    className={cn(
                        'battle-hud scene-full overflow-y-auto',
                        hudFontClassName
                    )}
                >
                    {isDM && (
                        <OnboardingHint
                            id="dm.battle-scene"
                            className="mx-auto mt-3 max-w-md"
                        />
                    )}
                    <BattlePreparationView
                        alliesCount={sideCount(
                            battle.participants,
                            ParticipantSide.ALLY
                        )}
                        enemiesCount={sideCount(
                            battle.participants,
                            ParticipantSide.ENEMY
                        )}
                        isDM={isDM}
                        onStartBattle={() => actions.start.mutate({})}
                        isStarting={actions.start.isPending}
                        canStart={onFieldCount(battle.participants) > 0}
                    />
                    <BattlePlayerViewToggle className="fixed top-3 right-3 z-50" />
                    <Link
                        href={`/campaigns/${battle.campaignId}`}
                        className="hud-sc fixed top-3 left-3 z-50 text-sm text-hud-soft hover:text-[var(--gold)]"
                    >
                        {tTop('toCampaign')}
                    </Link>
                    <CornerStack>
                        <AudioDock placement="corner" />
                    </CornerStack>
                </div>
            ) : (
                <div className={cn('battle-hud', hudFontClassName)}>
                    <NoticeStackContext value={notices}>
                        {Desktop ? (
                            <Desktop onComplete={onComplete} />
                        ) : (
                            <MobileBattleLayout onComplete={onComplete} />
                        )}
                    </NoticeStackContext>
                    {battle.status === BattleStatus.COMPLETED && (
                        <BattleResultScreen />
                    )}
                    <div
                        ref={setNotices}
                        data-notice-stack
                        className={cn(
                            'pointer-events-none fixed inset-x-4 z-50 mx-auto flex max-w-md flex-col gap-2 *:pointer-events-auto',
                            Desktop ? 'top-[116px]' : 'top-[148px]'
                        )}
                    >
                        <BattleToast />
                        <CounterWindowBanner />
                        {systemNotices?.map((Notice, i) => (
                            <Notice key={i} />
                        ))}
                        {!isDM && hero && !isMyTurn && (
                            <OnboardingHint id="player.battle" />
                        )}
                    </div>
                    {isDM && <DmRevivePrompt />}
                    <CounterWindowDialog />
                    {systemDialogs?.map((Dialog, i) => (
                        <Dialog key={i} />
                    ))}
                    {isDM && (
                        <CompleteBattleDialog
                            open={completeOpen}
                            onOpenChange={setCompleteOpen}
                        />
                    )}
                    <BattleFxLayer fx={fx} />
                </div>
            )}
        </BattleAudioProvider>
    );
}
