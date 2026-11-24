'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { AwaitingDmBanner } from '../banners/AwaitingDmBanner';
import { BattleOverBanner } from '../banners/BattleOverBanner';
import { ConnectionBanner } from '../banners/ConnectionBanner';
import { LastActionTicker } from '../banners/LastActionTicker';
import { BattleTopBar } from './BattleTopBar';
import {
    EMPTY_SCENE_SLOTS,
    type SceneSlotName,
    type SceneSlots,
    SceneSlotsContext,
} from './SceneSlots';

import { SideDot } from '@/components/battle/hud';
import { BattleMapPanel } from '@/components/battle/map/panels/BattleMapPanel';
import { MapToolsSlotContext } from '@/components/battle/map/panels/MapToolsSlot';
import { InitiativeTrack } from '@/components/battle/participants/InitiativeTrack';
import { ParticipantList } from '@/components/battle/participants/ParticipantList';
import { HudChipTabs } from '@/components/hud/page/HudChipTabs';
import { BattleStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    useBattleScene,
    useBattleViewMode,
    useTrackReorder,
} from '@/lib/hooks/battle';

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
    const t = useTranslations('battle.scene');

    const {
        battle,
        battleId,
        awaiting,
        intents,
    } = useBattleScene();

    const onReorder = useTrackReorder();

    const [storedMode, setViewMode] = useBattleViewMode(battleId);

    const viewMode = intents.mapAim || intents.mapPick ? 'map' : storedMode;

    const [toolsSlot, setToolsSlot] = useState<HTMLDivElement | null>(null);

    const [slots, setSlots] = useState<SceneSlots>(EMPTY_SCENE_SLOTS);

    const bindSlot = (name: SceneSlotName) => (el: HTMLDivElement | null) =>
        setSlots((prev) => (prev[name] === el ? prev : { ...prev, [name]: el }));

    return (
        <SceneSlotsContext value={slots}>
        <div className="scene-full flex flex-col overflow-hidden">
            <ConnectionBanner />
            <BattleTopBar onComplete={onComplete} />
            <div ref={bindSlot('top')} />
            {battle.status === BattleStatus.COMPLETED && <BattleOverBanner />}
            {awaiting && <AwaitingDmBanner />}
            <div className="flex h-20 items-center border-y border-white/[.08]">
                <div className="min-w-0 flex-1">
                    <InitiativeTrack onReorder={onReorder} />
                </div>
                <div className="w-[420px] shrink-0">
                    <LastActionTicker />
                </div>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col">
                {battle.map ? (
                    <main className="flex min-h-0 flex-col">
                        <div
                            data-tour="battle.map-tools"
                            className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1 pt-1"
                        >
                            <div
                                ref={setToolsSlot}
                                className="flex min-w-0 items-center"
                            />
                            <HudChipTabs
                                ariaLabel={t('viewMode')}
                                items={[
                                    {
                                        key: 'map',
                                        label: t('viewMap'),
                                        active: viewMode === 'map',
                                        onSelect: () => setViewMode('map'),
                                    },
                                    {
                                        key: 'columns',
                                        label: t('viewColumns'),
                                        active: viewMode === 'columns',
                                        onSelect: () => setViewMode('columns'),
                                    },
                                ]}
                            />
                        </div>
                        {viewMode === 'map' ? (
                            <div className="min-h-0 flex-1 p-1">
                                <MapToolsSlotContext.Provider value={toolsSlot}>
                                    <BattleMapPanel />
                                </MapToolsSlotContext.Provider>
                            </div>
                        ) : (
                            <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-y-auto px-6 py-4">
                                <BattleColumns />
                            </div>
                        )}
                    </main>
                ) : (
                    <main className="grid min-h-0 grid-cols-2 gap-6 overflow-y-auto px-6 py-4">
                        <BattleColumns />
                    </main>
                )}
                <div
                    ref={bindSlot('rail')}
                    className="pointer-events-none absolute inset-y-0 right-0 z-20 flex flex-col items-end justify-center gap-2 *:pointer-events-auto"
                />
                <div
                    ref={bindSlot('dock')}
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center *:pointer-events-auto"
                />
            </div>
        </div>
        </SceneSlotsContext>
    );
}
