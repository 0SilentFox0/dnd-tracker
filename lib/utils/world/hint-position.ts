export interface HintBox {
    width: number;
    height: number;
}

const GAP = 16;

const MARGIN = 4;

/** Top-left for a hint placed beside the pointer, flipped and clamped to stay inside the box. */
export function hintPosition(
    pointer: { x: number; y: number },
    box: HintBox,
    size: HintBox
): { left: number; top: number } {
    const fitsRight = pointer.x + GAP + size.width <= box.width - MARGIN;

    const fitsBelow = pointer.y + GAP + size.height <= box.height - MARGIN;

    const left = fitsRight ? pointer.x + GAP : pointer.x - GAP - size.width;

    const top = fitsBelow ? pointer.y + GAP : pointer.y - GAP - size.height;

    const clamp = (v: number, span: number, extent: number) =>
        Math.max(MARGIN, Math.min(v, extent - span - MARGIN));

    return {
        left: clamp(left, size.width, box.width),
        top: clamp(top, size.height, box.height),
    };
}
