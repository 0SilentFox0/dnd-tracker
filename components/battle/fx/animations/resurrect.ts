import { halfSize } from "../runtime/anchors";
import { lightBeam } from "../runtime/beam";
import { clamp01, easeOutCubic, envelope } from "../runtime/easing";
import { rand } from "../runtime/geometry";
import { emit, flash, ring } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { leafPath } from "../runtime/shapes";
import { animateEl, schedule, show, tween, wait } from "../runtime/stage";
import { glow, sprite } from "../runtime/texture";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const SOUL_MS = IMPACT_MS.resurrect;

const DESCEND_AT = 520;

const TOTAL_MS = 2700;

const SOFT = ["#ffffff", "#f4f8ff", "#fff6d8"];

const BREATH: Keyframe[] = [
  { transform: "none", filter: "none" },
  { transform: "scale(1.05)", filter: "brightness(1.8) saturate(1.2)", offset: 0.3 },
  { transform: "scale(0.985)", filter: "brightness(1.2)", offset: 0.6 },
  { transform: "none", filter: "none" },
];

interface Petal {
  a: number;
  r: number;
  y: number;
  spin: number;
  rot: number;
  fall: number;
  size: number;
}

function petal(g: CanvasRenderingContext2D, size: number) {
  leafPath(g, 0, size, size * 0.34);
  g.fillStyle = "#fbfaf4";
  g.fill();
  g.strokeStyle = "rgba(230,214,150,0.9)";
  g.lineWidth = 0.7;
  g.stroke();
  g.fillStyle = "rgba(255,220,120,0.8)";
  g.beginPath();
  g.ellipse(size * 0.12, 0, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
  g.fill();
}

export const resurrect: FxAnimation = ({ stage, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const sky = Math.max(-30, target.y - 240);

    const floor = target.y + h;

    const petals: Petal[] = Array.from({ length: 14 }, () => ({ a: rand(0, Math.PI * 2), r: rand(14, w * 0.5), y: rand(sky + 20, floor - 10), spin: rand(1.2, 2.2) * (Math.random() < 0.5 ? -1 : 1), rot: rand(0, 6), fall: rand(14, 30), size: rand(8, 12) }));

    const soulTex = glow("#dff0ff");

    const core = glow("#ffffff");

    const trail: { x: number; y: number }[] = [];

    let soul = { x: target.x, y: sky };

    let t = 0;

    const hide = show(stage, (g) => {
      const column = clamp01(t / 480);

      const fade = 1 - clamp01((t - SOUL_MS - 500) / 1000);

      const breath = 0.85 + Math.sin(t / 260) * 0.15;

      lightBeam(g, target.x, sky, sky + (floor - sky) * easeOutCubic(column), w * 0.6, fade * 0.55 * breath, "255,246,214", 0.4);

      // Lily petals circling slowly down inside the column; the near ones are drawn brighter.
      g.globalCompositeOperation = "source-over";

      for (const p of petals) {
        const k = clamp01((t - 250) / 400);

        const x = target.x + Math.cos(p.a) * p.r;

        const near = Math.sin(p.a) > 0;

        g.save();
        g.translate(x, p.y);
        g.rotate(p.rot);
        g.scale(Math.abs(Math.cos(p.rot * 0.7)) * 0.5 + 0.5, 1);
        g.globalAlpha = k * fade * (near ? 0.95 : 0.5);
        petal(g, p.size);
        g.restore();
      }

      // The soul: a pale wisp coming home down the column.
      const s = clamp01((t - DESCEND_AT) / (SOUL_MS - DESCEND_AT));

      if (s > 0 && s < 1) {
        g.globalCompositeOperation = "lighter";

        trail.forEach((p, n) => sprite(g, soulTex, p.x, p.y, 0.25 + (n / trail.length) * 0.4, undefined, (n / trail.length) * 0.6));
        sprite(g, soulTex, soul.x, soul.y, 1.1, undefined, envelope(s, 0.15, 0.05));
        sprite(g, core, soul.x, soul.y, 0.45, undefined, 1);
      }

      g.globalAlpha = 1;
    });

    schedule(stage, SOUL_MS, () => {
      void flash(stage, target, "#ffffff", 150, 500);
      void ring(stage, target, "#fff6d8", 800, w * 0.9, 3, 0.45);

      for (let n = 0; n < 30; n++) emit(stage, { x: target.x + rand(-w * 0.8, w * 0.8), y: target.y + rand(-h * 0.5, h * 0.5) }, { tints: SOFT, speed: [20, 70], angle: [-Math.PI * 0.75, -Math.PI * 0.25], life: [0.6, 1.1], scale: [0.25, 0.04], gravity: -30 });
    });

    const breathe = el ? wait(stage, SOUL_MS).then(() => animateEl(stage, el, BREATH, { duration: 1000, easing: "ease-out" })) : wait(stage, 0);

    const run = tween(stage, TOTAL_MS, (k, dt) => {
      t = k * TOTAL_MS;

      for (const p of petals) {
        p.a += p.spin * dt;
        p.rot += p.spin * 0.8 * dt;
        p.y += p.fall * dt;

        if (p.y > floor) p.y = sky + 30;
      }

      const s = clamp01((t - DESCEND_AT) / (SOUL_MS - DESCEND_AT));

      const e = s * s * (3 - 2 * s);

      soul = { x: target.x + Math.sin(e * Math.PI * 3) * 18 * (1 - e), y: sky + 20 + (target.y - sky - 20) * e };
      trail.push(soul);

      if (trail.length > 10) trail.shift();
    }).then(hide);

    await Promise.all([run, breathe]);
  });
