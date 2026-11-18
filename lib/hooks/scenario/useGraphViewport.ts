'use client';

import {
    type PointerEvent as ReactPointerEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { DRAG_THRESHOLD } from '@/lib/hooks/common';
import type {
    PositionedGraph,
    PositionedNode,
} from '@/lib/utils/scenario/graph/layout';
import {
    type Box,
    FALLBACK_ASPECT,
    fitBox,
    WHEEL_K,
    zoomBox,
} from '@/lib/utils/scenario/graph/viewport';

type Point = { x: number; y: number };

export function useGraphViewport(
    graph: PositionedGraph,
    focus: { id: string; n: number } | null,
    byId: ReadonlyMap<string, PositionedNode>
) {
    const svgRef = useRef<SVGSVGElement>(null);

    const aspect = useCallback(() => {
        const rect = svgRef.current?.getBoundingClientRect();

        return rect && rect.width > 0 && rect.height > 0
            ? rect.width / rect.height
            : FALLBACK_ASPECT;
    }, []);

    const [box, setBox] = useState<Box>(() => fitBox(graph, FALLBACK_ASPECT));

    const boxRef = useRef(box);

    useEffect(() => {
        boxRef.current = box;
    }, [box]);

    const pointers = useRef(new Map<number, Point>());

    const drag = useRef({ moved: 0, pinch: 0 });

    const fit = useCallback(
        () => setBox(fitBox(graph, aspect())),
        [graph, aspect]
    );

    const [fittedTo, setFittedTo] = useState(graph.bounds);

    if (fittedTo !== graph.bounds) {
        setFittedTo(graph.bounds);
        setBox(fitBox(graph, FALLBACK_ASPECT));
    }

    const [seenFocus, setSeenFocus] = useState(focus);

    const pending = focus !== seenFocus && focus ? byId.get(focus.id) : null;

    if (focus !== seenFocus && (!focus || pending)) {
        setSeenFocus(focus);

        const node = pending;

        if (node)
            setBox((b) => ({ ...b, x: node.x - b.w / 2, y: node.y - b.h / 2 }));
    }

    const scale = () => {
        const rect = svgRef.current?.getBoundingClientRect();

        const b = boxRef.current;

        return rect && rect.width > 0 && rect.height > 0
            ? Math.max(b.w / rect.width, b.h / rect.height)
            : 1;
    };

    const zoomAt = useCallback(
        (factor: number, clientX?: number, clientY?: number) => {
            const b = boxRef.current;

            const rect = svgRef.current?.getBoundingClientRect();

            const k = scale();

            const cx =
                rect && clientX !== undefined && rect.width > 0
                    ? b.x + (clientX - rect.left - rect.width / 2) * k + b.w / 2
                    : b.x + b.w / 2;

            const cy =
                rect && clientY !== undefined && rect.height > 0
                    ? b.y + (clientY - rect.top - rect.height / 2) * k + b.h / 2
                    : b.y + b.h / 2;

            setBox(zoomBox(b, factor, cx, cy));
        },
        []
    );

    useEffect(() => {
        const el = svgRef.current;

        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            zoomAt(
                Math.exp(
                    Math.max(
                        -120,
                        Math.min(120, e.deltaY * (e.deltaMode === 1 ? 16 : 1))
                    ) * WHEEL_K
                ),
                e.clientX,
                e.clientY
            );
        };

        el.addEventListener('wheel', onWheel, { passive: false });

        return () => el.removeEventListener('wheel', onWheel);
    }, [zoomAt]);

    const onPointerDown = (e: ReactPointerEvent) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        drag.current = { moved: 0, pinch: 0 };
    };

    const endPointer = (e: ReactPointerEvent) => {
        pointers.current.delete(e.pointerId);
        drag.current.pinch = 0;

        if (e.currentTarget.hasPointerCapture?.(e.pointerId))
            e.currentTarget.releasePointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: ReactPointerEvent) => {
        const prev = pointers.current.get(e.pointerId);

        if (!prev) return;

        if (e.pointerType === 'mouse' && e.buttons === 0) {
            endPointer(e);

            return;
        }

        const next = { x: e.clientX, y: e.clientY };

        if (pointers.current.size === 2) {
            pointers.current.set(e.pointerId, next);

            const [a, b] = [...pointers.current.values()] as [Point, Point];

            const dist = Math.hypot(a.x - b.x, a.y - b.y);

            if (drag.current.pinch > 0 && dist > 0)
                zoomAt(
                    drag.current.pinch / dist,
                    (a.x + b.x) / 2,
                    (a.y + b.y) / 2
                );

            drag.current.pinch = dist;
            drag.current.moved = DRAG_THRESHOLD + 1;

            return;
        }

        const dx = next.x - prev.x;

        const dy = next.y - prev.y;

        drag.current.moved += Math.abs(dx) + Math.abs(dy);
        pointers.current.set(e.pointerId, next);

        if (drag.current.moved <= DRAG_THRESHOLD) return;

        // captured only once panning starts: capturing on down would retarget the node click
        e.currentTarget.setPointerCapture?.(e.pointerId);

        const k = scale();

        setBox((b) => ({ ...b, x: b.x - dx * k, y: b.y - dy * k }));
    };

    const onClickCapture = (e: { stopPropagation: () => void }) => {
        if (drag.current.moved > DRAG_THRESHOLD) {
            e.stopPropagation();
            drag.current.moved = 0;
        }
    };

    return {
        svgRef,
        box,
        zoomAt,
        fit,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endPointer,
            onPointerCancel: endPointer,
            onClickCapture,
        },
    };
}
