import { easeOutCubic, envelope } from "./easing";

export interface BadgeLook {
  top: string;
  bottom: string;
  rim: string;
  ink: string;
}

const badgeHalf = (text: string) => Math.max(19, text.length * 4.2);

/** A small heraldic shield reading `text` (a stat bonus), centred on (x, y); the caller animates its rise and fade. */
export function shieldBadge(g: CanvasRenderingContext2D, x: number, y: number, alpha: number, text: string, look: BadgeLook) {
  const half = badgeHalf(text);

  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = "source-over";
  g.translate(x, y);
  g.scale(1.3, 1.3);
  g.shadowColor = "rgba(0,0,0,0.7)";
  g.shadowBlur = 6;
  g.beginPath();
  g.moveTo(-half, -12);
  g.lineTo(half, -12);
  g.lineTo(half, 0);
  g.quadraticCurveTo(half, 10, 0, 16);
  g.quadraticCurveTo(-half, 10, -half, 0);
  g.closePath();

  const grad = g.createLinearGradient(0, -12, 0, 16);

  grad.addColorStop(0, look.top);
  grad.addColorStop(1, look.bottom);
  g.fillStyle = grad;
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = look.rim;
  g.lineWidth = 1.6;
  g.stroke();
  g.fillStyle = look.ink;
  g.font = "800 12px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 0, 0);
  g.restore();
}

/** A stat-bonus badge at `y` that fades in and rises by `rise` px over `k` ∈ [0, 1]. */
export function risingBadge(g: CanvasRenderingContext2D, x: number, y: number, k: number, text: string, look: BadgeLook, rise: number) {
  if (k <= 0 || k >= 1) return;

  shieldBadge(g, x, y - easeOutCubic(k) * rise, envelope(k, 0.12, 0.3), text, look);
}

/** A stat-penalty badge over `top` that fades in and sags downwards over `k` ∈ [0, 1]; kept below the layer's top edge. */
export function sinkingBadge(g: CanvasRenderingContext2D, x: number, top: number, k: number, text: string, look: BadgeLook) {
  if (k <= 0 || k >= 1) return;

  // the shield is drawn at 1.3×
  const half = badgeHalf(text) * 1.3 + 4;

  const right = g.canvas.clientWidth || Infinity;

  shieldBadge(g, Math.max(half, Math.min(right - half, x)), Math.max(24, top) + easeOutCubic(k) * 12, Math.min(1, k / 0.15, (1 - k) / 0.35), text, look);
}
