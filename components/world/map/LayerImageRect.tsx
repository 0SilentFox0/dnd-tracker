'use client';

import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { usePinGesture } from '@/lib/hooks/world';
import {
    moveRect,
    type RectCorner,
    resizeRect,
} from '@/lib/utils/world/layer-rect';
import type { LayerRect, MapPoint, WorldViewLayer } from '@/types/world';

type Handle = RectCorner | 'body';

const CORNERS: Record<RectCorner, { left: string; top: string }> = {
    nw: { left: '0%', top: '0%' },
    ne: { left: '100%', top: '0%' },
    sw: { left: '0%', top: '100%' },
    se: { left: '100%', top: '100%' },
};

interface LayerImageRectProps {
    layer: Pick<WorldViewLayer, 'id' | 'name' | 'rect'>;
    onChange(layerId: string, rect: LayerRect): void;
    toPoint(clientX: number, clientY: number): MapPoint | null;
    zoom: number;
}

export function LayerImageRect({
    layer,
    onChange,
    toPoint,
    zoom,
}: LayerImageRectProps) {
    const t = useTranslations('world.layers');

    const [draft, setDraft] = useState<LayerRect | null>(null);

    const origin = useRef<{ point: MapPoint; rect: LayerRect } | null>(null);

    const preview = useRef<LayerRect | null>(null);

    const cancelled = useRef(false);

    const rect = draft ?? layer.rect;

    const reset = () => {
        origin.current = null;
        preview.current = null;
        setDraft(null);
    };

    useEffect(() => {
        if (!draft) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;

            cancelled.current = true;
            reset();
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [draft]);

    const { bind } = usePinGesture<Handle>({
        draggable: true,
        onDragMove: (handle, e) => {
            const o = origin.current;

            const p = toPoint(e.clientX, e.clientY);

            if (!o || !p || cancelled.current) return;

            const dx = p.x - o.point.x;

            const dy = p.y - o.point.y;

            const next =
                handle === 'body'
                    ? moveRect(o.rect, dx, dy)
                    : resizeRect(o.rect, handle, dx, dy);

            preview.current = next;
            setDraft(next);
        },
        onDragEnd: () => {
            const next = preview.current;

            const skip = cancelled.current;

            reset();

            if (next && !skip) onChange(layer.id, next);
        },
        onCancel: reset,
    });

    const props = (handle: Handle) => {
        const base = bind(handle);

        return {
            ...base,
            onPointerDown: (e: PointerEvent<HTMLElement>) => {
                const point = toPoint(e.clientX, e.clientY);

                cancelled.current = false;
                origin.current = point ? { point, rect: layer.rect } : null;
                base.onPointerDown?.(e as PointerEvent<HTMLElement>);
            },
        };
    };

    return (
        <div
            data-testid="layer-image-rect"
            role="group"
            aria-label={t('imageFrame', { name: layer.name })}
            className="pointer-events-auto absolute cursor-move border-2 border-dashed border-[var(--gold)]"
            style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`,
                height: `${rect.h * 100}%`,
                touchAction: 'none',
            }}
            {...props('body')}
        >
            {(Object.keys(CORNERS) as RectCorner[]).map((corner) => (
                <HudButton
                    key={corner}
                    type="button"
                    data-corner={corner}
                    aria-label={t('corner.' + corner)}
                    className="atlas-vertex"
                    style={{
                        ...CORNERS[corner],
                        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                    }}
                    {...props(corner)}
                />
            ))}
        </div>
    );
}
