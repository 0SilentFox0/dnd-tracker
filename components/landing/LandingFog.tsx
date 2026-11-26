'use client';

import { useEffect, useRef } from 'react';

import {
    type FogQuality,
    useCoarsePointer,
    useFogCompact,
    useFogQuality,
} from '@/lib/hooks/common';
import {
    type CoverBand,
    coverClouds,
    type CoverRegion,
    type ShadeBasis,
    shaderShadeBasis,
} from '@/lib/utils/canvas/fog/cloud-cover';
import {
    acquireCloudMotion,
    type CloudMotion,
} from '@/lib/utils/canvas/fog/cloud-motion';
import { cloudTexture } from '@/lib/utils/canvas/fog/cloud-texture';
import { subscribe } from '@/lib/utils/canvas/ticker';

// Same cloud framing and pixel budget as WorldFog's cropped map.
const CLOUD_ZOOM = 1.28;

const MAX_PIXELS = 580_000;

const PIXEL_SCALE = 0.72;

const GAP = { wide: 0.33, compact: 0.45 };

const COMPACT_ALPHA = 0.86;

const TRAIL_SCALE = 0.25;

const BRUSH_RADIUS = 170;

const REFILL_SECONDS = 0.7;

// 8-bit alpha never decays to zero by multiplication, so an idle trail is wiped outright
const TRAIL_RESET_MS = 2600;

const FPS = 30;

type Variant = 'hero' | 'final';

interface Mode {
    quality: FogQuality;
    interactive: boolean;
    gap: number;
    alpha: number;
    hole: boolean;
    webgl: boolean;
}

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

export function LandingFog({ variant = 'hero' }: { variant?: Variant }) {
    const ref = useRef<HTMLCanvasElement>(null);

    const quality = useFogQuality({ trackHidden: false });

    const compact = useFogCompact();

    const coarse = useCoarsePointer();

    useEffect(() => {
        const canvas = ref.current;

        if (!canvas) return;

        let cleanup: (() => void) | null = null;

        const cancelStart = afterFirstPaint(() => {
            cleanup = start(canvas, {
                quality,
                interactive: quality === 'live' && !coarse,
                gap: compact ? GAP.compact : GAP.wide,
                alpha: compact ? COMPACT_ALPHA : 1,
                hole: variant === 'final',
                webgl: variant === 'hero',
            });
        });

        return () => {
            cancelStart();
            cleanup?.();
        };
    }, [variant, quality, compact, coarse]);

    return (
        <div aria-hidden className={`ld-fog-wrap ld-fog-${variant}`}>
            <canvas ref={ref} className="ld-fog-canvas" />
        </div>
    );
}

function coveredTexture(gap: number) {
    const source = cloudTexture();

    const canvas = document.createElement('canvas');

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!source || !ctx) return null;

    canvas.width = source.width;
    canvas.height = source.height;
    ctx.drawImage(source, 0, 0);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

    coverClouds(image, gap, null);
    ctx.putImageData(image, 0, 0);

    return canvas;
}

