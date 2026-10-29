import { describe, expect, it } from "vitest";

import { buildMediaQueue, mediaProgress, summarizeQueue } from "../media/queue";
import type { MediaRef } from "../media/types";

const write = (localId: string, media: MediaRef[], kind = "units" as const) => ({ kind, localId, media });

const ref = (url: string, role: MediaRef["role"] = "avatar", extra: Partial<MediaRef> = {}): MediaRef => ({ url, role, path: "p", ...extra });

describe("buildMediaQueue", () => {
  it("dedupes by url into one item with several targets", () => {
    const state = buildMediaQueue([write("a", [ref("https://x.test/1.png")]), write("b", [ref("https://x.test/1.png")])]);

    expect(state.items).toHaveLength(1);
    expect(state.items[0].targets).toEqual([
      { kind: "units", localId: "a", field: "avatar" },
      { kind: "units", localId: "b", field: "avatar" },
    ]);
  });

  it("keeps write order and carries mediaId for inline targets", () => {
    const state = buildMediaQueue([write("a", [ref("https://x.test/2.png", "inline", { mediaId: "m".repeat(24) })]), write("b", [ref("https://x.test/1.png", "icon")])]);

    expect(state.items.map((i) => i.url)).toEqual(["https://x.test/2.png", "https://x.test/1.png"]);
    expect(state.items[0].targets[0]).toEqual({ kind: "units", localId: "a", mediaId: "m".repeat(24) });
    expect(state.items[1].targets[0].field).toBe("icon");
  });

  it("caps unique urls at the limit and counts every overflow occurrence", () => {
    const writes = Array.from({ length: 1001 }, (_, i) => write(`w${i}`, [ref(`https://x.test/${i}.png`)]));

    const state = buildMediaQueue(writes);

    expect(state.items).toHaveLength(1000);
    expect(state.skipped).toEqual({ MEDIA_LIMIT: 1 });
    expect(buildMediaQueue([...writes, write("dup", [ref("https://x.test/1000.png")]), write("ok", [ref("https://x.test/5.png")])]).skipped).toEqual({ MEDIA_LIMIT: 2 });
  });

  it("counts ref skip reasons without queueing and summarizes", () => {
    const state = buildMediaQueue([write("a", [ref("", "avatar", { skip: "MEDIA_INVALID_URL" }), ref("https://x.test/e.png", "icon", { skip: "MEDIA_EXTRA" }), ref("https://x.test/ok.png")])]);

    expect(summarizeQueue(state)).toEqual({ queued: 1, skipped: { MEDIA_INVALID_URL: 1, MEDIA_EXTRA: 1 } });
  });
});

describe("mediaProgress", () => {
  it("counts items by status and exposes host/file for failures only", () => {
    const state = buildMediaQueue([write("a", [ref("https://x.test/p/1.png")]), write("b", [ref("https://y.test/2.png")]), write("c", [ref("https://z.test/3.png")]), write("d", [ref("http://bad", "avatar", { skip: "MEDIA_HTTPS_ONLY" })])]);

    state.items[0].status = "saved";
    Object.assign(state.items[1], { status: "failed", reason: "MEDIA_HTTP_STATUS", params: { status: 503 }, retryable: true });

    const progress = mediaProgress("run", state);

    expect(progress).toMatchObject({ runId: "run", total: 3, saved: 1, failed: 1, pending: 1, skipped: 1, retryable: 1 });
    expect(progress.failures).toEqual([{ id: state.items[1].id, host: "y.test", file: "2.png", reason: "MEDIA_HTTP_STATUS", params: { status: 503 } }]);
    expect(JSON.stringify(progress)).not.toContain("https://");
  });

  it("caps shown failures at 100", () => {
    const state = buildMediaQueue(Array.from({ length: 150 }, (_, i) => write(`w${i}`, [ref(`https://x.test/${i}.png`)])));

    for (const item of state.items) Object.assign(item, { status: "failed", reason: "MEDIA_FETCH_FAILED" });
    expect(mediaProgress("r", state)).toMatchObject({ failed: 150, failures: expect.any(Array) });
    expect(mediaProgress("r", state).failures).toHaveLength(100);
  });
});
