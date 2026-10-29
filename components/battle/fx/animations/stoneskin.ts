import type { FxAnimation } from "./types";

import { type BadgeLook, risingBadge } from "@/components/battle/fx/runtime/badge";
import { clamp01, easeOutCubic, envelope } from "@/components/battle/fx/runtime/easing";
import { type FxPoint, rand } from "@/components/battle/fx/runtime/geometry";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { jaggedShape, stonePlate } from "@/components/battle/fx/runtime/shapes";
import { animateEl, type Stage, timeline, wait } from "@/components/battle/fx/runtime/stage";
import { streakBurst } from "@/components/battle/fx/runtime/streaks";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const SNAP_MS = ARCHETYPE_FX.stoneskin.impactMs;

const TOTAL_MS = 2300;

const PLATES = 20;

// Each plate flies for this share of SNAP_MS, starting at its own delay, so they land one after another.
const FLY = 0.6;

const RX = 72;

const RY = 36;

const DUST = ["#6a6058", "#8a8076", "#4e4740"];

const SPARKS = ["#ffffff", "#fff3c0", "#ffd98a"];

const THUD: Keyframe[] = [{ transform: "none" }, { transform: "translateY(4px) scale(0.985)", offset: 0.3 }, { transform: "translateY(-1px)", offset: 0.65 }, { transform: "none" }];

interface Plate {
  start: FxPoint;
  end: FxPoint;
  rot0: number;
  rot1: number;
  delay: number;
  size: number;
  shape: FxPoint[];
  snapped: boolean;
}

function plates(target: FxPoint): Plate[] {
  return Array.from({ length: PLATES }, (_, n) => {
    const a = (n / PLATES) * Math.PI * 2 + rand(-0.12, 0.12);

    const far = rand(120, 170);

    const from = a + rand(-0.6, 0.6);

    const size = rand(10, 14);

    return {
      start: { x: target.x + Math.cos(from) * far, y: target.y + Math.sin(from) * far * 0.7 },
      end: { x: target.x + Math.cos(a) * RX, y: target.y + Math.sin(a) * RY },
      rot0: rand(-4, 4),
      rot1: a + Math.PI / 2,
      delay: rand(0, 0.4),
      size,
      shape: jaggedShape(5, size, 0.35, 0.7),
      snapped: false,
    };
  });
}

const STONE_BADGE: BadgeLook = { top: "#b4aea4", bottom: "#5a5650", rim: "#e6c25a", ink: "#1e1a16" };

// Granite veins (relative to the centre) over the hero inside the shell: the skin itself turning to stone.
function veins(): FxPoint[][] {
  return Array.from({ length: 6 }, () => {
    let x = rand(-RX * 0.7, RX * 0.7);

    let y = rand(-RY * 0.6, RY * 0.6);

    let a = rand(0, Math.PI * 2);

    return Array.from({ length: 5 }, () => {
      a += rand(-0.9, 0.9);
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 6;

      return { x, y };
    });
  });
}

