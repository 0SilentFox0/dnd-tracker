import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadTrackFile } from "../tracks";

const uploadToSignedUrl = vi.hoisted(() => vi.fn(async () => ({ data: { path: "p", fullPath: "p" }, error: null })));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }) }));

const PATH = "c1/0123456789abcdef0123456789abcdef.mp3";

describe("uploadTrackFile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("квиток → пряме завантаження в Storage з річним кешем → запис треку", async () => {
    const fetch = vi.fn(async (url: string, _init?: RequestInit) =>
      url.endsWith("/tracks/upload-url")
        ? new Response(JSON.stringify({ bucket: "battle-music", path: PATH, token: "tok", contentType: "audio/mpeg" }), { status: 200 })
        : new Response(JSON.stringify({ id: "t1", title: "Бій" }), { status: 201 }),
    );

    vi.stubGlobal("fetch", fetch);

    const file = new File([new Uint8Array(100)], "Бій.mp3", { type: "audio/mpeg" });

    await uploadTrackFile("c1", file, { title: "Бій", durationSec: 121.6 });

    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({ name: "Бій.mp3", size: 100, contentType: "audio/mpeg" });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(PATH, "tok", file, { contentType: "audio/mpeg", cacheControl: "31536000" });
    expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toEqual({ kind: "file", path: PATH, title: "Бій", durationSec: 122 });
  });

  it("невалідний файл — помилка без жодного запиту", async () => {
    const fetch = vi.fn();

    vi.stubGlobal("fetch", fetch);

    await expect(uploadTrackFile("c1", new File(["x"], "a.wav", { type: "audio/wav" }), { title: "a", durationSec: null })).rejects.toThrow("Потрібен файл MP3 або M4A до 10 МБ");
    expect(fetch).not.toHaveBeenCalled();
  });
});
