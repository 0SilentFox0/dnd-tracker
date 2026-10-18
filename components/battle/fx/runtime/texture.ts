export const TEX = 64;

const textures = new Map<string, HTMLCanvasElement>();

// Needs 6-digit hex: the alpha stops append a two-digit suffix.
export function glow(color: string) {
  let tex = textures.get(color);

  if (!tex) {
    tex = document.createElement("canvas");
    tex.width = tex.height = TEX;

    const g = tex.getContext("2d");

    if (g) {
      const grad = g.createRadialGradient(TEX / 2, TEX / 2, 0, TEX / 2, TEX / 2, TEX / 2);

      grad.addColorStop(0, color);
      grad.addColorStop(0.3, `${color}b3`);
      grad.addColorStop(1, `${color}00`);
      g.fillStyle = grad;
      g.fillRect(0, 0, TEX, TEX);
    }

    textures.set(color, tex);
  }

  return tex;
}

export function sprite(g: CanvasRenderingContext2D, tex: HTMLCanvasElement, x: number, y: number, sx: number, sy = sx, alpha = 1, additive = true, anchorY = 0.5) {
  g.globalAlpha = Math.max(0, alpha);
  g.globalCompositeOperation = additive ? "lighter" : "source-over";
  g.drawImage(tex, x - (TEX * sx) / 2, y - TEX * sy * anchorY, TEX * sx, TEX * sy);
}
