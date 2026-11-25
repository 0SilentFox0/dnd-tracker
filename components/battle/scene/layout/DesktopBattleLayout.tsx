'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { AwaitingDmBanner } from '../banners/AwaitingDmBanner';
import { BattleOverBanner } from '../banners/BattleOverBanner';
import { ConnectionBanner } from '../banners/ConnectionBanner';
import { BattleDrawer } from '../drawers/BattleDrawer';
import { DrawerRail } from '../drawers/DrawerRail';
import { ToolsDrawer } from '../drawers/ToolsDrawer';
import { BattleTopBar } from './BattleTopBar';
import { HudBlock, HudRestoreButton } from './HudBlock';
import { InNoticeStack, MapStripSlotContext } from './MapStrip';
import {
    EMPTY_SCENE_SLOTS,
    type SceneSlots,
    SceneSlotsContext,
} from './SceneSlots';

import { SideDot } from '@/components/battle/hud';
import { BattleLog } from '@/components/battle/log/BattleLog';
import { TokenBubble } from '@/components/battle/map/bubble/TokenBubble';
import { BattleMapPanel } from '@/components/battle/map/panels/BattleMapPanel';
import {
    MapPreviewSlotContext,
    MapToolsSlotContext,
} from '@/components/battle/map/panels/MapToolsSlot';
import { HeroCluster } from '@/components/battle/participants/hero/HeroCluster';
import { InitiativeTrack } from '@/components/battle/participants/InitiativeTrack';
import { ParticipantList } from '@/components/battle/participants/ParticipantList';
import { ReserveGroup } from '@/components/battle/participants/ReservePanel';
import { TurnDock } from '@/components/battle/turn/dock/TurnDock';
import { BattleStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    useBattleScene,
    useBattleViewMode,
    useHudHotkey,
    useSceneDrawers,
    useTrackReorder,
} from '@/lib/hooks/battle';

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
        roster: { hero, reserve },
        viewer: { isDM, readOnly },
    } = useBattleScene();

    const onReorder = useTrackReorder();

    useHudHotkey();

    const [storedMode, setViewMode] = useBattleViewMode(battleId);

    const viewMode = intents.mapAim || intents.mapPick ? 'map' : storedMode;

    const [mapBusy, setMapBusy] = useState(false);

    const [toolsSlot, setToolsSlot] = useState<HTMLDivElement | null>(null);

    const [previewSlot, setPreviewSlot] = useState<HTMLDivElement | null>(null);

    const [resultSlot, setResultSlot] = useState<HTMLDivElement | null>(null);

    const [slots, setSlots] = useState<SceneSlots>(EMPTY_SCENE_SLOTS);

    const bindDock = useCallback((el: HTMLDivElement | null) => {
        setSlots((prev) => (prev.dock === el ? prev : { dock: el }));

        if (!el) return;

        return () =>
            setSlots((prev) => (prev.dock === el ? { dock: null } : prev));
    }, []);

    const rootRef = useRef<HTMLDivElement>(null);

    const observeHeight = useCallback(
        (cssVar: string) => (el: HTMLDivElement | null) => {
            if (!el || typeof ResizeObserver === 'undefined') return;

            const ro = new ResizeObserver(() =>
                rootRef.current?.style.setProperty(
                    cssVar,
                    `${el.offsetHeight}px`
                )
            );

            ro.observe(el);

            return () => ro.disconnect();
        },
        []
    );

    useEffect(() => {
        const rail = rootRef.current?.querySelector<HTMLElement>(
            '[data-hud-block="tools"]'
        );

        if (!rail || typeof ResizeObserver === 'undefined') return;

        const ro = new ResizeObserver(() =>
            rootRef.current?.style.setProperty(
                '--hud-rail-w',
                `${rail.offsetWidth}px`
            )
        );

        ro.observe(rail);

        return () => ro.disconnect();
    }, []);

    const bindColumn = useMemo(
        () => observeHeight('--hud-dock-h'),
        [observeHeight]
    );

    const { drawer, active, toggle, onOpenChange } = useSceneDrawers(log);

    const sideOpen =
        active !== null && !(active === 'reserve' && reserve.length === 0);

    return (
        <SceneSlotsContext value={slots}>
            <MapStripSlotContext value={resultSlot}>
                <div
                    ref={rootRef}
                    style={
                        {
                            '--hud-side-w': sideOpen ? '340px' : '0px',
                        } as React.CSSProperties
                    }
                    className="scene-full relative flex flex-col overflow-hidden"
                >
                    <div className="relative min-h-0 flex-1">
                        {battle.map && viewMode === 'map' ? (
                            <main className="absolute inset-0">
                                <MapToolsSlotContext.Provider value={toolsSlot}>
                                    <MapPreviewSlotContext.Provider
                                        value={previewSlot}
                                    >
                                        <BattleMapPanel
                                            onBusyChange={setMapBusy}
                                        />
                                    </MapPreviewSlotContext.Provider>
                                </MapToolsSlotContext.Provider>
                            </main>
                        ) : (
                            <main className="absolute inset-0 grid grid-cols-2 content-start gap-6 overflow-y-auto pt-28 pr-6 pb-40 pl-6">
                                <BattleColumns />
                            </main>
                        )}
                        <BattleTopBar />
                        <HudBlock
                            block="initiative"
                            edge="top"
                            align="center"
                            className="pointer-events-none absolute top-2 left-1/2 z-20 w-[min(560px,calc(100%-2*max(240px,var(--hud-side-w,0px))))] -translate-x-1/2"
                        >
                            <div className="pointer-events-auto mx-auto w-fit max-w-full">
                                <InitiativeTrack onReorder={onReorder} />
                            </div>
                        </HudBlock>
                        <InNoticeStack>
                            <ConnectionBanner />
                            {battle.status === BattleStatus.COMPLETED && (
                                <BattleOverBanner />
                            )}
                            {awaiting && <AwaitingDmBanner />}
                        </InNoticeStack>
                        <TokenBubble mapBusy={mapBusy} />
                        {hero && (
                            <HudBlock
                                block="hero"
                                edge="bottom"
                                align="end"
                                className="pointer-events-none absolute bottom-3 left-3 z-20"
                            >
                                <HeroCluster hero={hero} />
                            </HudBlock>
                        )}
                        <TurnDock />
                        <HudRestoreButton />
                        <HudBlock
                            block="tools"
                            edge="right"
                            className="pointer-events-none absolute top-2 right-3 z-50 gap-1.5"
                        >
                            <DrawerRail active={active} onToggle={toggle} />
                        </HudBlock>
                        <div
                            ref={bindColumn}
                            className="pointer-events-none absolute right-[calc(0.75rem+var(--hud-side-w,0px))] bottom-3 z-20 flex w-[min(370px,calc(100%-24px-var(--hud-side-w,0px)))] flex-col items-stretch gap-2"
                        >
                            <div
                                ref={setResultSlot}
                                className="pointer-events-auto empty:hidden"
                            />
                            <HudBlock block="dock" edge="bottom" align="end">
                                <div
                                    ref={bindDock}
                                    className="pointer-events-none flex flex-col items-stretch gap-2 *:pointer-events-auto"
                                />
                            </HudBlock>
                        </div>
                    </div>
                    <ActionResultCard />
                    {isDM && !readOnly && (
                        <DmPanel
                            panel={{
                                open: drawer === 'dm',
                                onOpenChange: onOpenChange('dm'),
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
                            open={drawer === 'reserve' && reserve.length > 0}
                            onOpenChange={onOpenChange('reserve')}
                            title={t('reserve')}
                        >
                            <ReserveGroup />
                        </BattleDrawer>
                    )}
                    <ToolsDrawer
                        panel={{
                            open: drawer === 'tools',
                            onOpenChange: onOpenChange('tools'),
                        }}
                        onComplete={onComplete}
                        view={{ mode: viewMode, set: setViewMode }}
                        onToolsSlot={setToolsSlot}
                        onPreviewSlot={setPreviewSlot}
                        onOpenDrawer={toggle}
                    />
                </div>
            </MapStripSlotContext>
        </SceneSlotsContext>
    );
}