function shell(g: CanvasRenderingContext2D, at: FxPoint, alpha: number, shine: number, cracks: FxPoint[][]) {
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = "source-over";
  g.beginPath();
  g.ellipse(at.x, at.y, RX - 6, RY - 5, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(150,144,136,0.22)";
  g.fill();
  g.strokeStyle = "rgba(225,218,205,0.4)";
  g.lineWidth = 1;

  for (const v of cracks) {
    g.beginPath();

    for (const p of v) g.lineTo(at.x + p.x, at.y + p.y);

    g.stroke();
  }

  g.beginPath();
  g.ellipse(at.x, at.y, RX + 9, RY + 8, 0, 0, Math.PI * 2);
  g.ellipse(at.x, at.y, RX - 9, RY - 8, 0, 0, Math.PI * 2);

  const grad = g.createLinearGradient(at.x - RX, at.y - RY, at.x + RX, at.y + RY);

  grad.addColorStop(0, "rgba(170,164,154,0.75)");
  grad.addColorStop(1, "rgba(70,66,60,0.75)");
  g.fillStyle = grad;
  g.fill("evenodd");
  g.clip("evenodd");

  // A marble glint sweeps across the hardened band.
  const sx = at.x - RX * 1.4 + shine * RX * 2.8;

  const glint = g.createLinearGradient(sx - 16, 0, sx + 16, 0);

  glint.addColorStop(0, "rgba(255,255,255,0)");
  glint.addColorStop(0.5, "rgba(255,252,240,0.85)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  g.globalCompositeOperation = "lighter";
  g.fillStyle = glint;
  g.fillRect(sx - 16, at.y - RY - 10, 32, RY * 2 + 20);
  g.restore();
}

async function thud(stage: Stage, target: FxPoint, el: HTMLElement | null) {
  const feet = { x: target.x, y: target.y + RY - 2 };

  for (let n = 0; n < 14; n++) emit(stage, { x: feet.x + rand(-40, 40), y: feet.y }, { tints: DUST, speed: [30, 120], angle: n % 2 ? [-0.5, 0.15] : [Math.PI - 0.15, Math.PI + 0.5], life: [0.6, 1.1], scale: [0.4, 1.1], drag: 2.5, additive: false, alpha: 0.5, gravity: -15 });

  await Promise.all([animateEl(stage, el, THUD, { duration: 300, easing: "ease-out" }), streakBurst(stage, { x: target.x, y: target.y - RY + 4 }, { colors: SPARKS, count: 10, angle: -Math.PI / 2, cone: 1.2, speed: [120, 260], life: [0.2, 0.4], gravity: 400, width: [1, 1.6] })]);
}

export const stoneskin: FxAnimation = ({ stage, targets, labels }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    const list = plates(target);

    const cracks = veins();

    const glowTex = glow("#c8b89a");

    let shake = 0;

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const k = t / TOTAL_MS;

        const snap = t / SNAP_MS;

        const after = clamp01((t - SNAP_MS) / (TOTAL_MS - SNAP_MS));

        const fade = 1 - clamp01((k - 0.8) / 0.2);

        const at = { x: target.x + Math.sin(t * 0.09) * shake * 3, y: target.y + Math.cos(t * 0.11) * shake * 1.5 };

        sprite(g, glowTex, at.x, at.y, 3, 1.6, envelope(k, 0.2, 0.3) * 0.2);

        if (snap >= 1) shell(g, at, easeOutCubic(clamp01(after * 4)) * fade, clamp01(after * 1.6), cracks);

        g.globalCompositeOperation = "source-over";

        for (const p of list) {
          const u = clamp01((snap - p.delay) / FLY);

          if (u <= 0) continue;

          const e = u * u;

          const x = p.start.x + (p.end.x - p.start.x) * e + (at.x - target.x);

          const y = p.start.y + (p.end.y - p.start.y) * e + (at.y - target.y);

          g.save();
          g.translate(x, y);
          g.rotate(p.rot0 + (p.rot1 - p.rot0) * easeOutCubic(u));
          g.globalAlpha = Math.min(clamp01(u * 4), fade);
          stonePlate(g, p.shape, p.size);
          g.restore();
        }

        risingBadge(g, target.x, target.y - RY - 14, clamp01((t - SNAP_MS - 80) / 1300), labels.stoneskin, STONE_BADGE, 24);
      },
      (t) => {
        shake = t > SNAP_MS ? Math.max(0, 1 - (t - SNAP_MS) / 350) : 0;

        for (const p of list) {
          if (p.snapped || (t / SNAP_MS - p.delay) / FLY < 1) continue;

          p.snapped = true;
          void streakBurst(stage, { x: p.end.x, y: p.end.y }, { colors: SPARKS, count: 4, speed: [60, 160], life: [0.15, 0.3], gravity: 300, width: [0.8, 1.3] });
          emit(stage, p.end, { tints: DUST, speed: [10, 30], life: [0.3, 0.6], scale: [0.3, 0.6], additive: false, alpha: 0.35 });
        }
      },
    );

    const landed = wait(stage, SNAP_MS).then(() => thud(stage, target, el));

    await Promise.all([run, landed]);
  });
