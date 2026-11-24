'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { AwaitingDmBanner } from '../banners/AwaitingDmBanner';
import { BattleOverBanner } from '../banners/BattleOverBanner';
import { ConnectionBanner } from '../banners/ConnectionBanner';
import { LastActionTicker } from '../banners/LastActionTicker';
import { BattleDrawer } from '../drawers/BattleDrawer';
import { DrawerRail } from '../drawers/DrawerRail';
import type { DrawerKey } from '../drawers/rail-items';
import { ToolsDrawer } from '../drawers/ToolsDrawer';
import { BattleTopBar } from './BattleTopBar';
import { MapStripSlotContext } from './MapStrip';
import {
    EMPTY_SCENE_SLOTS,
    type SceneSlots,
    SceneSlotsContext,
} from './SceneSlots';

import { SideDot } from '@/components/battle/hud';
import { BattleLog } from '@/components/battle/log/BattleLog';
import { TokenBubble } from '@/components/battle/map/bubble/TokenBubble';
import { BattleMapPanel } from '@/components/battle/map/panels/BattleMapPanel';
import { MapToolsSlotContext } from '@/components/battle/map/panels/MapToolsSlot';
import { HeroCluster } from '@/components/battle/participants/hero/HeroCluster';
import { InitiativeTrack } from '@/components/battle/participants/InitiativeTrack';
import { ParticipantList } from '@/components/battle/participants/ParticipantList';
import { ReserveGroup } from '@/components/battle/participants/ReservePanel';
import { DockNextTurn } from '@/components/battle/turn/dock/DockNextTurn';
import { DockWaiting } from '@/components/battle/turn/dock/DockWaiting';
import { MyTurnControls } from '@/components/battle/turn/MyTurnControls';
import { BattleStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    useBattleScene,
    useBattleViewMode,
    useTrackReorder,
} from '@/lib/hooks/battle';
import { myTurnKey, showDock } from '@/lib/utils/battle/view';

const ActionResultCard = dynamic(
    () =>
        import('@/components/battle/overlays/ActionResultCard').then(
            (m) => m.ActionResultCard
        ),
    { ssr: false }
);

const DmPanel = dynamic(
    () => import('@/components/battle/dm/DmPanel').then((m) => m.DmPanel),
    { ssr: false }
);

const H3 = ({
    side,
    children,
}: {
    side: ParticipantSide;
    children: React.ReactNode;
}) => (
    <h3 className="hud-sc flex h-8 items-center gap-2 border-b border-white/[.14] text-[15px] font-bold tracking-[.1em] text-hud-soft">
        <SideDot side={side} />
        {children}
    </h3>
);

function BattleColumns() {
    const t = useTranslations('battle.sides');

    const {
        roster: { allies, enemies },
    } = useBattleScene();

    return (
        <>
            <div className="min-w-0">
                <H3 side={ParticipantSide.ALLY}>
                    {t('alliesCount', { count: allies.length })}
                </H3>
                <ParticipantList side={ParticipantSide.ALLY} className="px-0" />
            </div>
            <div className="min-w-0">
                <H3 side={ParticipantSide.ENEMY}>
                    {t('enemiesCount', { count: enemies.length })}
                </H3>
                <ParticipantList
                    side={ParticipantSide.ENEMY}
                    className="px-0"
                />
            </div>
        </>
    );
}

