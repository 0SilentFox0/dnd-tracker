import { vi } from 'vitest';

export function mockCanvas() {
    const ops: string[] = [];

    const fills: string[] = [];

    const drawn: { op: string; src: unknown }[] = [];

    let op = 'source-over';

    const ctx = {
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        putImageData: vi.fn(),
        createImageData: (w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
        }),
        drawImage: vi.fn((src: unknown) => drawn.push({ op, src })),
        set fillStyle(value: string) {
            fills.push(value);
        },
        set globalCompositeOperation(value: string) {
            op = value;
            ops.push(value);
        },
        get globalCompositeOperation() {
            return op;
        },
        globalAlpha: 1,
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D
    );

    return { ctx, ops, fills, drawn };
}
