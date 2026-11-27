'use client';

import { memo, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

import type { ArtPreviewState } from '../battle-map-types';
import { svgPoint } from './svg-point';

import { stampDef } from '@/lib/constants/map-art/stamps';
import { useStampSelection } from '@/lib/hooks/battle-maps';
import { gridOf, mapSize, unitOf } from '@/lib/utils/battle/grid';
import { parseCellKey } from '@/lib/utils/battle/grid/geometry';
import { cellPolygon } from '@/lib/utils/battle/grid/layout';
import { stampCells } from '@/lib/utils/battle/map-art/stamp-cells';
import { fromStampLocal, stampBox, stampCorners } from '@/lib/utils/battle/map-art/stamp-geometry';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { MapArtStamp } from '@/types/battle-map';

interface Props {
    stamps: MapArtStamp[];
    map: BattleMapConfig;
    editing: NonNullable<ArtPreviewState['stamps']>;
}

const HANDLE_R = unitOf(0.14);

const ROTATE_OFFSET = unitOf(0.6);

const ACCENT = '#f5c542';

export const ArtStampsLayer = memo(function ArtStampsLayer({
    stamps,
    map,
    editing,
}: Props) {
    const { mode, api } = editing;

    const grid = gridOf(map);

    const size = mapSize(map, grid);

    const sel = useStampSelection({ stamps, api });

    const rectRef = useRef<SVGRectElement>(null);

    const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

    const selectMode = mode === 'stamp-select';

    const selected = stamps.find((s) => s.id === api.selectedId);

    const onKey = sel.onKey;

    useEffect(() => {
        const handler = (e: KeyboardEvent) => void onKey(e);

        window.addEventListener('keydown', handler);

        return () => window.removeEventListener('keydown', handler);
    });

    const onWheel = sel.onWheel;

    useEffect(() => {
        const el = rectRef.current;

        if (!el || !selectMode) return;

        const handler = (e: WheelEvent) => {
            if (!api.selectedId) return;

            e.stopPropagation();
            e.preventDefault();
            onWheel(e.deltaY);
        };

        el.addEventListener('wheel', handler, { passive: false });

        return () => el.removeEventListener('wheel', handler);
    }, [selectMode, api.selectedId, onWheel]);

    const blocking = useMemo(
        () =>
            stampCells(
                api.showAllBlocking ? stamps : selected ? [selected] : [],
                map
            ).blocked,
        [api.showAllBlocking, stamps, selected, map]
    );

    const ghostDef = !selectMode && api.asset ? stampDef(api.asset) : undefined;

    const selDef = selected ? stampDef(selected.asset) : undefined;

    const box = selected && selDef ? stampBox(selected, selDef) : null;

    const corners = box ? stampCorners(box) : null;

    const rotHandle = box ? fromStampLocal(box, 0, -box.h / 2 - ROTATE_OFFSET) : null;

    const topMid = box ? fromStampLocal(box, 0, -box.h / 2) : null;

    const handleProps = (onMove: (at: { x: number; y: number }, shift: boolean) => void) => ({
        style: { cursor: 'grab', touchAction: 'none' as const },
        onPointerDown: (e: PointerEvent<SVGElement>) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        onPointerMove: (e: PointerEvent<SVGElement>) => {
            if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return;

            const at = svgPoint(e);

            if (at) onMove(at, e.shiftKey);
        },
        onPointerUp: (e: PointerEvent<SVGElement>) => {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            sel.onPointerUp();
        },
    });

    return (
        <g data-art-stamps="">
            {[...blocking].map((k) => (
                <polygon
                    key={k}
                    points={cellPolygon(parseCellKey(k), grid)}
                    fill="rgba(220,38,38,0.35)"
                    stroke="rgba(220,38,38,0.8)"
                    strokeWidth={2}
                    pointerEvents="none"
                />
            ))}
            <rect
                ref={rectRef}
                data-art-stamps-surface={mode}
                x={0}
                y={0}
                width={size.width}
                height={size.height}
                fill="transparent"
                style={{ cursor: selectMode ? 'default' : 'copy', touchAction: 'none' }}
                onPointerMove={(e) => {
                    const at = svgPoint(e);

                    if (!at) return;

                    if (selectMode) sel.onPointerMove(at);
                    else setHover(at);
                }}
                onPointerLeave={() => setHover(null)}
                onPointerDown={(e) => {
                    if (!selectMode) return;

                    const at = svgPoint(e);

                    if (!at) return;

                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    sel.onPointerDown(at);
                }}
                onPointerUp={(e) => {
                    if (!selectMode) return;

                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                    sel.onPointerUp();
                }}
                onClick={(e) => {
                    if (selectMode) return;

                    const at = svgPoint(e);

                    if (at) api.place(at);
                }}
            />
            {ghostDef && hover && (
                <image
                    data-art-stamp-ghost=""
                    href={ghostDef.file}
                    x={-unitOf(ghostDef.cols) / 2}
                    y={-unitOf(ghostDef.rows) / 2}
                    width={unitOf(ghostDef.cols)}
                    height={unitOf(ghostDef.rows)}
                    opacity={0.6}
                    pointerEvents="none"
                    transform={`translate(${hover.x} ${hover.y}) rotate(${api.ghost.rot})${
                        api.ghost.flip ? ' scale(-1 1)' : ''
                    }`}
                />
            )}
            {selectMode && corners && topMid && rotHandle && (
                <g data-art-stamp-selection="">
                    <polygon
                        points={corners.map((c) => c.join(',')).join(' ')}
                        fill="none"
                        stroke={ACCENT}
                        strokeWidth={2}
                        strokeDasharray="8 6"
                        pointerEvents="none"
                    />
                    <line
                        x1={topMid.x}
                        y1={topMid.y}
                        x2={rotHandle.x}
                        y2={rotHandle.y}
                        stroke={ACCENT}
                        strokeWidth={2}
                        pointerEvents="none"
                    />
                    <circle
                        data-art-stamp-rotate=""
                        cx={rotHandle.x}
                        cy={rotHandle.y}
                        r={HANDLE_R}
                        fill={ACCENT}
                        stroke="#fff"
                        strokeWidth={1.5}
                        {...handleProps((at, shift) =>
                            sel.onRotateHandle(at, { shiftKey: shift })
                        )}
                    />
                    <rect
                        data-art-stamp-scale=""
                        x={corners[2][0] - HANDLE_R}
                        y={corners[2][1] - HANDLE_R}
                        width={HANDLE_R * 2}
                        height={HANDLE_R * 2}
                        fill={ACCENT}
                        stroke="#fff"
                        strokeWidth={1.5}
                        {...handleProps((at) => sel.onScaleHandle(at))}
                    />
                </g>
            )}
        </g>
    );
});
