'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Ellipsis } from 'lucide-react';

import { AwaitingDmBanner } from '../banners/AwaitingDmBanner';
import { BattleOverBanner } from '../banners/BattleOverBanner';
import { ConnectionBanner } from '../banners/ConnectionBanner';
import { BattleDrawer } from '../drawers/BattleDrawer';
import { DrawerRail } from '../drawers/DrawerRail';
import { ToolsDrawer } from '../drawers/ToolsDrawer';
import { BattleTopBar } from './BattleTopBar';
import { HudBlock } from './HudBlock';
import { InNoticeStack, MapStripSlotContext } from './MapStrip';
import {
    EMPTY_SCENE_SLOTS,
    type SceneSlots,
    SceneSlotsContext,
} from './SceneSlots';

import { AudioDock } from '@/components/audio/AudioDock';
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
import { HUD_GLASS, HudButton } from '@/components/hud';
import { BattleStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    MAP_TAB,
    useBattleScene,
    useMobileBattleTabs,
    useSceneDrawers,
    useTrackReorder,
} from '@/lib/hooks/battle';
import { useActiveDemoTour } from '@/lib/onboarding/active-demo-tour';
import { myTurnKey } from '@/lib/utils/battle/view';

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

export function MobileBattleLayout({
    onComplete,
}: {
    onComplete?: () => void;
}) {
    const td = useTranslations('battle.drawers');

    const {
        battle,
        awaiting,
        viewer: { isDM, readOnly },
        turn: { isMyTurn },
        roster: { hero, reserve },
        log,
        intents,
    } = useBattleScene();

    const onReorder = useTrackReorder();

    const hasMap = !!battle.map;

    const { tab, set: setTab } = useMobileBattleTabs({
        hasMap,
        mapAim: !!(intents.mapAim || intents.mapPick),
    });

    const mapView = hasMap && tab === MAP_TAB;

    const [mapBusy, setMapBusy] = useState(false);

    const [menuOpen, setMenuOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);

    const tourActive = useActiveDemoTour() !== null;

    const menuShown = menuOpen || tourActive;

    useEffect(() => {
        if (!menuOpen) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;

            e.preventDefault();

            setMenuOpen(false);
        };

        const onDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node))
                setMenuOpen(false);
        };

        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown);
        };
    }, [menuOpen]);

    const [toolsSlot, setToolsSlot] = useState<HTMLDivElement | null>(null);

    const [previewSlot, setPreviewSlot] = useState<HTMLDivElement | null>(null);

    const [resultSlot, setResultSlot] = useState<HTMLDivElement | null>(null);

    const [slots, setSlots] = useState<SceneSlots>(EMPTY_SCENE_SLOTS);

    const bindDock = useCallback(
        (el: HTMLDivElement | null) =>
            setSlots((prev) => (prev.dock === el ? prev : { dock: el })),
        []
    );

    const { drawer, active, toggle, onOpenChange } = useSceneDrawers(log);

    const turnKey =
        hero && isMyTurn ? myTurnKey(hero, battle.currentRound) : null;

    return (
        <SceneSlotsContext value={slots}>
            <MapStripSlotContext value={resultSlot}>
                <div className="scene-full relative overflow-hidden">
                    <div className="absolute inset-0">
                        {mapView ? (
                            <main className="absolute inset-0">
                                <MapToolsSlotContext.Provider value={toolsSlot}>
                                    <MapPreviewSlotContext.Provider
                                        value={previewSlot}
                                    >
                                        <BattleMapPanel
                                            phone
                                            onBusyChange={setMapBusy}
                                        />
                                    </MapPreviewSlotContext.Provider>
                                </MapToolsSlotContext.Provider>
                            </main>
                        ) : (
                            <main
                                data-participant-scroll
                                className="absolute inset-0 z-0 overflow-y-auto pt-40"
                            >
                                <ParticipantList
                                    side={
                                        tab === MAP_TAB
                                            ? ParticipantSide.ALLY
                                            : tab
                                    }
                                />
                            </main>
                        )}
                        <BattleTopBar />
                        <div className="pointer-events-none absolute inset-x-2 top-1 bottom-[7.5rem] z-20">
                            <HudBlock
                                ignoreAll
                                block="initiative"
                                edge="top"
                                className="static"
                                detachedButton="absolute top-0 left-1/2 -translate-x-1/2"
                            >
                                <div className="absolute top-[4.25rem] bottom-0 left-0 flex items-start">
                                    <InitiativeTrack
                                        compact
                                        vertical
                                        onReorder={onReorder}
                                    />
                                </div>
                            </HudBlock>
                        </div>
                        <InNoticeStack>
                            <ConnectionBanner />
                            {battle.status === BattleStatus.COMPLETED && (
                                <BattleOverBanner />
                            )}
                            {awaiting && <AwaitingDmBanner />}
                        </InNoticeStack>
                        <TokenBubble mapBusy={mapBusy} />
                        <AudioDock placement="strip" collapseOn={turnKey} />
                        <div
                            ref={menuRef}
                            className="absolute top-1 right-2 z-30 flex flex-row-reverse items-start gap-1.5"
                        >
                            <HudButton
                                type="button"
                                aria-label={td('more')}
                                title={td('more')}
                                aria-expanded={menuShown}
                                aria-haspopup="true"
                                onClick={() => setMenuOpen((v) => !v)}
                                className={`${HUD_GLASS} flex size-8 items-center justify-center rounded-lg text-[var(--ink)] focus-visible:ring-2 focus-visible:outline-none`}
                            >
                                <Ellipsis className="size-5" aria-hidden />
                            </HudButton>
                            {menuShown && (
                                <DrawerRail
                                    active={active}
                                    onToggle={(key) => {
                                        setMenuOpen(false);
                                        toggle(key);
                                    }}
                                />
                            )}
                        </div>
                        <div
                            ref={setResultSlot}
                            className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex flex-col items-center *:pointer-events-auto"
                        />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end gap-2 px-2 pt-2 pb-1 *:pointer-events-auto">
                        {hero && (
                            <HudBlock
                                ignoreAll
                                block="hero"
                                edge="left"
                                className="items-end gap-1"
                            >
                                <HeroCluster hero={hero} phone />
                            </HudBlock>
                        )}
                        <HudBlock
                            ignoreAll
                            block="dock"
                            edge="bottom"
                            align="end"
                            className="min-w-0 flex-1"
                        >
                            <div
                                ref={bindDock}
                                className="flex min-w-0 flex-col items-end"
                            />
                        </HudBlock>
                    </div>
                    <TurnDock />
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
                        title={td('log')}
                    >
                        <BattleLog key={log.focus ?? 'latest'} />
                    </BattleDrawer>
                    {hasMap && (
                        <BattleDrawer
                            drawer="reserve"
                            open={drawer === 'reserve' && reserve.length > 0}
                            onOpenChange={onOpenChange('reserve')}
                            title={td('reserve')}
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
                        tabs={{ value: tab, set: setTab }}
                        slots={{ tools: setToolsSlot, preview: setPreviewSlot }}
                        audio={{ player: false }}
                    />
                </div>
            </MapStripSlotContext>
        </SceneSlotsContext>
    );
}
