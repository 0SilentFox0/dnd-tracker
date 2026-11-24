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
import { ToolsDrawer } from '../drawers/ToolsDrawer';
import { BattleTopBar } from './BattleTopBar';
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
import { HeroCluster } from '@/components/battle/participants/hero/HeroCluster';
import { InitiativeTrack } from '@/components/battle/participants/InitiativeTrack';
import { ParticipantList } from '@/components/battle/participants/ParticipantList';
import { ReserveGroup } from '@/components/battle/participants/ReservePanel';
import { TurnDock } from '@/components/battle/turn/dock/TurnDock';
import { BattleStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    MAP_TAB,
    useBattleScene,
    useMobileBattleTabs,
    useSceneDrawers,
} from '@/lib/hooks/battle';
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
        roster: { hero },
        log,
        intents,
    } = useBattleScene();

    const hasMap = !!battle.map;

    const { tab, set: setTab } = useMobileBattleTabs({
        hasMap,
        mapAim: !!(intents.mapAim || intents.mapPick),
    });

    const mapView = hasMap && tab === MAP_TAB;

    const [mapBusy, setMapBusy] = useState(false);

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
                <div className="scene-full relative flex flex-col overflow-hidden">
                    <div className="relative min-h-0 flex-1">
                        {mapView ? (
                            <main className="absolute inset-0">
                                <BattleMapPanel
                                    phone
                                    onBusyChange={setMapBusy}
                                />
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
                        <div className="pointer-events-none absolute inset-x-2 top-12 z-20 flex flex-col gap-1 *:pointer-events-auto">
                            <div className="rounded-2xl border border-white/15 bg-black/60 backdrop-blur-sm">
                                <InitiativeTrack />
                            </div>
                            <div className="rounded-xl bg-black/60 backdrop-blur-sm">
                                <LastActionTicker
                                    onOpenLog={() => log.show()}
                                />
                            </div>
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
                        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex flex-col items-end justify-center *:pointer-events-auto">
                            <DrawerRail active={active} onToggle={toggle} />
                        </div>
                        <div
                            ref={setResultSlot}
                            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center *:pointer-events-auto"
                        />
                    </div>
                    {/* safe zone: the map ends above it, so tokens never sit under the dock */}
                    <div className="relative z-20 flex shrink-0 flex-col items-center gap-2 px-2 pt-2">
                        {hero && <HeroCluster hero={hero} />}
                        <div
                            ref={bindDock}
                            className="flex w-full flex-col items-center"
                        />
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
                            open={drawer === 'reserve'}
                            onOpenChange={onOpenChange('reserve')}
                            title={td('reserve')}
                        >
                            <ReserveGroup />
                        </BattleDrawer>
                    )}
                    <ToolsDrawer
                        open={drawer === 'tools'}
                        onOpenChange={onOpenChange('tools')}
                        onComplete={onComplete}
                        tabs={{ value: tab, set: setTab }}
                        audio={{ player: false }}
                    />
                </div>
            </MapStripSlotContext>
        </SceneSlotsContext>
    );
}
