'use client';

import {
    type PointerEvent,
    type RefObject,
    useCallback,
    useEffect,
    useEffectEvent,
    useRef,
} from 'react';

export const DRAG_THRESHOLD = 4;

export interface PinchStep {
    factor: number;
    mx: number;
    my: number;
    dmx: number;
    dmy: number;
}

export interface PointerBind {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
}

interface Options {
    panLocked: boolean;
    enabled?: boolean;
    containerRef?: RefObject<HTMLDivElement | null>;
    onPan(dx: number, dy: number, rect: DOMRect): void;
    onPinch(step: PinchStep, rect: DOMRect): void;
    onWheel(e: globalThis.WheelEvent, rect: DOMRect): void;
}

export function usePanPinch({
    panLocked,
    enabled = true,
    containerRef: suppliedRef,
    onPan: onPanOption,
    onPinch: onPinchOption,
    onWheel: onWheelOption,
}: Options) {
    const ownRef = useRef<HTMLDivElement>(null);

    const containerRef = suppliedRef ?? ownRef;

    const pointers = useRef(new Map<number, { x: number; y: number }>());

    const drag = useRef<{ startX: number; startY: number; active: boolean } | null>(
        null
    );

    const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null);

    const dragged = useRef(false);

    const state = useRef({ enabled, locked: panLocked });

    const callbacks = useRef({ onPan: onPanOption, onPinch: onPinchOption });

    useEffect(() => {
        state.current = { enabled, locked: panLocked };
        callbacks.current = { onPan: onPanOption, onPinch: onPinchOption };
    }, [enabled, panLocked, onPanOption, onPinchOption]);

    const onWheel = useEffectEvent(onWheelOption);

    const wheelEnabled = useEffectEvent(() => enabled);

    useEffect(() => {
        const el = containerRef.current;

        if (!el) return;

        const listener = (e: globalThis.WheelEvent) => {
            if (wheelEnabled()) onWheel(e, el.getBoundingClientRect());
        };

        el.addEventListener('wheel', listener, { passive: false });

        return () => el.removeEventListener('wheel', listener);
    }, [containerRef]);

    const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
        if (!state.current.enabled) return;

        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        dragged.current = false;
        drag.current =
            pointers.current.size === 1
                ? { startX: e.clientX, startY: e.clientY, active: false }
                : null;
        pinch.current = null;
    }, []);

    const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
        if (!state.current.enabled) return;

        const prev = pointers.current.get(e.pointerId);

        if (!prev) return;

        const next = { x: e.clientX, y: e.clientY };

        pointers.current.set(e.pointerId, next);

        const rect = e.currentTarget.getBoundingClientRect();

        if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];

            const dist = Math.hypot(a.x - b.x, a.y - b.y);

            const mx = (a.x + b.x) / 2 - rect.left;

            const my = (a.y + b.y) / 2 - rect.top;

            const last = pinch.current;

            pinch.current = { dist, mx, my };
            dragged.current = true;

            if (last && last.dist > 0) {
                callbacks.current.onPinch(
                    {
                        factor: dist / last.dist,
                        mx,
                        my,
                        dmx: mx - last.mx,
                        dmy: my - last.my,
                    },
                    rect
                );
            }

            return;
        }

        const d = drag.current;

        if (!d || state.current.locked) return;

        if (
            !d.active &&
            Math.hypot(e.clientX - d.startX, e.clientY - d.startY) >
                DRAG_THRESHOLD
        ) {
            d.active = true;
            dragged.current = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
        }

        if (d.active) callbacks.current.onPan(next.x - prev.x, next.y - prev.y, rect);
    }, []);

    const onPointerUp = useCallback((e: PointerEvent<HTMLElement>) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
        drag.current = null;
    }, []);

    const wasDragged = useCallback(() => dragged.current, []);

    return {
        containerRef,
        wasDragged,
        bind: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp,
        },
    };
}
