'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
    type FogQuality,
    useFogCompact,
    useFogQuality,
} from '@/lib/hooks/common';
import {
    acquireCloudMotion,
    type CloudMotion,
} from '@/lib/utils/canvas/fog/cloud-motion';
import {
    cloudTexture,
    type FogPalette,
} from '@/lib/utils/canvas/fog/cloud-texture';
import { cellsToMask, diffAdded } from '@/lib/utils/canvas/fog/fog-mask';
import { readFogPalette } from '@/lib/utils/canvas/fog/fog-palette';
import {
    crossfadeMasks,
    type FeatheredMask,
    featherMask,
} from '@/lib/utils/canvas/fog/mask-canvas';
import { subscribe } from '@/lib/utils/canvas/ticker';

const REVEAL_MS = 400;

const MAX_DPR = 1.5;

const NO_CELLS: ReadonlySet<string> = new Set();

export interface FogGrid {
    cols: number;
    rows: number;
    cellPx: number;
    window: { x: number; y: number; cols: number; rows: number } | null;
}

interface Previous {
    key: string;
    visible: ReadonlySet<string>;
    feathered: FeatheredMask;
}

function clampWindow(grid: FogGrid) {
    const w = grid.window;

    if (!w) return { x: 0, y: 0, cols: grid.cols, rows: grid.rows };

    const x = Math.max(0, Math.min(grid.cols, w.x));

    const y = Math.max(0, Math.min(grid.rows, w.y));

    return {
        x,
        y,
        cols: Math.max(0, Math.min(grid.cols - x, w.cols + (w.x - x))),
        rows: Math.max(0, Math.min(grid.rows - y, w.rows + (w.y - y))),
    };
}

function drawCover(
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource & { width: number; height: number },
    width: number,
    height: number
) {
    const scale = Math.max(width / image.width, height / image.height);

    const w = image.width * scale;

    const h = image.height * scale;

    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

export function FogSurface({
    grid,
    visible,
    explored = NO_CELLS,
    quality: forced,
}: {
    grid: FogGrid;
    visible: ReadonlySet<string> | null;
    explored?: ReadonlySet<string>;
    quality?: FogQuality;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const previous = useRef<Previous | null>(null);

    const detected = useFogQuality();

    const compact = useFogCompact();

    const quality = forced ?? detected;

    const [paletteVersion, setPaletteVersion] = useState(0);

    const { cols, rows, cellPx } = grid;

    const mask = useMemo(
        () => cellsToMask(cols, rows, visible, explored),
        [cols, rows, visible, explored]
    );

    const area = clampWindow(grid);

    const motionRef = useRef<CloudMotion | null>(null);

    useEffect(() => {
        if (quality !== 'live') return;

        const acquired = acquireCloudMotion();

        motionRef.current = acquired;

        return () => {
            motionRef.current = null;
            acquired?.release();
        };
    }, [quality]);

    const visibleRef = useRef(visible);

    useEffect(() => {
        visibleRef.current = visible;
    });

    useEffect(() => {
        const observer = new MutationObserver(() =>
            setPaletteVersion((v) => v + 1)
        );

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-palette'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;

        const ctx = canvas?.getContext('2d');

        const feathered = featherMask(mask);

        if (!canvas || !ctx || !feathered || area.cols <= 0 || area.rows <= 0)
            return;

        const cssW = area.cols * cellPx;

        const cssH = area.rows * cellPx;

        const mapW = cols * cellPx;

        const mapH = rows * cellPx;

        const scale =
            Math.min(window.devicePixelRatio || 1, MAX_DPR) *
            (compact ? 0.5 : 1);

        const width = Math.max(1, Math.round(cssW * scale));

        const height = Math.max(1, Math.round(cssH * scale));

        if (canvas.width !== width) canvas.width = width;

        if (canvas.height !== height) canvas.height = height;

        const palette: FogPalette = readFogPalette(canvas);

        const motion = quality === 'live' ? motionRef.current : null;

        const prev = previous.current;

        const nextVisible = visibleRef.current ?? NO_CELLS;

        const animate =
            quality === 'live' &&
            !!prev &&
            prev.key !== mask.key &&
            prev.feathered.canvas.width === feathered.canvas.width &&
            prev.feathered.canvas.height === feathered.canvas.height &&
            diffAdded(prev.visible, nextVisible).length > 0;

        previous.current = {
            key: mask.key,
            visible: nextVisible,
            feathered,
        };

        const blend = animate ? document.createElement('canvas') : null;

        const paint = (seconds: number, progress: number) => {
            let active = feathered;

            if (blend && prev && progress < 1) {
                crossfadeMasks(blend, prev.feathered, feathered, progress);
                active = { ...feathered, canvas: blend };
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.clearRect(0, 0, width, height);
            ctx.setTransform(
                width / cssW,
                0,
                0,
                height / cssH,
                (-area.x * cellPx * width) / cssW,
                (-area.y * cellPx * height) / cssH
            );

            if (quality === 'flat') {
                ctx.fillStyle = palette.flat;
                ctx.fillRect(0, 0, mapW, mapH);
            } else {
                const cloud = motion?.render(seconds, palette)
                    ? motion.canvas
                    : cloudTexture(palette);

                if (cloud) drawCover(ctx, cloud, mapW, mapH);
            }

            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(
                active.canvas,
                active.gutter,
                active.gutter,
                mask.width,
                mask.height,
                0,
                0,
                mapW,
                mapH
            );
            ctx.globalCompositeOperation = 'source-over';
        };

        paint(0, animate ? 0 : 1);

        let unsubscribe: (() => void) | null = null;

        let onScreen = true;

        if (quality === 'live' && motion) {
            const started = performance.now();

            unsubscribe = subscribe(
                (now) => {
                    if (!onScreen) return;

                    const progress = animate
                        ? Math.min(1, (now - started) / REVEAL_MS)
                        : 1;

                    paint(now / 1000, progress);
                },
                { fps: 30 }
            );
        } else if (animate) paint(0, 1);

        const observer =
            typeof IntersectionObserver === 'undefined'
                ? null
                : new IntersectionObserver((entries) => {
                      onScreen =
                          entries[entries.length - 1]?.isIntersecting ?? true;
                  });

        observer?.observe(canvas);

        return () => {
            unsubscribe?.();
            observer?.disconnect();
        };
    }, [
        mask,
        quality,
        compact,
        paletteVersion,
        cols,
        rows,
        cellPx,
        area.x,
        area.y,
        area.cols,
        area.rows,
    ]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            data-fog-surface=""
            data-fog-quality={quality}
            className="pointer-events-none absolute"
            style={{
                left: area.x * cellPx,
                top: area.y * cellPx,
                width: area.cols * cellPx,
                height: area.rows * cellPx,
            }}
        />
    );
}
