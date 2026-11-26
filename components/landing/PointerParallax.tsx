'use client';

import { useEffect } from 'react';

const LERP = 0.08;

const EPSILON = 0.001;

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
