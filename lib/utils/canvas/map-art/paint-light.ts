import { type PaintEnv,touches } from './assets';

const TINT_ALPHA = 0.35;

const GLOW_ALPHA = 0.25;

function rgba(color: string, alpha: number): string {
    const m = /^#([0-9a-f]{6})$/i.exec(color);

    if (!m) return `rgba(255,255,255,${alpha})`;

    const n = parseInt(m[1], 16);

    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function paintLight(env: PaintEnv, area: { x: number; y: number; width: number; height: number }): void {
    const { ctx, scene, k, createLayer } = env;

    const { tint, darkness } = scene.ambient;

    const lights = scene.lights.filter((l) => {
        const r = l.radius * k;

        return touches(
            { ...area },
            l.x * k - r,
            l.y * k - r,
            l.x * k + r,
            l.y * k + r
        );
    });

    if (tint.toLowerCase() !== '#000000') {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = TINT_ALPHA;
        ctx.fillStyle = tint;
        ctx.fillRect(area.x, area.y, area.width, area.height);
        ctx.restore();
    }

    if (darkness > 0 && createLayer) {
        const w = Math.ceil(area.width);

        const h = Math.ceil(area.height);

        const layer = createLayer(w, h);

        layer.ctx.fillStyle = `rgba(0,0,0,${darkness})`;
        layer.ctx.fillRect(0, 0, w, h);
        layer.ctx.globalCompositeOperation = 'destination-out';

        for (const l of lights) {
            const cx = l.x * k - area.x;

            const cy = l.y * k - area.y;

            const r = l.radius * k;

            const g = layer.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

            g.addColorStop(0, `rgba(0,0,0,${l.intensity})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            layer.ctx.fillStyle = g;
            layer.ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        }

        ctx.drawImage(layer.canvas, area.x, area.y);
    }

    if (!lights.length) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const l of lights) {
        const cx = l.x * k;

        const cy = l.y * k;

        const r = l.radius * k;

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

        g.addColorStop(0, rgba(l.color, GLOW_ALPHA * l.intensity));
        g.addColorStop(1, rgba(l.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }

    ctx.restore();
}
