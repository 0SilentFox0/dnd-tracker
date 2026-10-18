export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/** Rises over the first `inEdge` of k and falls over the last `outEdge`. */
export function envelope(k: number, inEdge: number, outEdge: number) {
  return clamp01(k / inEdge) * clamp01((1 - k) / outEdge);
}

/** Linear rise to 1 at `peak`, then a linear fall to 0 over `fall`. */
export function pulse(k: number, peak: number, fall = 1 - peak) {
  return k < peak ? k / peak : clamp01(1 - (k - peak) / fall);
}

/** Holds 1 until `from`, then fades linearly to 0 at k = 1. */
export function fadeOut(k: number, from: number) {
  return 1 - clamp01((k - from) / (1 - from));
}

export function fadeInOut(k: number, edge = 0.2) {
  return Math.min(1, k / edge, (1 - k) / edge);
}

export function easeOutCubic(k: number) {
  return 1 - (1 - k) ** 3;
}
