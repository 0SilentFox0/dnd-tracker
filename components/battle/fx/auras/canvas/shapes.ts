export function starPath(g: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points = 5, rot = -Math.PI / 2) {
  g.beginPath();

  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;

    const rad = i % 2 ? inner : outer;

    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }

  g.closePath();
}

// Four-point twinkle drawn additively; k ∈ [0, 1] is its life.
export function twinkle(g: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number) {
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = Math.max(0, alpha);
  g.fillStyle = color;
  starPath(g, x, y, size, size * 0.22, 4, 0);
  g.fill();
}

export function heartPath(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const h = w * 0.9;

  g.beginPath();
  g.moveTo(x, y + h * 0.35);
  g.bezierCurveTo(x - w * 0.6, y - h * 0.1, x - w * 0.35, y - h * 0.6, x, y - h * 0.25);
  g.bezierCurveTo(x + w * 0.35, y - h * 0.6, x + w * 0.6, y - h * 0.1, x, y + h * 0.35);
  g.closePath();
}

export function dropPath(g: CanvasRenderingContext2D, x: number, y: number, rad: number, stretch: number) {
  g.beginPath();
  g.arc(x, y, rad, 0, Math.PI);
  g.quadraticCurveTo(x - rad, y - rad * stretch * 0.6, x, y - rad * stretch);
  g.quadraticCurveTo(x + rad, y - rad * stretch * 0.6, x + rad, y);
  g.closePath();
}
