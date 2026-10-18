import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isPrivateIp, safeFetchBuffer, sniffImageMime } from "@/lib/utils/api/safe-fetch";

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

const OPTS = { maxBytes: 100 };

function imgResponse(body: Uint8Array, headers: Record<string, string> = {}) {
  return new Response(Buffer.from(body), { status: 200, headers: { "content-type": "image/png", ...headers } });
}

describe("safe-fetch", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("isPrivateIp covers v4/v6 ranges", () => {
    for (const ip of ["0.0.0.0", "10.1.1.1", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.1.1", "224.0.0.1", "240.0.0.1", "::", "::1", "fc00::1", "fd12::1", "fe80::1", "ff02::1", "::ffff:10.0.0.1", "::ffff:7f00:1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }

    for (const ip of ["8.8.8.8", "172.32.0.1", "93.184.216.34", "2606:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it("rejects private resolved address, literal IP, localhost and http", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }]);

    await expect(safeFetchBuffer("https://evil.example/a.png", OPTS)).rejects.toThrow("внутрішню");
    await expect(safeFetchBuffer("https://127.0.0.1/a.png", OPTS)).rejects.toThrow("внутрішню");
    await expect(safeFetchBuffer("https://[::1]/a.png", OPTS)).rejects.toThrow("внутрішню");
    await expect(safeFetchBuffer("https://foo.localhost/a.png", OPTS)).rejects.toThrow("внутрішню");
    await expect(safeFetchBuffer("http://example.com/a.png", OPTS)).rejects.toThrow("https");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects redirect to a private host", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://internal.example/x.png" } }));

    vi.stubGlobal("fetch", fetchMock);
    lookupMock.mockImplementation(async (h: string) => [{ address: h === "internal.example" ? "192.168.0.1" : "93.184.216.34", family: 4 }]);

    await expect(safeFetchBuffer("https://ok.example/a.png", OPTS)).rejects.toThrow("внутрішню");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows at most 3 redirects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(null, { status: 302, headers: { location: "https://ok.example/n" } })));

    await expect(safeFetchBuffer("https://ok.example/a.png", OPTS)).rejects.toThrow("перенаправлень");
  });

  it("rejects oversize by content-length and by streamed bytes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(imgResponse(PNG, { "content-length": "101" })));
    await expect(safeFetchBuffer("https://ok.example/a.png", OPTS)).rejects.toThrow("завеликий");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(imgResponse(new Uint8Array(150))));
    await expect(safeFetchBuffer("https://ok.example/a.png", OPTS)).rejects.toThrow("завеликий");
  });

  it("returns body for a valid response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(imgResponse(PNG)));

    const r = await safeFetchBuffer("https://ok.example/a.png", OPTS);

    expect(r.status).toBe(200);
    expect(r.contentType).toBe("image/png");
    expect(r.body.equals(PNG)).toBe(true);
  });

  it("aborts after the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_u: unknown, init: RequestInit) => new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted"))))));

    const assertion = expect(safeFetchBuffer("https://ok.example/a.png", OPTS)).rejects.toThrow("Час очікування");

    await vi.advanceTimersByTimeAsync(10_001);
    await assertion;
  });

  it("sniffImageMime recognises allowed formats only", () => {
    expect(sniffImageMime(PNG)).toBe("image/png");
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageMime(Buffer.from("GIF89a"))).toBe("image/gif");
    expect(sniffImageMime(Buffer.from("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageMime(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
  });
});
