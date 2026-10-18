import { edgeGlow, emitOnPerimeter, roundRect } from "../../runtime/frame-kit";
import { show, tween } from "../../runtime/stage";
import type { FrameAnimation } from "./types";

const SMOKE = ["#240c34", "#36124f", "#4a1c6a"];

const WISP = ["#b07cff", "#8a4dff", "#d2b4ff"];

const CLOSE_MS = 1100;

const FADE_MS = 600;

export const necroticFrame: FrameAnimation = async (s, box) => {
  let k = 0;

  let fade = 1;

  const cx = box.x + box.w / 2;

  const cy = box.y + box.h / 2;

  const hide = show(s, (g) => {
    g.save();

    const a = k * fade;

    roundRect(g, box);
    g.fillStyle = `rgba(14,6,20,${0.36 * a})`;
    g.fill();

    // The vignette radius shrinks as k grows, so the darkness closes in from the edges.
    const outer = Math.hypot(box.w, box.h) / 2;

    const vignette = g.createRadialGradient(cx, cy, outer * (1 - 0.7 * k) * 0.35, cx, cy, outer);

    vignette.addColorStop(0, "rgba(40,10,60,0)");
    vignette.addColorStop(0.6, `rgba(55,15,85,${0.5 * a})`);
    vignette.addColorStop(1, `rgba(20,5,30,${0.72 * a})`);
    edgeGlow(g, box, { fill: vignette, shadow: "#7a3cff", blur: 12 * a, stroke: `rgba(140,80,220,${0.8 * a})`, width: 2 });
    g.restore();
  });

  await tween(s, CLOSE_MS, (v) => {
    k = Math.min(1, v / 0.6);

    emitOnPerimeter(s, box, { tints: SMOKE, speed: [12, 30], life: [0.7, 1.1], scale: [0.7, 1.3], drag: 1.2, additive: false, alpha: 0.5 }, { count: 3, inward: 0.6 });

    if (Math.random() < 0.45) emitOnPerimeter(s, box, { tints: WISP, speed: [8, 22], angle: [-Math.PI * 0.75, -Math.PI * 0.25], life: [0.6, 1], scale: [0.16, 0.03], gravity: -25 }, { offset: [4, 14] });
  });
  await tween(s, FADE_MS, (v) => {
    fade = 1 - v;
  });
  hide();
};
