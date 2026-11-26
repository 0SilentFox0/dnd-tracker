'use client';

import { useEffect } from 'react';

const LERP = 0.08;

const EPSILON = 0.001;

const TILT = '[data-ld-tilt]';

// pointer position inside the hovered [data-ld-tilt] card as --tx/--ty in -0.5…0.5
export function trackTilt(e: PointerEvent, prev: HTMLElement | null) {
    const el =
        e.target instanceof Element
            ? e.target.closest<HTMLElement>(TILT)
            : null;

    if (prev && prev !== el) {
        prev.style.removeProperty('--tx');
        prev.style.removeProperty('--ty');
    }

    if (!el) return null;

    const r = el.getBoundingClientRect();

    if (!r.width || !r.height) return el;

    el.style.setProperty(
        '--tx',
        ((e.clientX - r.left) / r.width - 0.5).toFixed(3)
    );
    el.style.setProperty(
        '--ty',
        ((e.clientY - r.top) / r.height - 0.5).toFixed(3)
    );

    return el;
}

export function PointerParallax(): null {
    useEffect(() => {
        if (
            window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        const root = document.documentElement;

        const target = { x: 0, y: 0 };

        const cur = { x: 0, y: 0 };

        let raf = 0;

        let tilted: HTMLElement | null = null;

        const tick = () => {
            cur.x += (target.x - cur.x) * LERP;
            cur.y += (target.y - cur.y) * LERP;
            root.style.setProperty('--mx', cur.x.toFixed(4));
            root.style.setProperty('--my', cur.y.toFixed(4));
            raf =
                Math.abs(target.x - cur.x) < EPSILON &&
                Math.abs(target.y - cur.y) < EPSILON
                    ? 0
                    : requestAnimationFrame(tick);
        };

        const start = () => {
            if (!raf) raf = requestAnimationFrame(tick);
        };

        const stop = () => {
            cancelAnimationFrame(raf);
            raf = 0;
        };

        const onMove = (e: PointerEvent) => {
            target.x = (e.clientX / window.innerWidth) * 2 - 1;
            target.y = (e.clientY / window.innerHeight) * 2 - 1;
            tilted = trackTilt(e, tilted);

            if (!document.hidden) start();
        };

        const onVisibility = () => (document.hidden ? stop() : start());

        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('visibilitychange', onVisibility);
            stop();
            root.style.removeProperty('--mx');
            root.style.removeProperty('--my');
        };
    }, []);

    return null;
}
