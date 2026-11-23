'use client';

import { useEffect, useRef } from 'react';

import {
    createWorldCloudMotion,
    worldCloudTexture,
} from './world-cloud-texture';

import type { RevealShape } from '@/types/world';

const FADE_MS = 400;

const SOFT_EDGE = 0.25;

const MAX_DPR = 2;

const CLOUD_CORE_RADIUS = 0.64;

const CLOUD_EDGE_FEATHER = 0.15;

const CLOUD_MAX_PIXELS = 580_000;

const CLOUD_PIXEL_SCALE = 0.72;

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

function carve(
    ctx: CanvasRenderingContext2D,
    shape: RevealShape,
    r: number,
    at: (x: number, y: number) => [number, number],
    alpha: number
) {
    ctx.globalAlpha = alpha;

    if (shape.t === 'p') {
        const [cx, cy] = at(shape.x, shape.y);

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
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        return;
    }

    const [x1, y1] = at(shape.x1, shape.y1);

    const [x2, y2] = at(shape.x2, shape.y2);

    ctx.lineCap = 'round';
    ctx.lineWidth = 2 * r;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = r * SOFT_EDGE;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function carveCloudCore(
    ctx: CanvasRenderingContext2D,
    shape: RevealShape,
    radius: number,
    at: (x: number, y: number) => [number, number],
    alpha: number
) {
    const core = radius * CLOUD_CORE_RADIUS;

    ctx.globalAlpha = alpha;
    ctx.beginPath();

    if (shape.t === 'p') {
        const [x, y] = at(shape.x, shape.y);

        ctx.fillStyle = '#000';
        ctx.arc(x, y, core, 0, Math.PI * 2);
        ctx.fill();

        return;
    }

    const [x1, y1] = at(shape.x1, shape.y1);

    const [x2, y2] = at(shape.x2, shape.y2);

    ctx.lineCap = 'round';
    ctx.lineWidth = core * 2;
    ctx.strokeStyle = '#000';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

export function WorldFog({
    shapes,
    radius,
    box,
    crop,
    zoom,
    offset,
    still = false,
}: WorldFogProps) {
    const ref = useRef<HTMLCanvasElement>(null);

    const seen = useRef(shapes.length);

    const reveal = useRef<{ first: number; start: number } | null>(null);

    const masksRef = useRef<{
        core: HTMLCanvasElement;
        feathered: HTMLCanvasElement;
    } | null>(null);

    const motionRef = useRef<
        ReturnType<typeof createWorldCloudMotion> | undefined
    >(undefined);

    useEffect(
        () => () => {
            motionRef.current?.dispose();
            motionRef.current = undefined;
        },
        []
    );

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

        const at = (x: number, y: number): [number, number] => [
            x * box.width * zoom + offset.x - cropX,
            y * box.height * zoom + offset.y - cropY,
        ];

        const r = radius * box.width * zoom;

        const start = performance.now();

        if (still || shapes.length < seen.current) reveal.current = null;
        else if (shapes.length > seen.current)
            reveal.current = { first: seen.current, start };

        seen.current = shapes.length;

        const revealAnimation = reveal.current;

        const fresh = revealAnimation?.first ?? shapes.length;

        if (cropped && motionRef.current === undefined)
            motionRef.current = createWorldCloudMotion();

        const motion = cropped ? motionRef.current : null;

        const texture = cropped ? worldCloudTexture() : null;

        const masks = texture
            ? (masksRef.current ??= {
                  core: document.createElement('canvas'),
                  feathered: document.createElement('canvas'),
              })
            : null;

        const coreCtx = masks?.core.getContext('2d');

        const featherCtx = masks?.feathered.getContext('2d');

        const featherSupported = typeof featherCtx?.filter === 'string';

        const blur = Math.min(54, r * CLOUD_EDGE_FEATHER * sx);

        const gutter = featherSupported ? Math.ceil(blur * 3) : 0;

        if (masks) {
            for (const bitmap of [masks.core, masks.feathered]) {
                if (bitmap.width !== w + 2 * gutter)
                    bitmap.width = w + 2 * gutter;

                if (bitmap.height !== h + 2 * gutter)
                    bitmap.height = h + 2 * gutter;
            }
        }

        const left = offset.x - cropX;

        const top = offset.y - cropY;

        const artWidth = box.width * zoom;

        const artHeight = box.height * zoom;

        const drawReveal = (
            target: CanvasRenderingContext2D,
            progress: number,
            drawShape = carve
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

        let maskProgress = -1;

        const paint = (progress: number, now: number) => {
            ctx.setTransform(sx, 0, 0, sy, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, paintWidth, paintHeight);

            if (texture && masks && coreCtx && featherCtx) {
                if (progress !== maskProgress) {
                    coreCtx.resetTransform();
                    coreCtx.clearRect(
                        0,
                        0,
                        masks.core.width,
                        masks.core.height
                    );
                    coreCtx.setTransform(sx, 0, 0, sy, gutter, gutter);
                    drawReveal(
                        coreCtx,
                        progress,
                        featherSupported ? carveCloudCore : carve
                    );

                    featherCtx.clearRect(
                        0,
                        0,
                        masks.feathered.width,
                        masks.feathered.height
                    );

                    if (featherSupported) featherCtx.filter = `blur(${blur}px)`;

                    featherCtx.drawImage(masks.core, 0, 0);

                    if (featherSupported) featherCtx.filter = 'none';

                    maskProgress = progress;
                }

                const cloud = motion?.render(still ? 0 : now / 1000)
                    ? motion.canvas
                    : texture;

                const living = cloud !== texture;

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
                    gutter,
                    gutter,
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
            drawReveal(ctx, progress);
        };

        const drift = !still && !!texture && !!coreCtx && !!featherCtx;

        const revealAt = (now: number) =>
            revealAnimation
                ? Math.min(
                      1,
                      Math.max(0, (now - revealAnimation.start) / FADE_MS)
                  )
                : 1;

        paint(revealAt(start), start);

        if (revealAt(start) === 1 && !drift) return;

        let frame = 0;

        const tick = (now: number) => {
            const progress = revealAt(now);

            paint(progress, now);

            if (progress === 1 && reveal.current === revealAnimation)
                reveal.current = null;

            if (progress < 1 || drift) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
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
        zoom,
        offset.x,
        offset.y,
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
