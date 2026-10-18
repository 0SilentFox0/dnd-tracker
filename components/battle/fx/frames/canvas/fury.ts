import { emit, show, tween } from "../../runtime/canvas";
import { rand } from "../../runtime/geometry";
import { type FrameAnimation, perimeter, roundRect } from "./types";

const WISP = ["#ff3a2a", "#c8101a", "#ff7a50"];

const PULSE_MS = 600;

const PULSES = 2;

export const furyFrame: FrameAnimation = async (s, box) => {
  let beat = 0;

  let wave = 0;

  const cx = box.x + box.w / 2;

  const cy = box.y + box.h / 2;

  const hide = show(s, (g) => {
    g.save();

    const vignette = g.createRadialGradient(cx, cy, Math.min(box.w, box.h) * 0.25, cx, cy, Math.hypot(box.w, box.h) / 2);

    vignette.addColorStop(0, "rgba(120,0,10,0)");
    vignette.addColorStop(1, `rgba(170,10,20,${0.55 * beat})`);
    roundRect(g, box);
    g.fillStyle = vignette;
    g.fill();
    g.shadowColor = "#ff1a1a";
    g.shadowBlur = 8 + 22 * beat;
    g.strokeStyle = `rgba(215,25,35,${0.35 + 0.65 * beat})`;
    g.lineWidth = 2 + 2 * beat;
    roundRect(g, box);
    g.stroke();

    const out = wave * 12;

    g.globalAlpha = (1 - wave) * 0.9;
    g.lineWidth = 2;
    g.strokeStyle = "#ff4a3a";
    roundRect(g, { x: box.x - out, y: box.y - out, w: box.w + out * 2, h: box.h + out * 2 }, 6 + out);
    g.stroke();
    g.restore();
  });

  for (let i = 0; i < PULSES; i++) {
    await tween(s, PULSE_MS, (v) => {
      beat = Math.max(0, Math.sin(Math.min(1, v * 1.6) * Math.PI)) ** 0.6;
      wave = Math.min(1, v * 1.4);

      if (Math.random() < 0.6) {
        const p = perimeter(box, Math.random());

        emit(s, { x: p.x, y: p.y }, { tints: WISP, speed: [10, 35], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [0.5, 0.9], scale: [rand(0.18, 0.3), 0.04], gravity: -60, drag: 0.8 });
      }
    });
  }

  hide();
};
