'use client';

import { Fragment, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

import { MapFogToolbar } from './fog/MapFogToolbar';
import { BattleMap } from './BattleMap';
import { MapBackgroundPanel } from './MapBackgroundPanel';
import { MapMotionPanel } from './MapMotionPanel';
import { MapTerrainToolbar } from './MapTerrainToolbar';
import { useMapToolsSlot } from './MapToolsSlot';
import { MapWeatherPicker } from './MapWeatherPicker';

import { modeUiOf } from '@/components/battle/modes';
import { useSystemFx } from '@/components/battle/use-system-battle-ui';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import { type MapUpdateTool, useBattleMapScene } from '@/lib/hooks/battle';
import { useFogMemory } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { fogView } from '@/lib/utils/battle/fog/fog-view';
import { activeModeWithConfig } from '@/lib/utils/battle/modes';
import { deriveTileCells } from '@/lib/utils/battle/tiles/derive';

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

    const [viewAsParticipantId, setViewAsParticipantId] = useState('');

    const [shareVision, setShareVision] = useState(false);

    const { placement, terrainTool, fogTool, weatherTool, motionTool, backgroundTool } =
        scene;

    const modeTools = phone ? null : scene.modeTools;

    const ui = modeUiOf(scene.map);

    const hasDoors = Object.keys(scene.map.doors ?? {}).length > 0;

    const viewAsParticipant = scene.participants.find(
        (participant) => participant.basicInfo.id === viewAsParticipantId
    );

    const viewAsUserId = viewAsParticipant?.basicInfo.controlledBy ?? scene.viewer.userId;

    const isPlayerPreview = scene.viewer.isDM && !!viewAsParticipant;

    const fogState = scene.battle.mapState?.fog;

    const fogMode = scene.map.maze ? 'off' : (fogState?.mode ?? 'off');

    const tileCatalog = useMemo(() => Object.fromEntries(
        TILE_CATALOG.map((tile) => [tile.id, {
            blocks: tile.blocks,
            blocksSight: tile.blocksSight,
            footprint: tile.footprint,
        }])
    ), []);

    const tileBlocksSight = useMemo(() => scene.tileChunks
        ? deriveTileCells({
              chunks: scene.tileChunks,
              cols: scene.map.cols,
              rows: scene.map.rows,
              version: scene.tileVersion ?? 0,
          }, tileCatalog).blocksSight
        : undefined, [scene.tileChunks, scene.map.cols, scene.map.rows, scene.tileVersion, tileCatalog]);

    const currentFogView = useMemo(() => fogView({
        map: scene.map,
        participants: scene.participants,
        mode: fogMode,
        viewerId: viewAsUserId,
        isDM: scene.viewer.isDM && !isPlayerPreview,
        revealed: fogState?.revealed ?? [],
        radius: fogState?.visionRadius ?? 8,
        tileBlocksSight,
        shareAllies: shareVision,
    }), [scene.map, scene.participants, fogMode, viewAsUserId, scene.viewer.isDM, isPlayerPreview, fogState, tileBlocksSight, shareVision]);

    const memory = useFogMemory({
        battleId: scene.battle.id,
        viewerId: isPlayerPreview ? `dm-preview:${viewAsUserId}` : (viewAsUserId ?? 'anonymous'),
        size: { cols: scene.map.cols, rows: scene.map.rows },
        visible: currentFogView.visible,
        enabled: fogMode === 'vision' && (!scene.viewer.isDM || isPlayerPreview),
    });

    const mapFogView = useMemo(() => fogView({
        map: scene.map,
        participants: scene.participants,
        mode: fogMode,
        viewerId: viewAsUserId,
        isDM: scene.viewer.isDM && !isPlayerPreview,
        revealed: fogState?.revealed ?? [],
        radius: fogState?.visionRadius ?? 8,
        explored: memory.explored,
        tileBlocksSight,
        shareAllies: shareVision,
    }), [scene.map, scene.participants, fogMode, viewAsUserId, scene.viewer.isDM, isPlayerPreview, fogState, memory.explored, tileBlocksSight, shareVision]);

    const visibleParticipants = scene.participants.filter((participant) =>
        mapFogView.visibleIds.has(participant.basicInfo.id)
    );

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
                phone ? 'w-full shrink-0 px-1 pb-1' : !inRow && 'absolute top-2 left-2'
            )}
        >
            <div className={cn('flex flex-wrap gap-1.5', phone && 'w-full')}>
                <ModeButton
                    active={placement.active}
                    onClick={placement.toggle}
                    tall={inRow}
                >
                    {t('place')}
                </ModeButton>
                {fogTool && (
                    <ModeButton
                        active={fogTool.active}
                        onClick={fogTool.toggle}
                        tall={inRow}
                    >
                        {fogT('label')}
                    </ModeButton>
                )}
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
            {(terrainTool.active || palettes.some((p) => p.tool.active) || fogTool?.active) && (
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
        <div
            className={cn(
                'z-20 flex max-w-full flex-wrap items-center gap-1.5 text-xs',
                phone ? 'shrink-0 px-1 pb-1' : 'absolute top-2 right-2'
            )}
        >
            {scene.viewer.isDM && (
                <label className="flex min-w-0 items-center gap-1 rounded-md border border-hud-rule bg-black/70 px-2 py-1 text-hud-muted">
                    {fogT('preview')}
                    <select
                        aria-label={fogT('preview')}
                        value={viewAsParticipantId}
                        onChange={(event) => setViewAsParticipantId(event.target.value)}
                        className="max-w-40 bg-black text-white"
                    >
                        <option value="">{fogT('dmView')}</option>
                        {scene.participants
                            .filter(
                                (participant) =>
                                    !participant.battleData.reserved &&
                                    participant.basicInfo.controlledBy !== CONTROLLED_BY_DM
                            )
                            .map((participant) => (
                                <option key={participant.basicInfo.id} value={participant.basicInfo.id}>
                                    {participant.basicInfo.name}
                                </option>
                            ))}
                    </select>
                </label>
            )}
            {(fogMode === 'vision' && (!scene.viewer.isDM || isPlayerPreview)) && (
                <label className="flex items-center gap-1 rounded-md border border-hud-rule bg-black/70 px-2 py-1 text-hud-muted">
                    <input
                        type="checkbox"
                        checked={memory.remember}
                        onChange={(event) => memory.setRemember(event.target.checked)}
                    />
                    {fogT('remember')}
                </label>
            )}
            {fogMode === 'vision' && (
                <label className="flex items-center gap-1 rounded-md border border-hud-rule bg-black/70 px-2 py-1 text-hud-muted">
                    <input
                        type="checkbox"
                        checked={shareVision}
                        onChange={(event) => setShareVision(event.target.checked)}
                    />
                    {fogT('shareAllies')}
                </label>
            )}
        </div>
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
                participants={visibleParticipants}
                view={scene.view}
                actions={
                    scene.fogTool?.active
                        ? {
                              ...scene.actions,
                              onCellClick:
                                  scene.fogTool.brush === 'rectangle' ||
                                  scene.fogTool.brush === 'room'
                                      ? scene.fogTool.onCell
                                      : undefined,
                          }
                        : scene.actions
                }
                editing={{
                    strokeTool: terrainTool?.active && !terrainTool.edges,
                    edges: terrainTool?.edges,
                    doors: scene.doors,
                    mode: modeTools,
                    fog: fogTool
                        ? {
                              mode: fogMode,
                              revealed: fogState?.revealed ?? [],
                              visible: mapFogView.visible,
                              explored: fogMode === 'vision' ? mapFogView.explored : mapFogView.visible,
                              dmEditing: scene.viewer.isDM && !isPlayerPreview,
                              active: fogTool.active,
                              brush: fogTool.brush,
                              onStroke: fogTool.applyCells,
                          }
                        : {
                              mode: fogMode,
                              revealed: fogState?.revealed ?? [],
                              visible: mapFogView.visible,
                              explored: fogMode === 'vision' ? mapFogView.explored : mapFogView.visible,
                              dmEditing: scene.viewer.isDM && !isPlayerPreview,
                              active: false,
                              brush: 'brush',
                              onStroke: () => undefined,
                          },
                }}
                phone={phone}
                className={phone ? 'min-h-0 flex-1' : 'h-full'}
            />
            {!phone && (inRow ? tools && createPortal(tools, slot) : tools)}
            {!phone && fogControls}
        </div>
    );
}
