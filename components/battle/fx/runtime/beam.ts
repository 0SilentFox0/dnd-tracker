const W = 64;

const H = 256;

const textures = new Map<string, HTMLCanvasElement>();

// Soft edges, a white core and a fade-in at the top, painted once per colour and stretched to fit.
function beamTexture(rgb: string, fadeTop: number) {
  const key = `${rgb}|${fadeTop}`;

  let tex = textures.get(key);

  if (!tex) {
    tex = document.createElement("canvas");
    tex.width = W;
    tex.height = H;

    const g = tex.getContext("2d");

    if (g) {
      const soft = g.createLinearGradient(0, 0, W, 0);

      soft.addColorStop(0, `rgba(${rgb},0)`);
      soft.addColorStop(0.5, `rgba(${rgb},0.6)`);
      soft.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = soft;
      g.fillRect(0, 0, W, H);

      const core = g.createLinearGradient(W * 0.35, 0, W * 0.65, 0);

      core.addColorStop(0, "rgba(255,255,255,0)");
      core.addColorStop(0.5, "rgba(255,255,255,0.9)");
      core.addColorStop(1, "rgba(255,255,255,0)");
      g.globalCompositeOperation = "lighter";
      g.fillStyle = core;
      g.fillRect(W * 0.35, 0, W * 0.3, H);

      const fade = g.createLinearGradient(0, 0, 0, H);

      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(Math.max(0.01, fadeTop), "rgba(0,0,0,1)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      g.globalCompositeOperation = "destination-in";
      g.fillStyle = fade;
      g.fillRect(0, 0, W, H);
    }

    textures.set(key, tex);
  }

  return tex;
}

/**
 * A vertical shaft of light at `x` from `top` to `bottom`, `width` px from the axis to each soft edge.
 * The top `fadeTop` share of it fades in from nothing, so it reads as coming out of the sky.
 */
export function lightBeam(g: CanvasRenderingContext2D, x: number, top: number, bottom: number, width: number, alpha: number, rgb = "255,236,170", fadeTop = 0.35) {
  if (alpha <= 0 || bottom <= top) return;

  g.globalCompositeOperation = "lighter";
  g.globalAlpha = Math.min(1, alpha);
  g.drawImage(beamTexture(rgb, fadeTop), x - width, top, width * 2, bottom - top);
  g.globalAlpha = 1;
}
