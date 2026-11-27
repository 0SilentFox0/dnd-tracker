'use client';

import {
    type PointerEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    connectedEdgePath,
    edgeAtScreenPoint,
    gridOf,
    screenToUnit,
    UNIT,
} from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

export interface EdgeEditing {
    existing: ReadonlySet<string>;
    erase?: boolean;
    committed?: { add: ReadonlySet<string>; remove: ReadonlySet<string> };
    ghost?: ReadonlySet<string>;
    onCommit(add: string[], remove: string[]): void;
}

interface Stroke {
    pointerId: number;
    remove: boolean;
    sampled: string[];
    edges: Set<string>;
    last: { x: number; y: number };
}

const NO_EDGES: ReadonlySet<string> = new Set();

const SAMPLE_STEP = UNIT / 5;

type Dims = Pick<BattleMapConfig, 'cols' | 'rows' | 'gridType'>;

function unitPoint(e: PointerEvent) {
    const svg = (e.currentTarget as SVGGraphicsElement).ownerSVGElement;

    const ctm = svg?.getScreenCTM();

    return ctm ? screenToUnit(ctm, e.clientX, e.clientY) : null;
}

function edgesBetween(
    map: Dims,
    from: { x: number; y: number },
    to: { x: number; y: number }
): string[] {
    const steps = Math.max(
        1,
        Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / SAMPLE_STEP)
    );

    const out: string[] = [];

    for (let i = 1; i <= steps; i++) {
        const edge = edgeAtScreenPoint(
            map,
            from.x + ((to.x - from.x) * i) / steps,
            from.y + ((to.y - from.y) * i) / steps
        );

        if (edge) out.push(edge);
    }

    return out;
}

export function useEdgeStroke(map: Dims, editing: EdgeEditing) {
    const { cols, rows, gridType } = map;

    const strokeRef = useRef<Stroke | null>(null);

    const [pending, setPending] = useState<ReadonlySet<string>>(NO_EDGES);

    const [remove, setRemove] = useState(false);

    const latest = useRef(editing);

    useEffect(() => {
        latest.current = editing;
    });

    const drop = useCallback(() => {
        strokeRef.current = null;
        setPending(NO_EDGES);
    }, []);

    const onPointerDown = useCallback(
        (e: PointerEvent) => {
            if (!e.isPrimary || e.button !== 0 || e.pointerType === 'touch')
                return;

            const point = unitPoint(e);

            const edge =
                point && edgeAtScreenPoint(
                    { cols, rows, gridType },
                    point.x,
                    point.y
                );

            if (!point || !edge) return;

            const { existing, erase } = latest.current;

            const isRemove = Boolean(erase) || existing.has(edge);

            strokeRef.current = {
                pointerId: e.pointerId,
                remove: isRemove,
                sampled: [edge],
                edges: new Set([edge]),
                last: point,
            };
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            setRemove(isRemove);
            setPending(new Set([edge]));
        },
        [cols, rows, gridType]
    );

    const onPointerMove = useCallback(
        (e: PointerEvent) => {
            const s = strokeRef.current;

            if (!s || e.pointerId !== s.pointerId) return;

            const point = unitPoint(e);

            if (!point) return;

            const dims = { cols, rows, gridType };

            const added = edgesBetween(dims, s.last, point);

            s.last = point;

            if (!added.length) return;

            s.sampled.push(...added);

            const next = new Set(connectedEdgePath(gridOf(dims), s.sampled));

            const changed =
                next.size !== s.edges.size ||
                [...next].some((edge) => !s.edges.has(edge));

            s.edges = next;

            if (changed) setPending(next);
        },
        [cols, rows, gridType]
    );

    const onPointerUp = useCallback(
        (e: PointerEvent) => {
            const s = strokeRef.current;

            if (!s || e.pointerId !== s.pointerId) return;

            drop();

            const { existing, onCommit } = latest.current;

            const changed = [...s.edges].filter(
                (edge) => existing.has(edge) === s.remove
            );

            if (changed.length)
                onCommit(s.remove ? [] : changed, s.remove ? changed : []);
        },
        [drop]
    );

    const onPointerCancel = useCallback(
        (e: PointerEvent) => {
            if (strokeRef.current?.pointerId === e.pointerId) drop();
        },
        [drop]
    );

    const handlers = useMemo(
        () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }),
        [onPointerDown, onPointerMove, onPointerUp, onPointerCancel]
    );

    return { handlers, pending, remove };
}
