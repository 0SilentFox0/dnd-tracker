'use client';

import { useLayoutEffect, useState } from 'react';

export interface AnchorBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface TokenAnchor {
    box: AnchorBox;
    inView: boolean;
    el: Element;
}

const sameBox = (a: AnchorBox, b: AnchorBox) =>
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height;

const round = (r: DOMRect): AnchorBox => ({
    left: Math.round(r.left),
    top: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
});

/** Token rect when it intersects the stage; otherwise a zero-size point clamped to the stage edge. */
export function anchorRect(el: Element, stage: Element | null): TokenAnchor {
    const box = round(el.getBoundingClientRect());

    if (!stage) return { box, inView: true, el };

    const s = round(stage.getBoundingClientRect());

    const inView =
        box.left + box.width > s.left &&
        box.left < s.left + s.width &&
        box.top + box.height > s.top &&
        box.top < s.top + s.height;

    if (inView) return { box, inView, el };

    const clamp = (v: number, lo: number, size: number) =>
        Math.min(Math.max(v, lo), lo + size);

    return {
        box: {
            left: clamp(box.left + box.width / 2, s.left, s.width),
            top: clamp(box.top + box.height / 2, s.top, s.height),
            width: 0,
            height: 0,
        },
        inView,
        el,
    };
}

function findTokenEl(id: string): Element | null {
    return (
        document.querySelector(`[data-map-hud="${id}"]`) ??
        document.querySelector(
            `[data-fx-participant="${id}"][data-fx-anchor="map"]`
        )
    );
}

function measure(id: string): TokenAnchor | null {
    const el = findTokenEl(id);

    return el ? anchorRect(el, el.closest('[data-fx-clip]')) : null;
}

const same = (a: TokenAnchor | null, b: TokenAnchor | null) =>
    a === b ||
    (!!a &&
        !!b &&
        a.el === b.el &&
        a.inView === b.inView &&
        sameBox(a.box, b.box));

/** Screen anchor of a token; undefined until measured, null when the token has no element (no map). Polls on rAF only while `id` is set. */
export function useTokenAnchor(
    id: string | null
): TokenAnchor | null | undefined {
    const [state, setState] = useState<{
        id: string;
        value: TokenAnchor | null;
    } | null>(null);

    useLayoutEffect(() => {
        if (!id) return;

        let raf = 0;

        const tick = () => {
            const next = measure(id);

            setState((prev) =>
                prev && prev.id === id && same(prev.value, next)
                    ? prev
                    : { id, value: next }
            );

            raf = requestAnimationFrame(tick);
        };

        tick();

        return () => cancelAnimationFrame(raf);
    }, [id]);

    return id && state?.id === id ? state.value : undefined;
}
