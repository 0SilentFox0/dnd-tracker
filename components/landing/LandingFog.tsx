'use client';

import { useEffect, useRef } from 'react';

import { cloudTexture } from '@/lib/utils/canvas/fog/cloud-texture';
import { subscribe } from '@/lib/utils/canvas/ticker';

const MAX_PIXELS = 420_000;

const PIXEL_SCALE = { desktop: 0.6, compact: 0.4 };

const TRAIL_SCALE = 0.25;

const BRUSH_RADIUS = 150;

const REFILL_SECONDS = 0.8;

// 8-bit alpha never decays to zero by multiplication, so an idle trail is wiped outright
const TRAIL_RESET_MS = 2600;

const FPS = 30;

type Ctx = CanvasRenderingContext2D;

function afterFirstPaint(run: () => void) {
    let idle = 0;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
        if (typeof window.requestIdleCallback === 'function')
            idle = window.requestIdleCallback(run, { timeout: 1500 });
        else timer = setTimeout(run, 200);
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
        window.removeEventListener('load', schedule);

        if (idle) window.cancelIdleCallback(idle);

        clearTimeout(timer);
    };
}

function paintFog(
    ctx: Ctx,
    cloud: HTMLCanvasElement,
    w: number,
    h: number,
    now: number,
    thinLeft: boolean
) {
    const scale = Math.max(w / cloud.width, h / cloud.height) * 1.28;

    const width = cloud.width * scale;

    const height = cloud.height * scale;

    const left = (w - width) / 2;

    const top = (h - height) / 2;

    const dx = Math.sin(now / 4100) * w * 0.105;

    const dy = Math.cos(now / 5300) * h * 0.105;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 0.8;
    ctx.drawImage(cloud, left + dx, top + dy, width, height);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(cloud, left - dx * 0.7, top - dy * 0.8, width, height);
    ctx.globalAlpha = 1;

    if (!thinLeft) return;

    // thinner behind the copy so the heading keeps its contrast
    const side = ctx.createLinearGradient(0, 0, w, 0);

    side.addColorStop(0, 'rgba(0,0,0,0.72)');
    side.addColorStop(0.38, 'rgba(0,0,0,0.55)');
    side.addColorStop(0.68, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);
}

export function LandingFog() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;

        if (!canvas) return;

        const media = (q: string) => window.matchMedia(q).matches;

        const reduced = media('(prefers-reduced-motion: reduce)');

        const interactive = !reduced && !media('(pointer: coarse)');

        const compact = media('(max-width: 768px)');

        let cleanup: (() => void) | null = null;

        const cancelStart = afterFirstPaint(() => {
            cleanup = start(canvas, { reduced, interactive, compact });
        });

        return () => {
            cancelStart();
            cleanup?.();
        };
    }, []);

    return (
        <div aria-hidden className="ld-fog-wrap">
            <canvas ref={ref} className="ld-fog-canvas" />
        </div>
    );
}

function start(
    canvas: HTMLCanvasElement,
    mode: { reduced: boolean; interactive: boolean; compact: boolean }
) {
    const ctx = canvas.getContext('2d');

    const cloud = cloudTexture();

    if (!ctx || !cloud) return null;

    const trail = document.createElement('canvas');

    const trailCtx = trail.getContext('2d');

    let w = 0;

    let h = 0;

    let scale = 1;

    const resize = () => {
        const rect = canvas.getBoundingClientRect();

        scale = Math.min(
            mode.compact ? PIXEL_SCALE.compact : PIXEL_SCALE.desktop,
            Math.sqrt(MAX_PIXELS / Math.max(1, rect.width * rect.height))
        );
        w = canvas.width = Math.max(1, Math.round(rect.width * scale));
        h = canvas.height = Math.max(1, Math.round(rect.height * scale));
        trail.width = Math.max(1, Math.round(rect.width * TRAIL_SCALE));
        trail.height = Math.max(1, Math.round(rect.height * TRAIL_SCALE));
    };

    resize();

    let lastStamp = -Infinity;

    let last: { x: number; y: number } | null = null;

    const stamp = (x: number, y: number) => {
        if (!trailCtx) return;

        const r = BRUSH_RADIUS * TRAIL_SCALE;

        const g = trailCtx.createRadialGradient(x, y, 0, x, y, r);

        g.addColorStop(0, 'rgba(0,0,0,0.95)');
        g.addColorStop(0.55, 'rgba(0,0,0,0.6)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        trailCtx.globalCompositeOperation = 'source-over';
        trailCtx.fillStyle = g;
        trailCtx.fillRect(x - r, y - r, 2 * r, 2 * r);
    };

    const fadeTrail = (now: number, dt: number) => {
        if (!trailCtx || lastStamp === -Infinity) return false;

        if (now - lastStamp > TRAIL_RESET_MS) {
            trailCtx.clearRect(0, 0, trail.width, trail.height);
            lastStamp = -Infinity;

            return false;
        }

        trailCtx.globalCompositeOperation = 'destination-out';
        trailCtx.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt / REFILL_SECONDS)})`;
        trailCtx.fillRect(0, 0, trail.width, trail.height);

        return true;
    };

    const draw = (now: number, dt: number) => {
        paintFog(ctx, cloud, w, h, mode.reduced ? 0 : now, !mode.compact);

        if (fadeTrail(now, dt)) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(trail, 0, 0, w, h);
        }

        ctx.globalCompositeOperation = 'source-over';
    };

    draw(0, 0);
    canvas.dataset.ready = '';

    if (mode.reduced) return () => {};

    let unsubscribe: (() => void) | null = null;

    let onScreen = true;

    const running = () => onScreen && !document.hidden;

    const stop = () => {
        unsubscribe?.();
        unsubscribe = null;
    };

    const tick = (now: number, dt: number) => {
        if (!running()) {
            stop();

            return false;
        }

        draw(now, dt);
    };

    const resume = () => {
        if (running() && !unsubscribe)
            unsubscribe = subscribe(tick, { fps: FPS });
    };

    const onMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;

        const y = e.clientY - rect.top;

        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            last = null;

            return;
        }

        const p = { x: x * TRAIL_SCALE, y: y * TRAIL_SCALE };

        const from = last ?? p;

        const step = (BRUSH_RADIUS * TRAIL_SCALE) / 3;

        const n = Math.max(
            1,
            Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / step)
        );

        for (let i = 1; i <= n; i++)
            stamp(
                from.x + ((p.x - from.x) * i) / n,
                from.y + ((p.y - from.y) * i) / n
            );

        last = p;
        lastStamp = performance.now();
    };

    const observer =
        typeof IntersectionObserver === 'undefined'
            ? null
            : new IntersectionObserver((entries) => {
                  onScreen =
                      entries[entries.length - 1]?.isIntersecting ?? true;
                  resume();
              });

    observer?.observe(canvas);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('resize', resize, { passive: true });

    if (mode.interactive)
        window.addEventListener('pointermove', onMove, { passive: true });

    resume();

    return () => {
        stop();
        observer?.disconnect();
        document.removeEventListener('visibilitychange', resume);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
    };
}
