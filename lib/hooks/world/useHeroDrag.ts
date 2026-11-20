'use client';

import {
    type PointerEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { dropIsNoop, exceedsDragThreshold } from '@/lib/utils/world/hero-drag';
import type { MapPoint } from '@/types/world';

interface Options {
    toPoint(clientX: number, clientY: number): MapPoint | null;
    groupFor(clusterIds: string[]): string[];
    onDrop(ids: string[], to: MapPoint): void;
    positions: Map<string, { x: number; y: number }>;
}

export interface HeroDragHandlers {
    onPointerDown(e: PointerEvent<HTMLElement>): void;
    onPointerMove(e: PointerEvent<HTMLElement>): void;
    // true when the gesture was a drag (or a cancelled one), so the caller must not treat it as a click
    onPointerUp(e: PointerEvent<HTMLElement>): boolean;
    onPointerCancel(): void;
}

interface Gesture {
    ids: string[];
    start: { x: number; y: number };
    active: boolean;
    cancelled: boolean;
}

export interface HeroDragGhost {
    point: MapPoint;
    from: { x: number; y: number };
}

export function useHeroDrag({ toPoint, groupFor, onDrop, positions }: Options) {
    const gesture = useRef<Gesture | null>(null);

    const [ghost, setGhost] = useState<HeroDragGhost | null>(null);

    const cancel = useCallback(() => {
        if (gesture.current) gesture.current.cancelled = true;

        setGhost(null);
    }, []);

    const dragging = ghost !== null;

    useEffect(() => {
        if (!dragging) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;

            e.preventDefault();
            cancel();
        };

        window.addEventListener('keydown', onKey, true);

        return () => window.removeEventListener('keydown', onKey, true);
    }, [dragging, cancel]);

    const bind = (clusterIds: string[]): HeroDragHandlers => ({
        onPointerDown: (e) => {
            e.stopPropagation();
            gesture.current = {
                ids: clusterIds,
                start: { x: e.clientX, y: e.clientY },
                active: false,
                cancelled: false,
            };

            try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
                // synthetic pointer events have no active pointer
            }
        },
        onPointerMove: (e) => {
            const g = gesture.current;

            if (!g) return;

            e.stopPropagation();

            if (g.cancelled) return;

            if (!g.active) {
                if (
                    !exceedsDragThreshold(g.start, {
                        x: e.clientX,
                        y: e.clientY,
                    })
                )
                    return;

                g.active = true;
            }

            const point = toPoint(e.clientX, e.clientY);

            const from = positions.get(g.ids[0]);

            setGhost(point && from ? { point, from } : null);
        },
        onPointerUp: (e) => {
            const g = gesture.current;

            gesture.current = null;
            setGhost(null);
            e.stopPropagation();

            if (!g) return false;

            if (g.cancelled) return true;

            if (!g.active) return false;

            const to = toPoint(e.clientX, e.clientY);

            const ids = groupFor(g.ids).filter((id) => positions.has(id));

            if (!to || ids.length === 0) return true;

            const points = ids.flatMap((id) => positions.get(id) ?? []);

            if (!dropIsNoop(points, to)) onDrop(ids, to);

            return true;
        },
        onPointerCancel: () => {
            gesture.current = null;
            setGhost(null);
        },
    });

    return { bind, ghost, cancel };
}
