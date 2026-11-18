import { type MapView,MIN_TAP_CELL_PX } from '@/lib/utils/battle/grid/layout';
import { clamp } from '@/lib/utils/common/clamp';

export interface Size {
    width: number;
    height: number;
}

export interface Camera {
    zoom: number;
    x: number;
    y: number;
}

export interface Frame {
    avail: Size;
    content: Size;
    bounds: { min: number; max: number };
}

export const CAMERA_MAX_CELL_PX = 3 * MIN_TAP_CELL_PX;

export function cameraBounds(fitCellPx: number): { min: 1; max: number } {
    return {
        min: 1,
        max: Math.max(1, CAMERA_MAX_CELL_PX / Math.max(fitCellPx, 1e-6)),
    };
}

export function tapZoom(fitCellPx: number): number {
    return Math.max(1, MIN_TAP_CELL_PX / Math.max(fitCellPx, 1e-6));
}

export function needsCamera(view: MapView): boolean {
    return view.grow > 1;
}

function clampAxis(offset: number, avail: number, span: number): number {
    return span <= avail
        ? (avail - span) / 2
        : clamp(offset, avail - span, 0);
}

export function clampCamera(cam: Camera, frame: Frame): Camera {
    const zoom = clamp(cam.zoom, frame.bounds.min, frame.bounds.max);

    return {
        zoom,
        x: clampAxis(cam.x, frame.avail.width, frame.content.width * zoom),
        y: clampAxis(cam.y, frame.avail.height, frame.content.height * zoom),
    };
}

export function fitAllCamera(frame: Frame): Camera {
    return clampCamera({ zoom: 1, x: 0, y: 0 }, frame);
}

export function centerOn(
    p: { x: number; y: number },
    zoom: number,
    frame: Frame
): Camera {
    const z = clamp(zoom, frame.bounds.min, frame.bounds.max);

    return clampCamera(
        {
            zoom: z,
            x: frame.avail.width / 2 - p.x * z,
            y: frame.avail.height / 2 - p.y * z,
        },
        frame
    );
}

export function zoomAround(
    cam: Camera,
    factor: number,
    screen: { x: number; y: number },
    frame: Frame
): Camera {
    const zoom = clamp(cam.zoom * factor, frame.bounds.min, frame.bounds.max);

    if (zoom === cam.zoom) return clampCamera(cam, frame);

    const lx = (screen.x - cam.x) / cam.zoom;

    const ly = (screen.y - cam.y) / cam.zoom;

    return clampCamera(
        { zoom, x: screen.x - lx * zoom, y: screen.y - ly * zoom },
        frame
    );
}

export function panBy(
    cam: Camera,
    dx: number,
    dy: number,
    frame: Frame
): Camera {
    return clampCamera({ ...cam, x: cam.x + dx, y: cam.y + dy }, frame);
}

export function easeCamera(
    from: Camera,
    to: Camera,
    t: number,
    avail: Size
): Camera {
    const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

    const zoom = from.zoom * (to.zoom / from.zoom) ** e;

    const axis = (a: number, b: number, size: number) => {
        const ca = (size / 2 - a) / from.zoom;

        const cb = (size / 2 - b) / to.zoom;

        return size / 2 - (ca + (cb - ca) * e) * zoom;
    };

    return {
        zoom,
        x: axis(from.x, to.x, avail.width),
        y: axis(from.y, to.y, avail.height),
    };
}

export function inComfort(
    cam: Camera,
    p: { x: number; y: number },
    frame: Frame,
    margin = 0.2
): boolean {
    const sx = p.x * cam.zoom + cam.x;

    const sy = p.y * cam.zoom + cam.y;

    const { width, height } = frame.avail;

    return (
        sx >= width * margin &&
        sx <= width * (1 - margin) &&
        sy >= height * margin &&
        sy <= height * (1 - margin)
    );
}
