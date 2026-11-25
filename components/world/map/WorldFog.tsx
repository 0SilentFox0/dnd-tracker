'use client';

import { useEffect, useRef } from 'react';

import { useFogQuality } from '@/lib/hooks/common';
import {
    acquireCloudMotion,
    type CloudMotion,
} from '@/lib/utils/canvas/fog/cloud-motion';
import { cloudTexture } from '@/lib/utils/canvas/fog/cloud-texture';
import { subscribe } from '@/lib/utils/canvas/ticker';
import type { RevealShape } from '@/types/world';

const FADE_MS = 400;

const SOFT_EDGE = 0.25;

const MAX_DPR = 2;

const CLOUD_CORE_RADIUS = 0.64;

const CLOUD_EDGE_FEATHER = 0.15;

const CLOUD_MAX_PIXELS = 580_000;

const CLOUD_PIXEL_SCALE = 0.72;

const MASK_PAD = 0.2;

const FALLBACK_FOG = 'rgba(54, 40, 26, 0.9)';

interface WorldFogProps {
    shapes: RevealShape[];
    radius: number;
    box: { width: number; height: number };
    crop?: { x: number; y: number };
    zoom: number;
    offset: { x: number; y: number };
    still?: boolean;
}

type At = (x: number, y: number) => [number, number];

function traceShape(
    ctx: CanvasRenderingContext2D,
    shape: RevealShape,
    radius: number,
    at: At
): [number, number] {
    ctx.beginPath();

    if (shape.t === 'p') {
        const [x, y] = at(shape.x, shape.y);

        ctx.arc(x, y, radius, 0, Math.PI * 2);

        return [x, y];
    }

    const [x1, y1] = at(shape.x1, shape.y1);

    const [x2, y2] = at(shape.x2, shape.y2);

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    return [x1, y1];
}

