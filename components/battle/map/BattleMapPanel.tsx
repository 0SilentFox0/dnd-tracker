'use client';

import { Fragment, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { MapFogToolbar } from './fog/MapFogToolbar';
import { BattleMap } from './BattleMap';
import { MapBackgroundPanel } from './MapBackgroundPanel';
import { MapFogControls } from './MapFogControls';
import { MapMotionPanel } from './MapMotionPanel';
import { MapTerrainToolbar } from './MapTerrainToolbar';
import { useMapToolsSlot } from './MapToolsSlot';
import { MapWeatherPicker } from './MapWeatherPicker';

import { modeUiOf } from '@/components/battle/modes';
import { useSystemFx } from '@/components/battle/use-system-battle-ui';
import { HudToggleChip } from '@/components/hud';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import { type MapUpdateTool, useBattleMapScene } from '@/lib/hooks/battle';
import { useBattleMapFog } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { activeModeWithConfig } from '@/lib/utils/battle/modes';

function UpdateMapButton({
    tool,
    tall,
}: {
    tool: MapUpdateTool;
    tall: boolean;
}) {
    const t = useTranslations('battle.map.update');

    return (
        <Button
            variant="outline"
            disabled={!tool.available || tool.pending}
            title={tool.available ? undefined : t('upToDate')}
            onClick={() => void tool.run()}
            className={cn(
                tall ? 'h-8' : 'h-7',
                'bg-black/60 px-2 text-xs text-hud-muted',
                tool.available && 'border-[var(--gold)] text-hud-gold-bright'
            )}
        >
            {t('button')}
        </Button>
    );
}

export function BattleMapPanel({ phone = false }: { phone?: boolean }) {
    const scene = useBattleMapScene(useSystemFx());

    if (!scene) return null;

    return <BattleMapPanelContent phone={phone} scene={scene} />;
}

function BattleMapPanelContent({
    phone,
    scene,
}: {
    phone: boolean;
    scene: NonNullable<ReturnType<typeof useBattleMapScene>>;
}) {
    const t = useTranslations('battle.map.tools');

    const cameraT = useTranslations('battle.map.camera');

    const fogT = useTranslations('battle.map.fog');

    const slot = useMapToolsSlot();

    const { fogTool, placement, terrainTool, weatherTool, motionTool, backgroundTool } =
        scene;

    const modeTools = phone ? null : scene.modeTools;

    const ui = modeUiOf(scene.map);

    const hasDoors = Object.keys(scene.map.doors ?? {}).length > 0;

    const fog = useBattleMapFog(scene);

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
        <div
            className={cn(
                'z-20 flex flex-col items-start gap-1.5',
                phone ? 'w-full shrink-0 px-1 pb-1' : !inRow && 'absolute top-2 left-2'
            )}
        >
            <div className={cn('flex flex-wrap gap-1.5', phone && 'w-full')}>
                <HudToggleChip
                    active={placement.active}
                    onClick={placement.toggle}
                    tall={inRow}
                >
                    {t('place')}
                </HudToggleChip>
                {fogTool && (
                    <HudToggleChip
                        active={fogTool.active}
                        onClick={fogTool.toggle}
                        tall={inRow}
                    >
                        {fogT('label')}
                    </HudToggleChip>
                )}
                {modeTools && ui?.Toolbar && (
                    <ui.Toolbar tools={modeTools.raw} tall={inRow} />
                )}
                {scene.followTurn && (
                    <HudToggleChip
                        active={scene.followTurn.on}
                        onClick={scene.followTurn.toggle}
                        title={cameraT('followHint')}
                        tall={inRow}
                    >
                        {cameraT('follow')}
                    </HudToggleChip>
                )}
                <HudToggleChip
                    active={terrainTool.active}
                    onClick={terrainTool.toggle}
                    tall={inRow}
                    hidden={!!ui?.hidesTerrain}
                >
                    {t('terrain')}
                </HudToggleChip>
                {palettes.map(({ key, tool }) => (
                    <HudToggleChip
                        key={key}
                        active={tool.active}
                        onClick={tool.toggle}
                        tall={inRow}
                    >
                        {t(key)}
                    </HudToggleChip>
                ))}
                {scene.mapUpdate && (
                    <UpdateMapButton tool={scene.mapUpdate} tall={inRow} />
                )}
            </div>
            {(terrainTool.active || palettes.some((p) => p.tool.active) || fogTool?.active) && (
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
                    {fogTool?.active && <MapFogToolbar tool={fogTool} />}
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

    const fogControls = (
        <MapFogControls
            fog={fog}
            participants={scene.participants}
            isDM={scene.viewer.isDM}
            phone={phone}
        />
    );

    const look = useMemo(
        () => ({
            className: phone ? 'min-h-0 flex-1' : 'h-full',
            tiles:
                scene.tileChunks && scene.battle.mapRef
                    ? {
                          mapId: scene.battle.mapRef.mapId,
                          version:
                              scene.tileVersion ?? scene.battle.mapRef.version,
                          seed: scene.battle.mapRef.mapId,
                          chunks: scene.tileChunks,
                          assets: {},
                      }
                    : undefined,
        }),
        [phone, scene.tileChunks, scene.battle.mapRef, scene.tileVersion]
    );

    const { actions } = scene;

    const mapActions = useMemo(
        () =>
            fogTool?.active
                ? {
                      ...actions,
                      onCellClick:
                          fogTool.brush === 'rectangle' ||
                          fogTool.brush === 'room'
                              ? fogTool.onCell
                              : undefined,
                  }
                : actions,
        [actions, fogTool]
    );

    const strokeTool = terrainTool?.active && !terrainTool.edges;

    const terrainEdges = terrainTool?.edges;

    const editing = useMemo(
        () => ({
            strokeTool,
            edges: terrainEdges,
            doors: scene.doors,
            mode: modeTools,
            fog: fog.editing,
        }),
        [strokeTool, terrainEdges, scene.doors, modeTools, fog.editing]
    );

    return (
        <div
            data-tour="battle.map"
            className={cn('relative h-full', phone && 'flex flex-col')}
        >
            {phone && tools}
            {phone && fogControls}
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
                participants={fog.visibleParticipants}
                view={scene.view}
                actions={mapActions}
                editing={editing}
                look={look}
                phone={phone}
            />
            {!phone && (inRow ? tools && createPortal(tools, slot) : tools)}
            {!phone && fogControls}
        </div>
    );
}
