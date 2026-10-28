"use client";

import { useEffect, useRef } from "react";

import type { RevealShape } from "@/types/world";

const FADE_MS = 400;

const SOFT_EDGE = 0.25;

const MAX_DPR = 2;

const FALLBACK_FOG = "rgba(54, 40, 26, 0.9)";

interface WorldFogProps {
  shapes: RevealShape[];
  radius: number;
  box: { width: number; height: number };
  zoom: number;
  offset: { x: number; y: number };
  still?: boolean;
}

function carve(ctx: CanvasRenderingContext2D, shape: RevealShape, r: number, at: (x: number, y: number) => [number, number], alpha: number) {
  ctx.globalAlpha = alpha;

  if (shape.t === "p") {
    const [cx, cy] = at(shape.x, shape.y);

    const grad = ctx.createRadialGradient(cx, cy, r * (1 - SOFT_EDGE), cx, cy, r);

    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    return;
  }

  const [x1, y1] = at(shape.x1, shape.y1);

  const [x2, y2] = at(shape.x2, shape.y2);

  ctx.lineCap = "round";
  ctx.lineWidth = 2 * r;
  ctx.strokeStyle = "rgba(0,0,0,1)";
  ctx.shadowColor = "rgba(0,0,0,1)";
  ctx.shadowBlur = r * SOFT_EDGE;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function WorldFog({ shapes, radius, box, zoom, offset, still = false }: WorldFogProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  const seen = useRef(shapes.length);

  useEffect(() => {
    const canvas = ref.current;

    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx || box.width <= 0 || box.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);

    const fill = getComputedStyle(canvas).getPropertyValue("--atlas-fog").trim() || FALLBACK_FOG;

    const at = (x: number, y: number): [number, number] => [x * box.width * zoom + offset.x, y * box.height * zoom + offset.y];

    const r = radius * box.width * zoom;

    const fresh = shapes.length > seen.current ? seen.current : shapes.length;

    seen.current = shapes.length;

    const paint = (progress: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, box.width, box.height);
      ctx.globalCompositeOperation = "destination-out";
      shapes.forEach((s, i) => carve(ctx, s, r, at, i < fresh ? 1 : progress));
      ctx.globalAlpha = 1;
    };

    if (still || fresh === shapes.length) {
      paint(1);

      return;
    }

    let frame = 0;

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / FADE_MS, 1);

      paint(progress);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [shapes, radius, box.width, box.height, zoom, offset.x, offset.y, still]);

  return <canvas ref={ref} data-testid="world-fog" aria-hidden className="pointer-events-none absolute top-0 left-0" style={{ width: box.width, height: box.height }} />;
}
