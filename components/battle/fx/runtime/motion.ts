interface MotionStep {
  at: number;
  x: number;
  y: number;
  rot?: number;
}

/**
 * A piecewise-linear move of a row: WAAPI keyframes for the row and `sample(t)` for the canvas,
 * so whatever is drawn attached to the row (chains, strings) follows it exactly.
 */
export function motionPath(steps: MotionStep[]) {
  const duration = steps[steps.length - 1].at;

  const keyframes: Keyframe[] = steps.map((p) => ({ offset: p.at / duration, transform: `translate(${p.x}px,${p.y}px) rotate(${p.rot ?? 0}deg)` }));

  const sample = (t: number) => {
    if (t <= steps[0].at) return { x: steps[0].x, y: steps[0].y, rot: steps[0].rot ?? 0 };

    for (let i = 1; i < steps.length; i++) {
      const b = steps[i];

      if (t > b.at) continue;

      const a = steps[i - 1];

      const k = (t - a.at) / (b.at - a.at || 1);

      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, rot: (a.rot ?? 0) + ((b.rot ?? 0) - (a.rot ?? 0)) * k };
    }

    const last = steps[steps.length - 1];

    return { x: last.x, y: last.y, rot: last.rot ?? 0 };
  };

  return { keyframes, duration, sample };
}
