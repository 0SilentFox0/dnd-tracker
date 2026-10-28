import { POP_MS } from "@/lib/utils/battle/fx/dice";

export interface BadgeSpec {
  value: number;
  state: "plain" | "chosen" | "dropped";
}

const MAX_FONT = 40;

const MIN_FONT = 14;

export const badgeFontPx = (diePx: number) => Math.round(Math.min(MAX_FONT, Math.max(MIN_FONT, 0.55 * diePx)));

const badgeBase = (font: number) =>
  `position:absolute;left:0;top:0;opacity:0;pointer-events:none;font:800 ${font}px/1 system-ui,sans-serif;padding:${Math.round(font * 0.1)}px ${Math.round(font * 0.3)}px;border-radius:${Math.round(font * 0.3)}px;white-space:nowrap;transform-origin:50% 100%;`;

export const badgeHeightPx = (diePx: number) => {
  const font = badgeFontPx(diePx);

  return font + 2 * Math.round(font * 0.1) + 4;
};

const LOOK: Record<BadgeSpec["state"], string> = {
  plain: "color:#fff;background:rgba(20,14,40,.82);border:2px solid rgba(255,255,255,.35);",
  chosen: "color:#1a1200;background:#ffd24a;border:2px solid #fff3b0;box-shadow:0 0 18px rgba(255,210,74,.75);",
  dropped: "color:#9a93b4;background:rgba(20,14,40,.6);border:2px solid rgba(255,255,255,.15);text-decoration:line-through;",
};

const CAPTION =
  "position:absolute;left:0;top:0;transform:translate(-50%,-100%);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;font:700 18px/1.2 system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 10px rgba(0,0,0,.6);white-space:nowrap;max-width:94vw;";

const SMALL = 0.42;

export function createBadgeLayer(host: HTMLElement) {
  const layer = document.createElement("div");

  layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none";
  host.appendChild(layer);

  let items: { el: HTMLElement; x: number; y: number }[] = [];

  let caption: HTMLElement | null = null;

  let timers: number[] = [];

  const place = (el: HTMLElement, x: number, y: number, s: number) => {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = `translate(-50%,-100%) scale(${s})`;
  };

  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
    items = [];
    caption = null;
    layer.replaceChildren();
  };

  return {
    reset(specs: BadgeSpec[], lines: string[] = [], { diePx }: { diePx: number } = { diePx: 96 }) {
      const base = badgeBase(badgeFontPx(diePx));

      clear();
      items = specs.map((spec) => {
        const el = document.createElement("div");

        el.textContent = String(spec.value);
        el.style.cssText = base + LOOK[spec.state];
        layer.appendChild(el);

        return { el, x: 0, y: 0 };
      });

      if (lines.length) {
        caption = document.createElement("div");
        caption.style.cssText = CAPTION;

        for (const text of lines) {
          const line = document.createElement("div");

          line.textContent = text;
          line.style.cssText = "overflow:hidden;text-overflow:ellipsis;max-width:100%";
          caption.appendChild(line);
        }

        layer.appendChild(caption);
      }
    },
    clear,
    moveCaption(x: number, y: number) {
      if (!caption) return;

      caption.style.left = `${x}px`;
      caption.style.top = `${y}px`;
    },
    move(i: number, x: number, y: number) {
      const it = items[i];

      if (!it) return;

      it.x = x;
      it.y = y;

      const shown = it.el.dataset.phase;

      if (shown) place(it.el, x, y, shown === "pop" ? 1 : SMALL);
    },
    reveal(i: number) {
      const it = items[i];

      if (!it || it.el.dataset.phase) return;

      it.el.dataset.phase = "pop";
      it.el.style.opacity = "1";
      place(it.el, it.x, it.y, 0.3);
      // reflow — щоб перехід стартував із малого масштабу
      it.el.getBoundingClientRect();
      it.el.style.transition = "transform 280ms cubic-bezier(.2,1.5,.4,1), opacity 160ms";
      place(it.el, it.x, it.y, 1);
      timers.push(
        window.setTimeout(() => {
          it.el.dataset.phase = "small";
          it.el.style.transition = "transform 350ms ease-in-out";
          place(it.el, it.x, it.y, SMALL);
        }, POP_MS),
      );
    },
    dispose() {
      clear();
      layer.remove();
    },
  };
}

export type BadgeLayer = ReturnType<typeof createBadgeLayer>;
