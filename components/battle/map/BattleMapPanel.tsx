'use client';

import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { BattleMap } from './BattleMap';
import { MapBackgroundPanel } from './MapBackgroundPanel';
import { MapMotionPanel } from './MapMotionPanel';
import { MapTerrainToolbar } from './MapTerrainToolbar';
import { useMapToolsSlot } from './MapToolsSlot';
import { MapWeatherPicker } from './MapWeatherPicker';

import { modeUiOf } from '@/components/battle/modes';
import { useSystemFx } from '@/components/battle/use-system-battle-ui';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { type MapUpdateTool, useBattleMapScene } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { activeModeWithConfig } from '@/lib/utils/battle/modes';

function ModeButton({
    active,
    onClick,
    tall,
    hidden,
    title,
    children,
}: {
    active: boolean;
    onClick: () => void;
    tall: boolean;
    hidden?: boolean;
    title?: string;
    children: string;
}) {
    return (
        <button
            type="button"
            hidden={hidden}
            title={title}
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                tall ? 'h-8' : 'h-7',
                'rounded-md border bg-black/60 px-2 text-xs hover:bg-black/80',
                active
                    ? 'border-[var(--gold)] text-hud-gold-bright'
                    : 'border-hud-rule text-hud-muted'
            )}
        >
            {children}
        </button>
    );
}

function UpdateMapButton({
    tool,
    tall,
}: {
    tool: MapUpdateTool;
    tall: boolean;
}) {
    const t = useTranslations('battle.map.update');

    return (
        <button
            type="button"
            disabled={!tool.available || tool.pending}
            title={tool.available ? undefined : t('upToDate')}
            onClick={() => void tool.run()}
            className={cn(
                tall ? 'h-8' : 'h-7',
                'rounded-md border border-hud-rule bg-black/60 px-2 text-xs text-hud-muted hover:bg-black/80 disabled:opacity-50',
                tool.available && 'border-[var(--gold)] text-hud-gold-bright'
            )}
        >
            {t('button')}
        </button>
    );
}

export function BattleMapPanel({ phone = false }: { phone?: boolean }) {
    const t = useTranslations('battle.map.tools');

    const cameraT = useTranslations('battle.map.camera');

    const scene = useBattleMapScene(useSystemFx());

    const slot = useMapToolsSlot();

    if (!scene) return null;

    const { placement, terrainTool, weatherTool, motionTool, backgroundTool } =
        scene;

    const modeTools = phone ? null : scene.modeTools;

    const ui = modeUiOf(scene.map);

    const hasDoors = Object.keys(scene.map.doors ?? {}).length > 0;

    const inRow = !phone && !!slot;

    const palettes =
        weatherTool &&
        motionTool &&
        backgroundTool &&
        ([
            {
                key: 'weather',
                tool: weatherTool,
                panel: <MapWeatherPicker tool={weatherTool} />,
            },
            {
                key: 'motion',
                tool: motionTool,
                panel: <MapMotionPanel tool={motionTool} />,
            },
            {
                key: 'background',
                tool: backgroundTool,
                panel: <MapBackgroundPanel tool={backgroundTool} />,
            },
        ] as const);

    const tools = placement && terrainTool && palettes && (
        // на телефоні карта займає всю ширину, тож кнопки йдуть рядком над нею, а не поверх клітинок
        <div
            className={cn(
                'z-20 flex flex-col items-start gap-1.5',
                phone ? 'shrink-0 px-1 pb-1' : !inRow && 'absolute top-2 left-2'
            )}
        >
            <div className="flex flex-wrap gap-1.5">
                <ModeButton
                    active={placement.active}
                    onClick={placement.toggle}
                    tall={inRow}
                >
                    {t('place')}
                </ModeButton>
                {modeTools && ui?.Toolbar && (
                    <ui.Toolbar tools={modeTools.raw} tall={inRow} />
                )}
                {scene.followTurn && (
                    <ModeButton
                        active={scene.followTurn.on}
                        onClick={scene.followTurn.toggle}
                        title={cameraT('followHint')}
                        tall={inRow}
                    >
                        {cameraT('follow')}
                    </ModeButton>
                )}
                <ModeButton
                    active={terrainTool.active}
                    onClick={terrainTool.toggle}
                    tall={inRow}
                    hidden={!!ui?.hidesTerrain}
                >
                    {t('terrain')}
                </ModeButton>
                {palettes.map(({ key, tool }) => (
                    <ModeButton
                        key={key}
                        active={tool.active}
                        onClick={tool.toggle}
                        tall={inRow}
                    >
                        {t(key)}
                    </ModeButton>
                ))}
                {scene.mapUpdate && (
                    <UpdateMapButton tool={scene.mapUpdate} tall={inRow} />
                )}
            </div>
            {(terrainTool.active || palettes.some((p) => p.tool.active)) && (
                // у рядку над картою палітра звисає вниз на карту, не зсуваючи й не перекриваючи перемикач вигляду
                <div
                    className={cn(
                        'flex flex-col items-start gap-1.5',
                        inRow && 'absolute inset-x-3 top-full z-30 mt-1'
                    )}
                >
                    {terrainTool.active && (
                        <MapTerrainToolbar
                            tool={terrainTool}
                            edgesInMode={!!activeModeWithConfig(scene.map)}
                            edgesLinked={scene.edgesLinked}
                        />
                    )}
                    {palettes.map(
                        ({ key, tool, panel }) =>
                            tool.active && (
                                <Fragment key={key}>{panel}</Fragment>
                            )
                    )}
                </div>
            )}
            {modeTools?.paletteOpen && ui?.EditPalette && (
                <div
                    className={cn(
                        inRow && 'absolute inset-x-3 top-full z-30 mt-1'
                    )}
                >
                    <ui.EditPalette tools={modeTools.raw} />
                </div>
            )}
        </div>
    );

    return (
        <div
            data-tour="battle.map"
            className={cn('relative h-full', phone && 'flex flex-col')}
        >
            {phone && tools}
            {hasDoors && (
                <OnboardingHint
                    id="battle.map-doors"
                    className={cn(
                        'z-20 max-w-sm',
                        phone ? 'mx-1 mb-1' : 'absolute bottom-2 left-2'
                    )}
                />
            )}
            <BattleMap
                map={scene.map}
                tiles={
                    scene.tileChunks && scene.battle.mapRef
                        ? {
                              mapId: scene.battle.mapRef.mapId,
                              version: scene.tileVersion ?? scene.battle.mapRef.version,
                              seed: scene.battle.mapRef.mapId,
                              chunks: scene.tileChunks,
                              assets: {},
                          }
                        : undefined
                }
                participants={scene.participants}
                view={scene.view}
                actions={scene.actions}
                editing={{
                    strokeTool: terrainTool?.active && !terrainTool.edges,
                    edges: terrainTool?.edges,
                    doors: scene.doors,
                    mode: modeTools,
                }}
                phone={phone}
                className={phone ? 'min-h-0 flex-1' : 'h-full'}
            />
            {!phone && (inRow ? tools && createPortal(tools, slot) : tools)}
        </div>
    );
}
