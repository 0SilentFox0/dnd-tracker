export interface BadgeLook {
  top: string;
  bottom: string;
  rim: string;
  ink: string;
}

/** A small heraldic shield reading `text` (a stat bonus), centred on (x, y); the caller animates its rise and fade. */
export function shieldBadge(g: CanvasRenderingContext2D, x: number, y: number, alpha: number, text: string, look: BadgeLook) {
  const half = Math.max(19, text.length * 4.2);

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
