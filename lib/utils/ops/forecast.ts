const MAX_POINTS = 60;

const HOUR_MS = 3_600_000;

/** `t` is epoch ms; least-squares slope over the last points, null when flat or falling. */
export function forecastHoursToLimit(
    points: { t: number; v: number }[],
    limit: number
): number | null {
    const pts = points.slice(-MAX_POINTS);

    if (pts.length < 2) return null;

    const n = pts.length;

    const mt = pts.reduce((a, p) => a + p.t, 0) / n;

    const mv = pts.reduce((a, p) => a + p.v, 0) / n;

    let num = 0;

    let den = 0;

    for (const p of pts) {
        num += (p.t - mt) * (p.v - mv);
        den += (p.t - mt) ** 2;
    }

    if (den === 0) return null;

    const slope = num / den;

    if (slope <= 0) return null;

    const last = pts[n - 1].v;

    if (last >= limit) return 0;

    return (limit - last) / slope / HOUR_MS;
}
