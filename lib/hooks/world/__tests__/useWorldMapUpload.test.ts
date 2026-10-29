// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWorldMapUpload } from "../useWorldMapUpload";

import { uploadWorldMapImage } from "@/lib/api/world";
import { resizeImageToBlob } from "@/lib/utils/common/image-resize";

vi.mock("@/lib/api/world", () => ({ uploadWorldMapImage: vi.fn() }));
vi.mock("@/lib/utils/common/image-resize", async (orig) => ({ ...(await orig<object>()), resizeImageToBlob: vi.fn() }));

const bitmap = (width: number, height: number) => vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width, height, close: vi.fn() }));

const image = () => new File(["x"], "m.png", { type: "image/png" });

describe("useWorldMapUpload", () => {
  beforeEach(() => {
    vi.mocked(resizeImageToBlob).mockResolvedValue(new Blob(["y"], { type: "image/webp" }));
    vi.mocked(uploadWorldMapImage).mockResolvedValue("https://x/m.webp");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("downscales a large image to 6000px on the long edge", async () => {
    bitmap(8000, 2000);

    const { result } = renderHook(() => useWorldMapUpload("c1"));

    let out: unknown;

    await act(async () => {
      out = await result.current.upload(image());
    });

    expect(out).toEqual({ imageUrl: "https://x/m.webp", width: 6000, height: 1500 });
    expect(resizeImageToBlob).toHaveBeenCalledWith(expect.any(File), 6000, undefined, 16_000_000);
  });

  it("caps a huge square image by area", async () => {
    bitmap(6000, 6000);

    const { result } = renderHook(() => useWorldMapUpload("c1"));

    let out = { width: 0, height: 0 };

    await act(async () => {
      out = await result.current.upload(image());
    });

    expect(out.width * out.height).toBeLessThanOrEqual(16_000_000);
  });

  it("keeps a small image as is", async () => {
    bitmap(1600, 1066);

    const { result } = renderHook(() => useWorldMapUpload("c1"));

    let out: unknown;

    await act(async () => {
      out = await result.current.upload(image());
    });

    expect(out).toEqual({ imageUrl: "https://x/m.webp", width: 1600, height: 1066 });
  });

  it("rejects a non-image without uploading", async () => {
    bitmap(10, 10);

    const { result } = renderHook(() => useWorldMapUpload("c1"));

    await expect(result.current.upload(new File(["x"], "a.txt", { type: "text/plain" }))).rejects.toThrow("world.errors.chooseImage");
    expect(uploadWorldMapImage).not.toHaveBeenCalled();
  });
});
