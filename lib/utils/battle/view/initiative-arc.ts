export interface ArcStyle {
    scale: number;
    opacity: number;
    y: number;
}

export function arcStyle(d: number): ArcStyle {
    const a = Math.abs(d);

    return {
        scale: Math.max(0.7, 1 - 0.1 * a),
        opacity: Math.max(0.45, 1 - 0.18 * a),
        y: 0.6 * d * d,
    };
}
