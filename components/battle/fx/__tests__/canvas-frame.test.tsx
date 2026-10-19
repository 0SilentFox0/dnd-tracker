// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CanvasFrame } from "@/components/battle/fx/frames/canvas/CanvasFrame";

function hostSize(px: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(px);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(px);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ setTransform: vi.fn() } as unknown as CanvasRenderingContext2D);
}

describe("CanvasFrame", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("collapsed host → the frame is not started", async () => {
    hostSize(20);

    const frame = vi.fn();

    render(<CanvasFrame frame={frame} delayMs={0} />);
    await new Promise((r) => setTimeout(r, 5));

    expect(frame).not.toHaveBeenCalled();
  });

  it("sized host → the frame gets a positive box", async () => {
    hostSize(80);

    const frame = vi.fn();

    render(<CanvasFrame frame={frame} delayMs={0} />);
    await new Promise((r) => setTimeout(r, 5));

    expect(frame).toHaveBeenCalledWith(expect.anything(), { x: 16, y: 16, w: 48, h: 48 }, { light: false });
  });

  it("a parchment row asks the frame for its light look", async () => {
    hostSize(80);

    const frame = vi.fn();

    render(<CanvasFrame frame={frame} delayMs={0} light />);
    await new Promise((r) => setTimeout(r, 5));

    expect(frame).toHaveBeenCalledWith(expect.anything(), expect.anything(), { light: true });
  });
});