function start(canvas: HTMLCanvasElement, mode: Mode) {
    const ctx = canvas.getContext('2d');

    const work = document.createElement('canvas');

    const workCtx = work.getContext('2d', { willReadFrequently: true });

    if (!ctx || !workCtx) return null;

    const live = mode.quality === 'live';

    let webgl = mode.webgl && mode.quality !== 'flat';

    let motion: CloudMotion | null = null;

    let basis: ShadeBasis | null = null;

    let band: CoverBand | null = null;

    let texture: HTMLCanvasElement | null | undefined;

    const releaseMotion = () => {
        motion?.release();
        motion = null;
    };

    const shaderFrame = (seconds: number) => {
        if (!motion && webgl) {
            motion = acquireCloudMotion();
            webgl = !!motion;
        }

        if (!motion) return null;

        if (!motion.render(seconds)) {
            releaseMotion();
            webgl = false;

            return null;
        }

        const source = motion.canvas;

        if (work.width !== source.width || work.height !== source.height) {
            work.width = source.width;
            work.height = source.height;
            basis = null;
        }

        basis ??= shaderShadeBasis(work.width, work.height);
        workCtx.drawImage(source, 0, 0);

        const image = workCtx.getImageData(0, 0, work.width, work.height);

        band = coverClouds(image, mode.gap, basis, band, visible(work));
        workCtx.putImageData(image, 0, 0);

        return work;
    };

    const framing = (cloud: HTMLCanvasElement) => {
        const scale = Math.max(w / cloud.width, h / cloud.height) * CLOUD_ZOOM;

        const width = cloud.width * scale;

        const height = cloud.height * scale;

        return {
            scale,
            width,
            height,
            left: (w - width) / 2,
            top: (h - height) / 2,
        };
    };

    const visible = (cloud: HTMLCanvasElement): CoverRegion => {
        const f = framing(cloud);

        return {
            x: -f.left / f.scale,
            y: -f.top / f.scale,
            width: w / f.scale,
            height: h / f.scale,
        };
    };

    const textureFrame = () => {
        if (texture === undefined) texture = coveredTexture(mode.gap);

        return texture;
    };

    const trail = document.createElement('canvas');

    const trailCtx = trail.getContext('2d');

    let w = 0;

    let h = 0;

    let rect = canvas.getBoundingClientRect();

    const measure = () => {
        rect = canvas.getBoundingClientRect();
    };

    const resize = () => {
        measure();

        const scale = Math.min(
            PIXEL_SCALE,
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

    let ready = false;

    const paint = (now: number, dt: number) => {
        const cloud = shaderFrame(live ? now / 1000 : 0) ?? textureFrame();

        if (!cloud) return;

        const { width, height, left, top } = framing(cloud);

        const drift = live && cloud !== work;

        const dx = drift ? Math.sin(now / 4100) * w * 0.105 : 0;

        const dy = drift ? Math.cos(now / 5300) * h * 0.105 : 0;

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = mode.alpha;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(cloud, left + dx, top + dy, width, height);

        if (drift) {
            ctx.globalAlpha = mode.alpha * 0.35;
            ctx.drawImage(
                cloud,
                left - dx * 0.7,
                top - dy * 0.8,
                width,
                height
            );
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-out';

        if (mode.hole) {
            // the closing call to action sits lit inside a ring of cloud
            const hole = ctx.createRadialGradient(
                w / 2,
                h / 2,
                0,
                w / 2,
                h / 2,
                Math.max(w, h) * 0.42
            );

            hole.addColorStop(0, 'rgba(0,0,0,0.96)');
            hole.addColorStop(0.45, 'rgba(0,0,0,0.8)');
            hole.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = hole;
            ctx.fillRect(0, 0, w, h);
        }

        if (fadeTrail(now, dt)) ctx.drawImage(trail, 0, 0, w, h);

        ctx.globalCompositeOperation = 'source-over';

        if (!ready) {
            canvas.dataset.ready = '';
            ready = true;
        }
    };

    if (!live) {
        paint(0, 0);
        releaseMotion();

        return () => {};
    }

    let unsubscribe: (() => void) | null = null;

    let onScreen = typeof IntersectionObserver === 'undefined';

    const stop = () => {
        unsubscribe?.();
        unsubscribe = null;
    };

    // off-screen only stops the ticker: rebuilding the GL context on scroll-back would recompile the shader
    const sync = () => {
        if (document.hidden) releaseMotion();

        if (onScreen && !document.hidden) {
            unsubscribe ??= subscribe(paint, { fps: FPS });

            return;
        }

        stop();
    };

    const observer = onScreen
        ? null
        : new IntersectionObserver((entries) => {
              onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
              sync();
          });

    const onMove = (e: PointerEvent) => {
        const x = e.clientX - rect.left;

        const y = e.clientY - rect.top;

        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            last = null;

            return;
        }

        const p = {
            x: (x / rect.width) * trail.width,
            y: (y / rect.height) * trail.height,
        };

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

    observer?.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', measure, { passive: true });

    if (mode.interactive)
        window.addEventListener('pointermove', onMove, { passive: true });

    sync();

    return () => {
        stop();
        releaseMotion();
        observer?.disconnect();
        document.removeEventListener('visibilitychange', sync);
        window.removeEventListener('resize', resize);
        window.removeEventListener('scroll', measure);
        window.removeEventListener('pointermove', onMove);
    };
}
