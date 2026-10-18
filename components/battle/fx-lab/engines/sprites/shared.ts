import type { FxContext } from "../../types";

import { SHEETS } from "@/components/battle/fx/runtime/sprites";

export function flying(ctx: FxContext, ms: number) {
  const sheet = SHEETS.fireball;

  const scale = 1.6;

  const w = sheet.fw * scale;

  const h = sheet.fh * scale;

  const el = document.createElement("div");

  el.className = "fxs-sheet fxs-sheet--loop";
  el.style.setProperty("--src", `url(${sheet.src})`);
  el.style.setProperty("--frames", String(sheet.frames));
  el.style.setProperty("--w", `${w}px`);
  el.style.setProperty("--h", `${h}px`);
  el.style.setProperty("--sheet-w", `${sheet.frames * w}px`);
  el.style.setProperty("--dur", "450ms");
  el.style.left = `${ctx.from.x - w / 2}px`;
  el.style.top = `${ctx.from.y - h / 2}px`;
  el.style.rotate = `${Math.atan2(ctx.to.y - ctx.from.y, ctx.to.x - ctx.from.x)}rad`;
  ctx.layer.appendChild(el);
  el.animate([{ translate: "0 0" }, { translate: `${ctx.to.x - ctx.from.x}px ${ctx.to.y - ctx.from.y}px` }], { duration: ms, easing: "ease-in", fill: "forwards" });

  return el;
}
