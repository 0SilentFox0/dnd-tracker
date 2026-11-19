'use client';

import { memo, useMemo } from 'react';

import { DoorMenu } from './edges/DoorMenu';
import { EdgeEditor } from './edges/EdgeEditor';
import { MapFogLayer } from './fog/MapFogLayer';
import { type GridCellActions, GridLayer } from './grid/GridLayer';
import { DoorsLayer } from './layers/DoorsLayer';
import { MapBackground } from './layers/MapBackground';
import { StrokeLayer, TemplateLayer } from './layers/MapLayers';
import { MapTokensLayer } from './layers/MapTokensLayer';
import { WallsLayer } from './layers/WallsLayer';
import { MapEffectsLayer } from './tiles/MapEffectsLayer';
import { TileCanvas } from './tiles/TileCanvas';
import { RangedHint } from './tokens/RangedHint';
import { useMapStageTokens } from './tokens/useMapStageTokens';
import type { MapStageProps } from './map-stage-types';

import { modeUiOf } from '@/components/battle/modes';
import { UNIT } from '@/lib/utils/battle/grid';

export type {
    MapStageEditing,
    MapStageInteraction,
    MapStageLayout,
    MapStageProps,
} from './map-stage-types';

function MapStageImpl({
    map,
    participants,
    view,
    actions,
    editing,
    layout,
    interaction,
}: MapStageProps) {
    const { win, size, pxPerUnit, rotated, phone } = layout;

    const { tiles, window: gridWindow } = layout;

    const { painting, preview, svgRef, onStrokeStart, wasDragged } =
        interaction;

    const {
        clickableBlocked,
        showBlocked,
        mode: modeTools,
        edges,
        doors: doorsTool,
        doorLocks,
        fog,
        fogActive,
        showDefaultBackground = true,
    } = editing;

    const doorPress =
        doorsTool && !painting && !edges && !modeTools?.toolActive
            ? doorsTool.press
            : undefined;

    const menuDoor = doorsTool?.menu ? map.doors?.[doorsTool.menu] : undefined;

    const ui = modeUiOf(map);

    const modeView = view?.mode;

    const round = view?.round;

    const onCellClick = actions?.onCellClick;

    const onCellHover = actions?.onCellHover;

    const gridScene = useMemo(
        () => ({
            round,
            rotated,
            clickableBlocked,
            showBlocked,
            window: gridWindow,
        }),
        [round, rotated, clickableBlocked, showBlocked, gridWindow]
    );

    const cellActions = useMemo<GridCellActions>(
        () => ({
            onCellClick,
            onCellHover: fogActive ? undefined : onCellHover,
            wasDragged,
            svgRef,
        }),
        [fogActive, onCellClick, onCellHover, wasDragged, svgRef]
    );

    const { placed, onTokenClick, onTokenHover, movingId, from } =
        useMapStageTokens({
            map,
            participants,
            view,
            actions,
            size,
            pxPerUnit,
            wasDragged,
        });

    const trajectory = view?.trajectory ?? null;

    const tokensState = {
        rotated,
        painting,
        passAll: painting || !!edges || !!modeTools?.toolActive || !!fogActive,
        movingId,
    };

    const tokensHandlers = { onTokenClick, onTokenHover };

    return (
        <div
            className="absolute"
            style={{
                left: -win.x * UNIT * pxPerUnit,
                top: -win.y * UNIT * pxPerUnit,
                width: size.width * pxPerUnit,
                height: size.height * pxPerUnit,
            }}
        >
            {(map.background || showDefaultBackground) && (
                <MapBackground
                    map={map}
                    cellPx={UNIT * pxPerUnit}
                    phone={phone}
                    rotated={rotated}
                />
            )}
            {tiles && (
                <TileCanvas
                    tiles={tiles}
                    viewport={gridWindow}
                    cellPx={UNIT * pxPerUnit}
                />
            )}
            <svg
                ref={svgRef}
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${size.width} ${size.height}`}
                preserveAspectRatio="none"
                data-fx-grid=""
                data-cols={map.cols}
                data-rows={map.rows}
            >
                <GridLayer
                    map={map}
                    marks={view?.marks}
                    range={view?.range}
                    cellActions={cellActions}
                    onStrokeStart={painting ? onStrokeStart : undefined}
                    scene={gridScene}
                />
                <WallsLayer map={map} ghost={edges?.ghost} />
                {map.doors && Object.keys(map.doors).length > 0 && (
                    <DoorsLayer
                        doors={map.doors}
                        pxPerUnit={pxPerUnit}
                        rotated={rotated}
                        showLock={doorsTool?.showLock ?? doorLocks ?? false}
                        onPress={doorPress}
                    />
                )}
                {ui?.MapLayers && (
                    <ui.MapLayers
                        map={map}
                        view={modeView ?? null}
                        rotated={rotated}
                        editing={modeTools?.toolActive ? modeTools.raw : null}
                    />
                )}
                <TemplateLayer
                    marks={view?.marks}
                    aim={view?.aim}
                    pulseFrom={view?.pulseFrom}
                />
                {painting && (
                    <StrokeLayer
                        preview={preview}
                        pending={view?.pendingStroke}
                    />
                )}
                {edges && <EdgeEditor map={map} editing={edges} />}
                {from && trajectory && (
                    <RangedHint from={from.box} trajectory={trajectory} />
                )}
            </svg>
            {fog && (
                <MapFogLayer map={map} cellPx={UNIT * pxPerUnit} {...fog} />
            )}
            {doorsTool?.menu && menuDoor && (
                <DoorMenu
                    edge={doorsTool.menu}
                    door={menuDoor}
                    pxPerUnit={pxPerUnit}
                    rotated={rotated}
                    tool={doorsTool}
                />
            )}
            <MapTokensLayer
                placed={placed}
                view={view}
                actions={actions}
                state={tokensState}
                handlers={tokensHandlers}
            />
            {tiles && (
                <MapEffectsLayer
                    chunks={tiles.chunks}
                    window={gridWindow}
                    map={map}
                    cellPx={UNIT * pxPerUnit}
                />
            )}
        </div>
    );
}

export const MapStage = memo(MapStageImpl);
