type SvgMouseEvent = { clientX: number; clientY: number; currentTarget: SVGElement };

export function svgPoint(e: SvgMouseEvent): { x: number; y: number } | null {
    const svg = e.currentTarget.ownerSVGElement;

    const m = svg?.getScreenCTM();

    if (!svg || !m) return null;

    const p = svg.createSVGPoint();

    p.x = e.clientX;
    p.y = e.clientY;

    const at = p.matrixTransform(m.inverse());

    return { x: at.x, y: at.y };
}
