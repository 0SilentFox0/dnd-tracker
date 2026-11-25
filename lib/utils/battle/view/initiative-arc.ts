export interface ArcStyle {
    scale: number;
    opacity: number;
    y: number;
}

const ARC_MAX_Y = 44;

/** Valley arc as in the prototype: the active card sits lowest, the rest rise towards the edges */
export function arcStyle(d: number): ArcStyle {
    const a = Math.abs(d);

    return {
        scale: 1,
        opacity: Math.max(0.55, 1 - 0.12 * a),
        y: 0 - Math.min(6 * a + 4 * a * a, ARC_MAX_Y),
    };
}
