import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { detectGrid } from './detect-grid';

function gray(path: string, maxSide: number) {
    const dir = mkdtempSync(join(tmpdir(), 'gd-'));
    const out = join(dir, 'x.bmp');
    execFileSync('sips', ['-Z', String(maxSide), '-s', 'format', 'bmp', path, '--out', out], { stdio: 'ignore' });
    const b = readFileSync(out);
    const off = b.readUInt32LE(10);
    const w = b.readInt32LE(18);
    const hh = b.readInt32LE(22);
    const h = Math.abs(hh);
    const bpp = b.readUInt16LE(28);
    const bytes = bpp / 8;
    const stride = Math.ceil((w * bytes) / 4) * 4;
    const g = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        const sy = hh > 0 ? h - 1 - y : y;
        for (let x = 0; x < w; x++) {
            const i = off + sy * stride + x * bytes;
            g[y * w + x] = 0.299 * b[i + 2] + 0.587 * b[i + 1] + 0.114 * b[i];
        }
    }
    return { g, w, h };
}

for (const p of process.argv.slice(2)) {
    const { g, w, h } = gray(p, Number(process.env.SIDE ?? 1024));
    console.log(p.split('/').pop(), `${w}x${h}`, JSON.stringify(detectGrid(g, w, h, { minCell: Number(process.env.MINC ?? 12), minConfidence: 0 })));
}
