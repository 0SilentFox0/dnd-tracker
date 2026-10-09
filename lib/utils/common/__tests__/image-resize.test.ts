// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { fitWithin, resizeImageToDataUrl } from "@/lib/utils/common/image-resize";

describe("fitWithin", () => {
  it("не збільшує малі фото", () => expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 }));
  it("зменшує по довшій стороні, зберігаючи пропорцію", () => expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 }));
  it("горизонтальне", () => expect(fitWithin(4000, 1000, 1200)).toEqual({ width: 1200, height: 300 }));
});

describe("resizeImageToDataUrl", () => {
  afterEach(() => vi.restoreAllMocks());

  const stub = (toDataURL: (type: string, q: number) => string) => {
    vi.stubGlobal("createImageBitmap", async () => ({ width: 100, height: 100, close: () => {} }));

    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => {} }), toDataURL: vi.fn(toDataURL) };

    vi.spyOn(document, "createElement").mockReturnValue(canvas as never);

    return canvas;
  };

  it("webp, коли браузер його кодує", async () => {
    const canvas = stub((type) => `data:${type};base64,AAA`);

    expect(await resizeImageToDataUrl(new File([""], "a.png"), 50, 0.8)).toBe("data:image/webp;base64,AAA");
    expect(canvas.toDataURL).toHaveBeenCalledTimes(1);
  });

  it("Safari віддає PNG замість webp — перекодування в jpeg з тією ж якістю", async () => {
    const canvas = stub((type) => (type === "image/webp" ? "data:image/png;base64,PNG" : "data:image/jpeg;base64,JPG"));

    expect(await resizeImageToDataUrl(new File([""], "a.png"), 50, 0.8)).toBe("data:image/jpeg;base64,JPG");
    expect(canvas.toDataURL).toHaveBeenLastCalledWith("image/jpeg", 0.8);
  });
});
