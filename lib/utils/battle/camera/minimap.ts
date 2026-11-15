import type { Camera, Frame } from './camera';

const unit = (v: number) => Math.min(1, Math.max(0, v));

export function minimapViewport(
    cam: Camera,
    frame: Frame
): { x: number; y: number; w: number; h: number } {
    const { avail, content } = frame;

    const x0 = unit(-cam.x / cam.zoom / content.width);

    const y0 = unit(-cam.y / cam.zoom / content.height);

    const x1 = unit((avail.width - cam.x) / cam.zoom / content.width);

    const y1 = unit((avail.height - cam.y) / cam.zoom / content.height);

    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function minimapPointToContent(
    nx: number,
    ny: number,
    frame: Frame
): { x: number; y: number } {
    return { x: nx * frame.content.width, y: ny * frame.content.height };
}
