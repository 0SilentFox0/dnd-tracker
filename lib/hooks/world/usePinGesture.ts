'use client';

import { type HTMLAttributes, useCallback, useEffect, useRef } from 'react';

import { exceedsDragThreshold } from '@/lib/utils/world/hero-drag';

interface PointerXY {
    clientX: number;
    clientY: number;
}

interface Options<Id extends string> {
    draggable: boolean;
    onClick?(id: Id): void;
    onDragMove?(id: Id, e: PointerXY): void;
    onDragEnd?(id: Id, e: PointerXY): void;
    onCancel?(): void;
}

type PinBind = Pick<
    HTMLAttributes<HTMLElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
>;

export function usePinGesture<Id extends string>(opts: Options<Id>) {
    const optsRef = useRef(opts);

    useEffect(() => {
        optsRef.current = opts;
    });

    const gesture = useRef<{
        id: Id;
        start: { x: number; y: number };
        active: boolean;
    } | null>(null);

    const bind = useCallback(
        (id: Id): PinBind => ({
            onPointerDown: (e) => {
                e.stopPropagation();
                gesture.current = {
                    id,
                    start: { x: e.clientX, y: e.clientY },
                    active: false,
                };

                try {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                } catch {
                    // synthetic pointer events from the tour have no active pointer
                }
            },
            onPointerMove: (e) => {
                const g = gesture.current;

                if (!g || !optsRef.current.draggable) return;

                e.stopPropagation();

                if (
                    !g.active &&
                    !exceedsDragThreshold(g.start, {
                        x: e.clientX,
                        y: e.clientY,
                    })
                )
                    return;

                g.active = true;
                optsRef.current.onDragMove?.(g.id, e);
            },
            onPointerUp: (e) => {
                const g = gesture.current;

                gesture.current = null;

                if (!g) return;

                e.stopPropagation();

                if (g.active) optsRef.current.onDragEnd?.(g.id, e);
                else optsRef.current.onClick?.(g.id);
            },
            onPointerCancel: () => {
                gesture.current = null;
                optsRef.current.onCancel?.();
            },
        }),
        []
    );

    return { bind };
}
