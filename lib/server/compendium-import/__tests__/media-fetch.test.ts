import { describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { fetchImportImage } from "@/lib/server/compendium-import/media/fetch-image";
import { type safeFetchBuffer,SafeFetchError } from "@/lib/utils/api/safe-fetch";

const BYTES = {
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2]),
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1]),
  gif: Buffer.from("GIF89a-data", "latin1"),
  webp: Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBP")]),
};

const respond = (body: Buffer, contentType: string | null = "image/png", status = 200) =>
  vi.fn().mockResolvedValue({ status, contentType, body }) as unknown as typeof safeFetchBuffer;

describe("fetchImportImage", () => {
  it.each([
    ["png", "image/png"],
    ["jpeg", "image/jpeg"],
    ["gif", "image/gif"],
    ["webp", "image/webp"],
  ] as const)("accepts %s and sniffs the mime", async (key, mime) => {
    const r = await fetchImportImage("https://a.example/x", respond(BYTES[key], "application/octet-stream"));

    expect(r).toMatchObject({ ok: true, mime });
    expect(r.ok && r.sha256).toHaveLength(64);
  });

  it("accepts a missing content type and uses sniffed mime over declared", async () => {
    expect(await fetchImportImage("https://a.example/x", respond(BYTES.jpeg, null))).toMatchObject({ ok: true, mime: "image/jpeg" });
    expect(await fetchImportImage("https://a.example/x", respond(BYTES.jpeg, "image/png; charset=x"))).toMatchObject({ ok: true, mime: "image/jpeg" });
  });

  it("rejects html bytes under an image type, svg and html type with png bytes", async () => {
    const bad = { ok: false, reason: "MEDIA_BAD_FORMAT", retryable: false };

    expect(await fetchImportImage("https://a.example/x", respond(Buffer.from("<html></html>")))).toEqual(bad);
    expect(await fetchImportImage("https://a.example/x", respond(Buffer.from("<svg/>"), "image/svg+xml"))).toEqual(bad);
    expect(await fetchImportImage("https://a.example/x", respond(BYTES.png, "text/html"))).toEqual(bad);
  });

  it("maps http status", async () => {
    expect(await fetchImportImage("https://a.example/x", respond(Buffer.alloc(0), null, 404))).toEqual({ ok: false, reason: "MEDIA_HTTP_STATUS", params: { status: 404 }, retryable: false });
    expect(await fetchImportImage("https://a.example/x", respond(Buffer.alloc(0), null, 503))).toMatchObject({ params: { status: 503 }, retryable: true });
    expect(await fetchImportImage("https://a.example/x", respond(Buffer.alloc(0), null, 429))).toMatchObject({ retryable: true });
  });

  it.each([
    [API_ERRORS.SAFE_FETCH_INVALID_URL, "MEDIA_INVALID_URL", false],
    [API_ERRORS.SAFE_FETCH_HTTPS_ONLY, "MEDIA_HTTPS_ONLY", false],
    [API_ERRORS.SAFE_FETCH_INTERNAL_URL, "MEDIA_PRIVATE_HOST", false],
    [API_ERRORS.SAFE_FETCH_TIMEOUT, "MEDIA_TIMEOUT", true],
    [API_ERRORS.SAFE_FETCH_DNS_FAILED, "MEDIA_DNS", true],
    [API_ERRORS.SAFE_FETCH_TOO_LARGE, "MEDIA_TOO_LARGE", false],
    [API_ERRORS.SAFE_FETCH_TOO_MANY_REDIRECTS, "MEDIA_REDIRECTS", false],
    [API_ERRORS.SAFE_FETCH_FAILED, "MEDIA_FETCH_FAILED", true],
  ])("maps %s", async (message, reason, retryable) => {
    const fetchBuffer = vi.fn().mockRejectedValue(new SafeFetchError(message)) as unknown as typeof safeFetchBuffer;

    expect(await fetchImportImage("https://a.example/x", fetchBuffer)).toEqual({ ok: false, reason, retryable });
  });

  it("treats unknown errors as retryable fetch failures", async () => {
    const fetchBuffer = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof safeFetchBuffer;

    expect(await fetchImportImage("https://a.example/x", fetchBuffer)).toEqual({ ok: false, reason: "MEDIA_FETCH_FAILED", retryable: true });
  });
});
