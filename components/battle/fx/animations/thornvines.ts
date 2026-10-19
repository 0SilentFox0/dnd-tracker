import { halfSize } from "../runtime/anchors";
import { clamp01, easeOutCubic } from "../runtime/easing";
import { type FxPoint, rand } from "../runtime/geometry";
import { emit, shoot } from "../runtime/primitives";
import { perTarget } from "../runtime/recipes";
import { dropPath } from "../runtime/shapes";
import { animateEl, schedule, show, tween } from "../runtime/stage";
import type { FxAnimation } from "./types";

import { IMPACT_MS } from "@/lib/utils/battle/fx";

const SEED_MS = 300;

const BIND_MS = IMPACT_MS.thornvines;

const TOTAL_MS = 2600;

const SPIT = ["#c8e04a", "#6a9a20", "#3a5a10"];

const SAP = ["#f2e24a", "#d8c020", "#b8a010"];

// Each tightening squeezes the row a little harder.
const SQUEEZE: Keyframe[] = [
  { transform: "none" },
  { transform: "scale(1.02,0.93)", offset: 0.12 },
  { transform: "scale(1,0.97)", offset: 0.3 },
  { transform: "scale(1.025,0.91)", offset: 0.48 },
  { transform: "scale(1,0.97)", offset: 0.66 },
  { transform: "none" },
];

interface Drop extends FxPoint {
  vy: number;
  size: number;
}

export const thornvines: FxAnimation = ({ stage, from, to, targetEls }) =>
  perTarget(stage, to, 0, async (target, i) => {
    const el = targetEls[i];

    const { w, h } = halfSize(el);

    const ground = target.y + h;

    const left = target.x - w - 6;

    const span = w * 2 + 12;

    // Shoots rise from the ground at either end and coil round the row, each a little differently.
    const turns = Math.max(1.5, Math.min(3, w / 40));

    const vines = [
      { phase: 0, turns, fromLeft: true, width: 1 },
      { phase: Math.PI, turns: turns * 0.85, fromLeft: false, width: 1 },
      { phase: Math.PI / 2, turns: turns * 1.15, fromLeft: true, width: 0.6 },
    ];

    const drops: Drop[] = [];

    let t = 0;

    let amp = 0;

    // A point on a vine at u ∈ [0, 1] of its length; `depth` > 0 is the front of the row.
    const at = (v: (typeof vines)[number], u: number) => {
      const a = v.phase + u * v.turns * Math.PI * 2;

      const rise = Math.max(0, 1 - u / 0.16) ** 2;

      const coil = amp * Math.min(1, u / 0.14) * (1 + 0.15 * Math.sin(u * 11 + v.phase));

      return { x: left + (v.fromLeft ? u : 1 - u) * span, y: target.y + (ground - target.y) * rise + Math.sin(a) * coil * h, depth: Math.cos(a) };
    };

    const thorns = Array.from({ length: 30 }, (_, n) => ({ vine: n % 3, u: 0.1 + ((n + 0.5) / 30) * 0.9 + rand(-0.01, 0.01), side: n % 4 < 2 ? 1 : -1 }));

    const drawVine = (g: CanvasRenderingContext2D, v: (typeof vines)[number], grown: number, front: boolean) => {
      const steps = 70;

      for (let n = 0; n < steps * grown; n++) {
        const a = at(v, n / steps);

        const b = at(v, Math.min(grown, (n + 1) / steps));

        if (a.depth > 0 !== front) continue;

        const shade = front ? 1 : 0.55;

        const root = 1 + (1 - n / steps) * 0.6;

        g.strokeStyle = `rgba(12,30,8,${shade})`;
        g.lineWidth = 5.2 * v.width * root;
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
        g.strokeStyle = front ? "#3c6a1e" : "#24401a";
        g.lineWidth = 3.2 * v.width * root;
        g.stroke();
      }
    };

    const hide = show(stage, (g) => {
      const grown = easeOutCubic(clamp01((t - SEED_MS) / (BIND_MS - SEED_MS)));

      const wither = clamp01((t - TOTAL_MS + 500) / 500);

      if (grown <= 0) return;

      g.globalCompositeOperation = "source-over";
      g.lineCap = "round";
      g.globalAlpha = 1 - wither;

      for (const v of vines) drawVine(g, v, grown, false);

      for (const v of vines) drawVine(g, v, grown, true);

      // Thorns along the front turns, beaded with yellow sap.
      for (const th of thorns) {
        if (th.u > grown) continue;

        const p = at(vines[th.vine], th.u);

        if (p.depth <= 0) continue;

        const len = (th.vine === 2 ? 4.5 : 7) * clamp01((grown - th.u) / 0.08);

        g.fillStyle = "#16260c";
        g.beginPath();
        g.moveTo(p.x - 2.4, p.y);
        g.lineTo(p.x + th.side * 2, p.y - th.side * len);
        g.lineTo(p.x + 2.4, p.y);
        g.closePath();
        g.fill();

        if (t > BIND_MS) {
          g.fillStyle = "#f2e24a";
          g.beginPath();
          g.arc(p.x + th.side * 0.8, p.y - th.side * len * 0.75, 1.3, 0, Math.PI * 2);
          g.fill();
        }
      }

      for (const d of drops) {
        g.fillStyle = "#e8d030";
        dropPath(g, d.x, d.y, d.size, 2.2);
        g.fill();
      }

      g.globalAlpha = 1;
    });

    void shoot(stage, from, { x: target.x - w * 0.6, y: ground }, SEED_MS, "#6a9a20", SPIT, 4);

    schedule(stage, SEED_MS, () => {
      for (let n = 0; n < 14; n++) emit(stage, { x: left + rand(0, span * 0.3), y: ground }, { tints: ["#5a4a2a", "#3a3018", "#6a7a3a"], speed: [20, 70], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [0.5, 0.8], scale: [0.4, 0.7], drag: 2, additive: false, alpha: 0.6 });
    });

    schedule(stage, BIND_MS, () => {
      if (el) void animateEl(stage, el, SQUEEZE, { duration: 1300, easing: "ease-out" });
    });

    await tween(stage, TOTAL_MS, (k, dt) => {
      t = k * TOTAL_MS;

      // The coils close in at the bind and pulse tighter with every struggle.
      const tight = clamp01((t - BIND_MS) / 160);

      amp = 1.2 - 0.35 * tight + Math.max(0, Math.sin(((t - BIND_MS) / 650) * Math.PI * 2)) * 0.06 * tight;

      // Yellow sap oozing from the thorns and dripping.
      if (t > BIND_MS + 100 && t < TOTAL_MS - 600 && Math.random() < 0.25) {
        const th = thorns[Math.floor(rand(0, thorns.length))];

        const p = at(vines[th.vine], th.u);

        if (p.depth > 0) drops.push({ x: p.x, y: p.y + 2, vy: 0, size: rand(1.4, 2.2) });
      }

      for (const d of drops) {
        d.vy += 260 * dt;
        d.y += d.vy * dt;
      }

      for (let n = drops.length - 1; n >= 0; n--) if (drops[n].y > ground + 14) drops.splice(n, 1);

      if (t > BIND_MS && t < TOTAL_MS - 500 && Math.random() < 0.3) emit(stage, { x: target.x + rand(-w, w), y: target.y + rand(-h, h) }, { tints: SAP, speed: [8, 20], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.5, 0.8], scale: [0.18, 0.05], gravity: -15 });
    }).then(() => void hide());
  });
