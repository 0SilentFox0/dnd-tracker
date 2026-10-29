// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { fitWithin, resizeImageToBlob, resizeImageToDataUrl } from "@/lib/utils/common/image-resize";

describe("fitWithin", () => {
  it("не збільшує малі фото", () => expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 }));
  it("зменшує по довшій стороні, зберігаючи пропорцію", () => expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 }));
  it("обмежує площу, зберігаючи пропорцію", () => {
    const { width, height } = fitWithin(6000, 6000, 6000, 16_000_000);

    expect(width * height).toBeLessThanOrEqual(16_000_000);
    expect(width).toBe(height);
  });
  it("площа не впливає на малі картинки", () => expect(fitWithin(4000, 3000, 6000, 16_000_000)).toEqual({ width: 4000, height: 3000 }));
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

describe("resizeImageToBlob", () => {
  afterEach(() => vi.restoreAllMocks());

  const stub = (ctx: unknown, toBlob: (cb: (b: Blob | null) => void) => void) => {
    vi.stubGlobal("createImageBitmap", async () => ({ width: 100, height: 100, close: () => {} }));
    vi.spyOn(document, "createElement").mockReturnValue({ width: 0, height: 0, getContext: () => ctx, toBlob } as never);
  };

  it("помилка, коли toBlob повертає null", async () => {
    stub({ drawImage: () => {} }, (cb) => cb(null));

    await expect(resizeImageToBlob(new File([""], "a.png"), 50)).rejects.toThrow("validation.image.compressFailed");
  });

  it("помилка, коли canvas не дає контекст", async () => {
    stub(null, (cb) => cb(null));

    await expect(resizeImageToBlob(new File([""], "a.png"), 50)).rejects.toThrow("validation.image.tooLarge");
  });
});