export function DesktopBattleLayout({
    onComplete,
}: {
    onComplete: () => void;
}) {
    const t = useTranslations('battle.drawers');

    const {
        battle,
        battleId,
        awaiting,
        intents,
        log,
        roster: { hero },
        turn: { current, isMyTurn },
        viewer: { isDM, readOnly },
    } = useBattleScene();

    const onReorder = useTrackReorder();

    const [storedMode, setViewMode] = useBattleViewMode(battleId);

    const viewMode = intents.mapAim || intents.mapPick ? 'map' : storedMode;

    const [mapBusy, setMapBusy] = useState(false);

    const [toolsSlot, setToolsSlot] = useState<HTMLDivElement | null>(null);

    const [resultSlot, setResultSlot] = useState<HTMLDivElement | null>(null);

    const [slots, setSlots] = useState<SceneSlots>(EMPTY_SCENE_SLOTS);

    const bindDock = useCallback(
        (el: HTMLDivElement | null) =>
            setSlots((prev) => (prev.dock === el ? prev : { dock: el })),
        []
    );

    const [drawer, setDrawer] = useState<Exclude<DrawerKey, 'log'> | null>(
        null
    );

    const [seenLogOpen, setSeenLogOpen] = useState(log.open);

    if (log.open !== seenLogOpen) {
        setSeenLogOpen(log.open);

        if (log.open) setDrawer(null);
    }

    const active: DrawerKey | null = log.open ? 'log' : drawer;

    const toggle = (key: DrawerKey) => {
        if (key === 'log') {
            setDrawer(null);

            if (log.open) log.close();
            else log.show();

            return;
        }

        if (log.open) log.close();

        setDrawer((prev) => (prev === key ? null : key));
    };

    const closeDrawer = (key: Exclude<DrawerKey, 'log'>) => (open: boolean) =>
        setDrawer((prev) => (open ? key : prev === key ? null : prev));

    return (
        <SceneSlotsContext value={slots}>
            <MapStripSlotContext value={resultSlot}>
                <div className="scene-full flex flex-col overflow-hidden">
                    <ConnectionBanner />
                    <BattleTopBar inline />
                    {battle.status === BattleStatus.COMPLETED && (
                        <BattleOverBanner />
                    )}
                    {awaiting && <AwaitingDmBanner />}
                    <div className="flex h-20 items-center border-y border-white/[.08]">
                        <div className="min-w-0 flex-1">
                            <InitiativeTrack onReorder={onReorder} />
                        </div>
                        <div className="w-[420px] shrink-0">
                            <LastActionTicker onOpenLog={() => log.show()} />
                        </div>
                    </div>
                    <div className="relative flex min-h-0 flex-1 flex-col">
                        {battle.map && viewMode === 'map' ? (
                            <main className="min-h-0 flex-1">
                                <MapToolsSlotContext.Provider value={toolsSlot}>
                                    <BattleMapPanel onBusyChange={setMapBusy} />
                                </MapToolsSlotContext.Provider>
                            </main>
                        ) : (
                            <main className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-y-auto px-6 py-4">
                                <BattleColumns />
                            </main>
                        )}
                        <TokenBubble mapBusy={mapBusy} />
                        {hero && (
                            <div className="pointer-events-none absolute bottom-3 left-3 z-20">
                                <HeroCluster hero={hero} />
                            </div>
                        )}
                        {hero &&
                            showDock(hero, readOnly) &&
                            battle.status === BattleStatus.ACTIVE &&
                            (isMyTurn ? (
                                <MyTurnControls
                                    key={myTurnKey(hero, battle.currentRound)}
                                    hero={hero}
                                    dock
                                />
                            ) : (
                                current && (
                                    <DockWaiting
                                        name={current.basicInfo.name}
                                    />
                                )
                            ))}
                        <DockNextTurn />
                        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex flex-col items-end justify-center *:pointer-events-auto">
                            <DrawerRail active={active} onToggle={toggle} />
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center *:pointer-events-auto">
                            <div ref={setResultSlot} />
                            <div
                                ref={bindDock}
                                className="flex flex-col items-center"
                            />
                        </div>
                    </div>
                    <ActionResultCard />
                    {isDM && !readOnly && (
                        <DmPanel
                            panel={{
                                open: drawer === 'dm',
                                onOpenChange: closeDrawer('dm'),
                            }}
                        />
                    )}
                    <BattleDrawer
                        drawer="log"
                        open={log.open}
                        onOpenChange={(o) => !o && log.close()}
                        title={t('log')}
                    >
                        <BattleLog key={log.focus ?? 'latest'} />
                    </BattleDrawer>
                    {battle.map && (
                        <BattleDrawer
                            drawer="reserve"
                            open={drawer === 'reserve'}
                            onOpenChange={closeDrawer('reserve')}
                            title={t('reserve')}
                        >
                            <ReserveGroup />
                        </BattleDrawer>
                    )}
                    <ToolsDrawer
                        open={drawer === 'tools'}
                        onOpenChange={closeDrawer('tools')}
                        onComplete={onComplete}
                        view={{ mode: viewMode, set: setViewMode }}
                        onToolsSlot={setToolsSlot}
                    />
                </div>
            </MapStripSlotContext>
        </SceneSlotsContext>
    );
}