function carve(
    ctx: CanvasRenderingContext2D,
    shape: RevealShape,
    r: number,
    at: At,
    alpha: number
) {
    ctx.globalAlpha = alpha;

    const [cx, cy] = traceShape(ctx, shape, r, at);

    if (shape.t === 'p') {
        const grad = ctx.createRadialGradient(
            cx,
            cy,
            r * (1 - SOFT_EDGE),
            cx,
            cy,
            r
        );

        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();

        return;
    }

    ctx.lineCap = 'round';
    ctx.lineWidth = 2 * r;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = r * SOFT_EDGE;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function carveCloudCore(
    ctx: CanvasRenderingContext2D,
    shape: RevealShape,
    radius: number,
    at: At,
    alpha: number
) {
    const core = radius * CLOUD_CORE_RADIUS;

    ctx.globalAlpha = alpha;
    traceShape(ctx, shape, core, at);

    if (shape.t === 'p') {
        ctx.fillStyle = '#000';
        ctx.fill();

        return;
    }

    ctx.lineCap = 'round';
    ctx.lineWidth = core * 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
}

export function WorldFog({
    shapes,
    radius,
    box,
    crop,
    zoom,
    offset,
    still: stillProp = false,
}: WorldFogProps) {
    const quality = useFogQuality();

    const still = stillProp || quality !== 'live';

    const ref = useRef<HTMLCanvasElement>(null);

    const seen = useRef(shapes.length);

    const reveal = useRef<{ first: number; start: number } | null>(null);

    const masksRef = useRef<{
        core: HTMLCanvasElement;
        feathered: HTMLCanvasElement;
    } | null>(null);

    const motionRef = useRef<CloudMotion | null | undefined>(undefined);

    useEffect(
        () => () => {
            motionRef.current?.release();
            motionRef.current = undefined;
        },
        []
    );

    const view = useRef({ zoom, offset });

    const requestPaint = useRef<(() => void) | null>(null);

    useEffect(() => {
        view.current = { zoom, offset: { x: offset.x, y: offset.y } };
        requestPaint.current?.();
    }, [zoom, offset.x, offset.y]);

    const cropX = crop?.x ?? 0;

    const cropY = crop?.y ?? 0;

    const paintWidth = box.width - 2 * cropX;

    const paintHeight = box.height - 2 * cropY;

    const cropped = !!crop;

    useEffect(() => {
        const canvas = ref.current;

        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx || paintWidth <= 0 || paintHeight <= 0) return;

        const scale = cropped
            ? Math.min(
                  CLOUD_PIXEL_SCALE,
                  Math.sqrt(CLOUD_MAX_PIXELS / (paintWidth * paintHeight))
              )
            : Math.min(window.devicePixelRatio || 1, MAX_DPR);

        const w = Math.max(1, Math.round(paintWidth * scale));

        const h = Math.max(1, Math.round(paintHeight * scale));

        const sx = w / paintWidth;

        const sy = h / paintHeight;

        if (canvas.width !== w) canvas.width = w;

        if (canvas.height !== h) canvas.height = h;

        const fill =
            getComputedStyle(canvas).getPropertyValue('--atlas-fog').trim() ||
            FALLBACK_FOG;

        const start = performance.now();

        if (still || shapes.length < seen.current) reveal.current = null;
        else if (shapes.length > seen.current)
            reveal.current = { first: seen.current, start };

        seen.current = shapes.length;

        const revealAnimation = reveal.current;

        const fresh = revealAnimation?.first ?? shapes.length;

        if (cropped && motionRef.current === undefined)
            motionRef.current = acquireCloudMotion();

        const motion = cropped ? motionRef.current : null;

        let texture: HTMLCanvasElement | null | undefined;

        const masks = cropped
            ? (masksRef.current ??= {
                  core: document.createElement('canvas'),
                  feathered: document.createElement('canvas'),
              })
            : null;

        const coreCtx = masks?.core.getContext('2d');

        const featherCtx = masks?.feathered.getContext('2d');

        const featherSupported = typeof featherCtx?.filter === 'string';

        const padX = Math.ceil(w * MASK_PAD);

        const padY = Math.ceil(h * MASK_PAD);

        let mask: {
            progress: number;
            zoom: number;
            x: number;
            y: number;
            gutter: number;
        } | null = null;

        const drawReveal = (
            target: CanvasRenderingContext2D,
            progress: number,
            drawShape: typeof carve,
            r: number,
            at: At
        ) => {
            if (r <= 0) return;

            const easing = cropped
                ? progress * progress * (3 - 2 * progress)
                : progress;

            shapes.forEach((shape, i) =>
                drawShape(target, shape, r, at, i < fresh ? 1 : easing)
            );
            target.globalAlpha = 1;
        };

        const ensureMask = (
            progress: number,
            z: number,
            o: { x: number; y: number },
            r: number
        ) => {
            if (
                mask &&
                mask.progress === progress &&
                mask.zoom === z &&
                Math.abs((o.x - mask.x) * sx) <= padX &&
                Math.abs((o.y - mask.y) * sy) <= padY
            )
                return mask;

            if (!masks || !coreCtx || !featherCtx) return null;

            const blur = Math.min(54, r * CLOUD_EDGE_FEATHER * sx);

            const gutter = featherSupported ? Math.ceil(blur * 3) : 0;

            const maskW = w + 2 * (gutter + padX);

            const maskH = h + 2 * (gutter + padY);

            for (const bitmap of [masks.core, masks.feathered]) {
                if (bitmap.width !== maskW) bitmap.width = maskW;

                if (bitmap.height !== maskH) bitmap.height = maskH;
            }

            const at: At = (x, y) => [
                x * box.width * z + o.x - cropX,
                y * box.height * z + o.y - cropY,
            ];

            coreCtx.resetTransform();
            coreCtx.clearRect(0, 0, maskW, maskH);
            coreCtx.setTransform(sx, 0, 0, sy, gutter + padX, gutter + padY);
            drawReveal(
                coreCtx,
                progress,
                featherSupported ? carveCloudCore : carve,
                r,
                at
            );

            featherCtx.clearRect(0, 0, maskW, maskH);

            if (featherSupported) featherCtx.filter = `blur(${blur}px)`;

            featherCtx.drawImage(masks.core, 0, 0);

            if (featherSupported) featherCtx.filter = 'none';

            mask = { progress, zoom: z, x: o.x, y: o.y, gutter };

            return mask;
        };

        const paint = (progress: number, now: number) => {
            const { zoom: z, offset: o } = view.current;

            const r = radius * box.width * z;

            const at: At = (x, y) => [
                x * box.width * z + o.x - cropX,
                y * box.height * z + o.y - cropY,
            ];

            const left = o.x - cropX;

            const top = o.y - cropY;

            const artWidth = box.width * z;

            const artHeight = box.height * z;

            ctx.setTransform(sx, 0, 0, sy, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, paintWidth, paintHeight);

            let cloud: HTMLCanvasElement | null = null;

            if (cropped) {
                if (motion?.render(still ? 0 : now / 1000)) cloud = motion.canvas;
                else {
                    if (texture === undefined) texture = cloudTexture();

                    cloud = texture;
                }
            }

            const current = cloud && masks ? ensureMask(progress, z, o, r) : null;

            if (cloud && masks && current) {
                const living = cloud === motion?.canvas;

                const scale =
                    Math.max(
                        paintWidth / cloud.width,
                        paintHeight / cloud.height
                    ) * 1.28;

                const width = cloud.width * scale;

                const height = cloud.height * scale;

                const cloudLeft = (paintWidth - width) / 2;

                const cloudTop = (paintHeight - height) / 2;

                const driftX =
                    still || living
                        ? 0
                        : Math.sin(now / 4100) * paintWidth * 0.105;

                const driftY =
                    still || living
                        ? 0
                        : Math.cos(now / 5300) * paintHeight * 0.105;

                ctx.save();
                ctx.beginPath();
                ctx.rect(left, top, artWidth, artHeight);
                ctx.clip();
                ctx.drawImage(
                    cloud,
                    cloudLeft + driftX,
                    cloudTop + driftY,
                    width,
                    height
                );

                if (!living && !still) {
                    ctx.globalAlpha = 0.35;
                    ctx.drawImage(
                        cloud,
                        cloudLeft - driftX * 0.7,
                        cloudTop - driftY * 0.8,
                        width,
                        height
                    );
                }

                ctx.restore();

                ctx.globalCompositeOperation = 'destination-out';
                ctx.drawImage(
                    masks.feathered,
                    current.gutter + padX - (o.x - current.x) * sx,
                    current.gutter + padY - (o.y - current.y) * sy,
                    w,
                    h,
                    0,
                    0,
                    paintWidth,
                    paintHeight
                );

                return;
            }

            ctx.fillStyle = fill;

            if (cropped) ctx.fillRect(left, top, artWidth, artHeight);
            else ctx.fillRect(0, 0, paintWidth, paintHeight);

            ctx.globalCompositeOperation = 'destination-out';
            drawReveal(ctx, progress, carve, r, at);
        };

        const drift = !still && cropped && !!coreCtx && !!featherCtx;

        const revealAt = (now: number) =>
            revealAnimation
                ? Math.min(
                      1,
                      Math.max(0, (now - revealAnimation.start) / FADE_MS)
                  )
                : 1;

        let unsubscribe: (() => void) | null = null;

        let onScreen = true;

        const running = () => onScreen && !document.hidden;

        const stop = () => {
            unsubscribe?.();
            unsubscribe = null;
        };

        const tick = (now: number) => {
            if (!running()) {
                stop();

                return;
            }

            const progress = revealAt(now);

            paint(progress, now);

            if (progress === 1 && reveal.current === revealAnimation)
                reveal.current = null;

            if (progress === 1 && !drift) stop();
        };

        function schedule() {
            if (!unsubscribe && running())
                unsubscribe = subscribe(tick, { fps: 30 });
        }

        paint(revealAt(start), start);

        requestPaint.current = () => {
            if (!running()) return;

            const now = performance.now();

            paint(revealAt(now), now);
        };

        if (revealAt(start) < 1 || drift) schedule();

        const resume = () => {
            if (running()) schedule();
        };

        const observer =
            typeof IntersectionObserver === 'undefined'
                ? null
                : new IntersectionObserver((entries) => {
                      onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
                      resume();
                  });

        observer?.observe(canvas);
        document.addEventListener('visibilitychange', resume);

        return () => {
            requestPaint.current = null;
            stop();
            observer?.disconnect();
            document.removeEventListener('visibilitychange', resume);
        };
    }, [
        shapes,
        radius,
        box.width,
        box.height,
        cropX,
        cropY,
        paintWidth,
        paintHeight,
        cropped,
        still,
    ]);

    return (
        <canvas
            ref={ref}
            data-testid="world-fog"
            aria-hidden
            className="pointer-events-none absolute top-0 left-0"
            style={{
                left: cropX,
                top: cropY,
                width: paintWidth,
                height: paintHeight,
            }}
        />
    );
}
