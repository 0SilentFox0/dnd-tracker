'use client';

import { memo, type PointerEvent } from 'react';

import type { ArtPreviewState } from '../battle-map-types';

import { unitOf } from '@/lib/utils/battle/grid';
import type { MapArtLight } from '@/types/battle-map';

interface Props {
    lights: MapArtLight[];
    editing: NonNullable<ArtPreviewState['lights']>;
}

const HANDLE_R = unitOf(0.25);

function svgPoint(e: PointerEvent<SVGElement>) {
    const svg = e.currentTarget.ownerSVGElement;

    const m = svg?.getScreenCTM();

    if (!svg || !m) return null;

    const p = svg.createSVGPoint();

    p.x = e.clientX;
    p.y = e.clientY;

    const at = p.matrixTransform(m.inverse());

    return { x: at.x, y: at.y };
}

export const ArtLightsLayer = memo(function ArtLightsLayer({ lights, editing }: Props) {
    const { selectedId, select, move } = editing;

    return (
        <g data-art-lights="">
            {lights.map((l) => (
                <g key={l.id}>
                    {l.id === selectedId && (
                        <circle
                            cx={l.x}
                            cy={l.y}
                            r={l.radius}
                            fill="none"
                            stroke={l.color}
                            strokeDasharray="8 6"
                            strokeWidth={2}
                            pointerEvents="none"
                        />
                    )}
                    <circle
                        data-art-light={l.id}
                        cx={l.x}
                        cy={l.y}
                        r={HANDLE_R}
                        fill={l.color}
                        stroke="#fff"
                        strokeWidth={l.id === selectedId ? 3 : 1.5}
                        style={{ cursor: 'grab', touchAction: 'none' }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            select(l.id);
                            e.currentTarget.setPointerCapture?.(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                            if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return;

                            const at = svgPoint(e);

                            if (at) move(l.id, at);
                        }}
                        onPointerUp={(e) =>
                            e.currentTarget.releasePointerCapture?.(e.pointerId)
                        }
                    />
                </g>
            ))}
        </g>
    );
});
