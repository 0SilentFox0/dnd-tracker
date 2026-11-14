export interface DetectedGrid {
    cellW: number;
    cellH: number;
    offsetX: number;
    offsetY: number;
    confidence: number;
}

export interface DetectOptions {
    minCell?: number;
    maxCell?: number;
    minConfidence?: number;
}

interface Axis {
    period: number;
    offset: number;
    confidence: number;
}

function profile(gray: Float32Array, w: number, h: number, byColumn: boolean): Float32Array {
    const n = byColumn ? w : h;
    const out = new Float32Array(n);
    const cap = 40;
    if (byColumn) {
        for (let y = 0; y < h; y++) {
            const row = y * w;
            for (let x = 1; x < w; x++) {
                const d = Math.abs(gray[row + x] - gray[row + x - 1]);
                out[x] += d > cap ? cap : d;
            }
        }
    } else {
        for (let y = 1; y < h; y++) {
            const row = y * w;
            const prev = row - w;
            for (let x = 0; x < w; x++) {
                const d = Math.abs(gray[row + x] - gray[prev + x]);
                out[y] += d > cap ? cap : d;
            }
        }
    }
    return out;
}

function detrend(p: Float32Array, win: number): Float32Array {
    const n = p.length;
    const out = new Float32Array(n);
    const pre = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + p[i];
    const half = win >> 1;
    for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - half);
        const b = Math.min(n, i + half + 1);
        out[i] = p[i] - (pre[b] - pre[a]) / (b - a);
    }
    return out;
}

function autocorr(p: Float32Array, lag: number): number {
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i + lag < p.length; i++) {
        const a = p[i];
        const b = p[i + lag];
        num += a * b;
        da += a * a;
        db += b * b;
    }
    const d = Math.sqrt(da * db);
    return d > 0 ? num / d : 0;
}

function analyzeAxis(raw: Float32Array, minCell: number, maxCell: number): Axis | null {
    const p = detrend(raw, maxCell * 2);
    const hi = Math.min(maxCell, Math.floor(p.length / 3));
    if (hi <= minCell) return null;
    const ac = new Float32Array(hi + 2);
    for (let lag = minCell - 1; lag <= hi + 1; lag++) ac[lag] = autocorr(p, lag);
    let best = 0;
    for (let lag = minCell; lag <= hi; lag++) {
        if (ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] > best) best = ac[lag];
    }
    if (best <= 0) return null;
    let lag0 = 0;
    for (let lag = minCell; lag <= hi; lag++) {
        if (ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] >= best * 0.7) {
            lag0 = lag;
            break;
        }
    }
    if (!lag0) return null;
    const y0 = ac[lag0 - 1];
    const y1 = ac[lag0];
    const y2 = ac[lag0 + 1];
    const den = y0 - 2 * y1 + y2;
    const period = lag0 + (den !== 0 ? (0.5 * (y0 - y2)) / den : 0);
    const bins = Math.max(1, Math.round(period * 4));
    const fold = new Float64Array(bins);
    const cnt = new Float64Array(bins);
    for (let i = 0; i < p.length; i++) {
        const b = Math.floor(((i % period) / period) * bins) % bins;
        fold[b] += p[i];
        cnt[b]++;
    }
    let pk = 0;
    let pv = -Infinity;
    for (let b = 0; b < bins; b++) {
        const v = cnt[b] ? fold[b] / cnt[b] : -Infinity;
        if (v > pv) {
            pv = v;
            pk = b;
        }
    }
    return { period, offset: ((pk + 0.5) / bins) * period, confidence: best };
}

export function detectGrid(
    gray: Float32Array,
    w: number,
    h: number,
    opts: DetectOptions = {}
): DetectedGrid | null {
    const { minCell = 12, maxCell = Math.floor(Math.min(w, h) / 3), minConfidence = 0.25 } = opts;
    const x = analyzeAxis(profile(gray, w, h, true), minCell, maxCell);
    const y = analyzeAxis(profile(gray, w, h, false), minCell, maxCell);
    if (!x || !y) return null;
    const confidence = Math.min(x.confidence, y.confidence);
    if (confidence < minConfidence) return null;
    return {
        cellW: x.period,
        cellH: y.period,
        offsetX: x.offset,
        offsetY: y.offset,
        confidence,
    };
}
