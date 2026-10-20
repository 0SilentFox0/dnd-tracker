import type { FxAnimation } from "./types";

import { faceOf, halfSize } from "@/components/battle/fx/runtime/anchors";
import { sinkingBadge } from "@/components/battle/fx/runtime/badge";
import { clamp01, easeOutCubic, envelope } from "@/components/battle/fx/runtime/easing";
import { chance, type FxPoint, pick, prune, rand, wavePoints } from "@/components/battle/fx/runtime/geometry";
import { holdFilter } from "@/components/battle/fx/runtime/motion";
import { emit } from "@/components/battle/fx/runtime/primitives";
import { perTarget } from "@/components/battle/fx/runtime/recipes";
import { taperedStroke } from "@/components/battle/fx/runtime/shapes";
import { animateEl, timeline } from "@/components/battle/fx/runtime/stage";
import { glow, sprite } from "@/components/battle/fx/runtime/texture";
import { ARCHETYPE_FX } from "@/lib/utils/battle/fx";

const LATCH_MS = ARCHETYPE_FX.siphon.impactMs;

const TOTAL_MS = 2600;

const LET_GO_MS = 1950;

const FOG = ["#8a8690", "#6e6a76", "#a8a4ae"];

const LIGHT = ["#fff1c8", "#ffd27a", "#ffb84a"];

const BADGE = { top: "#3a3440", bottom: "#16121a", rim: "#8a8296", ink: "#d8d0e0" };

interface Mote {
  lane: number;
  u: number;
  speed: number;
  tint: string;
}

function along(pts: FxPoint[], u: number) {
  const f = clamp01(u) * (pts.length - 1);

  const i = Math.min(pts.length - 2, Math.floor(f));

  const k = f - i;

  return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
}

export const siphon: FxAnimation = ({ stage, from, targets }) =>
  perTarget(stage, targets, 0, async ({ at: target, el }) => {
    const { w, h } = halfSize(el);

    const face = faceOf(el, target);

    const ends = [face, { x: target.x, y: target.y - h * 0.2 }, { x: target.x + (target.x - face.x) * 0.6, y: target.y + h * 0.3 }];

    const motes: Mote[] = [];

    const bright = glow("#ffd27a");

    const caster = glow("#ffcf6a");

    let lanes: FxPoint[][] = [];

    const run = timeline(
      stage,
      TOTAL_MS,
      (g, t) => {
        const reach = easeOutCubic(clamp01((t - 200) / (LATCH_MS - 200)));

        const retract = clamp01((t - LET_GO_MS) / 450);

        // Three shadow tendrils reach from the caster, latch on and later slither back.
        lanes = ends.map((end, n) => {
          const k = reach * (1 - retract);

          const bow = (1 - n) * 24;

          // Bowed apart into a fan, so they read as three limbs rather than one beam.
          return wavePoints(from, { x: from.x + (end.x - from.x) * k, y: from.y + (end.y - from.y) * k }, 16, 7, t / 160 + n * 2, 1.5 + n * 0.3).map((p, j) => ({ x: p.x, y: p.y - Math.sin((j / 16) * Math.PI) * bow * k }));
        });

        if (retract < 1) {
          g.globalCompositeOperation = "source-over";
          g.lineCap = "round";
          g.globalAlpha = 1 - retract;

          for (const pts of lanes) {
            taperedStroke(g, pts, "rgba(130,90,180,0.55)", 10, 0.6, 2);
            taperedStroke(g, pts, "#0d0814", 6.5, 0.65, 1.2);
          }

          // Where a tendril bites in, a dark sucker mark with a violet rim.
          if (reach >= 1) for (const end of ends) sprite(g, glow("#6a3aa0"), end.x, end.y, 0.4, undefined, 0.8 * (1 - retract));
        }

        // The stolen strength: warm motes drawn out of the target and up the tendrils.
        for (const m of motes) {
          const p = along(lanes[m.lane], m.u);

          sprite(g, glow(m.tint), p.x, p.y, 0.24, undefined, 0.9);
          sprite(g, bright, p.x, p.y, 0.08, undefined, 1);
        }

        const fed = envelope(clamp01((t - LATCH_MS - 300) / 1500), 0.2, 0.4);

        if (fed > 0) sprite(g, caster, from.x, from.y, 0.9 + fed * 0.3, undefined, fed * 0.4);

        // The foe's own warmth, draining away as the motes leave it.
        const left = 1 - clamp01((t - LATCH_MS) / (LET_GO_MS - LATCH_MS));

        if (t > LATCH_MS - 150 && left > 0) sprite(g, bright, target.x, target.y, (w * 1.6) / 64, (h * 1.8) / 64, 0.4 * left * clamp01((t - LATCH_MS + 150) / 150));

        // A grey badge sags off the weakened foe.
        const sag = clamp01((t - 1500) / 1000);

        sinkingBadge(g, target.x + (target.x - face.x) * 0.2, target.y - h - 12, sag, "−25% шкоди", BADGE);

        g.globalAlpha = 1;
      },
      (t, dt) => {
        // Grey fog creeps in round the foe first, curling into its sleeves.
        if (t < 1600 && chance(0.7, dt)) {
          const side = Math.random() < 0.5 ? -1 : 1;

          emit(stage, { x: target.x + side * (w + rand(10, 30)), y: target.y + rand(-h * 0.3, h) }, { tints: FOG, speed: [20, 45], angle: side > 0 ? [Math.PI * 0.9, Math.PI * 1.1] : [-0.1, 0.1], life: [0.9, 1.4], scale: [0.3, 0.7], additive: false, alpha: 0.2, drag: 1 });
        }

        if (t > LATCH_MS && t < LET_GO_MS - 150 && chance(0.4, dt)) motes.push({ lane: Math.floor(rand(0, 3)), u: 1, speed: rand(0.7, 1.1), tint: pick(LIGHT) });

        for (const m of motes) m.u -= m.speed * dt;

        prune(motes, (m) => m.u > 0);
      },
    );

    const droop = animateEl(stage, el, holdFilter("brightness(.68) saturate(.35)", 0.35, 0.85, { transform: "translateY(4px) scale(.965)" }), { duration: TOTAL_MS - LATCH_MS, delay: LATCH_MS, easing: "ease-in-out" });

    await Promise.all([run, droop]);
  });
