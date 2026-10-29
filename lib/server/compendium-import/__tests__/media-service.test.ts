import { describe, expect, it, vi } from "vitest";

import type { FetchedImage } from "../media/fetch-image";
import { type MediaRepository, type MediaResult, processMediaBatch } from "../media/service";
import { MEDIA_LIMITS, type MediaItem, type MediaQueueState } from "../media/types";

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const item = (n: number, extra: Partial<MediaItem> = {}): MediaItem => ({ id: String(n).padStart(24, "0"), url: `https://img.test/${n}.png`, targets: [{ kind: "spells", localId: `s${n}`, field: "icon" }], status: "pending", attempts: 0, ...extra });

const image: FetchedImage = { ok: true, bytes: Buffer.from("x"), mime: "image/png", sha256: "ab".repeat(32) };

function memory(items: MediaItem[], known = new Map<string, string>()) {
  const state: MediaQueueState = { version: 1, items, skipped: {} };

  const repository: MediaRepository = {
    claim: vi.fn(async (_a, runId, opts) => runId === "run" ? { items: state.items.filter((i) => i.status === "pending").slice(0, opts.max), known } : null),
    release: vi.fn(async () => undefined),
    apply: vi.fn(async (_a, _r, results: MediaResult[]) => {
      for (const r of results) Object.assign(state.items.find((i) => i.id === r.id)!, r.ok ? { status: "saved", storedUrl: r.storedUrl } : { status: "failed", reason: r.reason, retryable: r.retryable });

      return state;
    }),
  };

  return { repository, state };
}

const store = () => vi.fn(async (..._args: unknown[]) => ({ ok: true as const, value: "https://x.supabase.co/stored.webp" }));

describe("processMediaBatch", () => {
  it("fetches, stores and applies results, returning progress", async () => {
    const { repository } = memory([item(1), item(2)]);

    const fetchImage = vi.fn(async () => image);

    const progress = await processMediaBatch(actor, "run", { repository, fetchImage, store: store() });

    expect(fetchImage).toHaveBeenCalledTimes(2);
    expect(progress).toMatchObject({ runId: "run", total: 2, saved: 2, pending: 0 });
  });

  it("uses known urls without fetching or storing", async () => {
    const { repository } = memory([item(1)], new Map([["https://img.test/1.png", "https://x.supabase.co/known.webp"]]));

    const fetchImage = vi.fn(async () => image);

    const put = store();

    await processMediaBatch(actor, "run", { repository, fetchImage, store: put });

    expect(fetchImage).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(repository.apply).toHaveBeenCalledWith(actor, "run", [{ id: item(1).id, ok: true, storedUrl: "https://x.supabase.co/known.webp" }]);
  });

  it("maps fetch and store failures and thrown errors to reasons", async () => {
    const { repository } = memory([item(1), item(2), item(3)]);

    const fetchImage = vi.fn(async (url: string) => url.endsWith("1.png") ? { ok: false as const, reason: "MEDIA_HTTP_STATUS" as const, params: { status: 503 }, retryable: true } : url.endsWith("2.png") ? image : Promise.reject(new Error("boom")));

    const put = vi.fn(async (..._args: unknown[]) => ({ ok: false as const, message: "MEDIA_BAD_FORMAT" as const }));

    const progress = await processMediaBatch(actor, "run", { repository, fetchImage: fetchImage as never, store: put });

    const results = vi.mocked(repository.apply).mock.calls[0][2];

    expect(results).toEqual([
      { id: item(1).id, ok: false, reason: "MEDIA_HTTP_STATUS", params: { status: 503 }, retryable: true },
      { id: item(2).id, ok: false, reason: "MEDIA_BAD_FORMAT", retryable: false },
      { id: item(3).id, ok: false, reason: "MEDIA_FETCH_FAILED", retryable: true },
    ]);
    expect(progress).toMatchObject({ failed: 3, retryable: 2 });
  });

  it("stores inline targets in the inline variant and field targets in their own", async () => {
    const { repository } = memory([item(1, { targets: [{ kind: "scenarioPages", localId: "p", mediaId: "a".repeat(24) }] }), item(2)]);

    const put = store();

    await processMediaBatch(actor, "run", { repository, fetchImage: async () => image, store: put });

    expect(put.mock.calls.map((c) => c[1]).sort()).toEqual(["icon", "inline"]);
  });

  it("stops starting new items at the deadline and releases them", async () => {
    const { repository } = memory([item(1), item(2), item(3), item(4), item(5), item(6), item(7), item(8)]);

    let clock = 0;

    let started = 0;

    const gate = Promise.withResolvers<void>();

    const fetchImage = vi.fn(async () => {
      if (++started === MEDIA_LIMITS.concurrency) { clock += MEDIA_LIMITS.deadlineMs; gate.resolve(); }

      await gate.promise;

      return image;
    });

    await processMediaBatch(actor, "run", { repository, fetchImage, store: store(), now: () => clock });

    expect(fetchImage).toHaveBeenCalledTimes(MEDIA_LIMITS.concurrency);
    expect(repository.release).toHaveBeenCalledWith(actor, "run", [item(7).id, item(8).id]);
  });

  it("does not run the network when nothing is claimed and still reports state", async () => {
    const { repository } = memory([item(1, { status: "saved" })]);

    const fetchImage = vi.fn(async () => image);

    const progress = await processMediaBatch(actor, "run", { repository, fetchImage, store: store() });

    expect(fetchImage).not.toHaveBeenCalled();
    expect(progress).toMatchObject({ total: 1, saved: 1, pending: 0 });
  });

  it("rejects non-DM actors and unknown runs", async () => {
    const { repository } = memory([]);

    const deps = { repository, fetchImage: vi.fn(), store: store() };

    await expect(processMediaBatch({ ...actor, isDM: false }, "run", deps)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(processMediaBatch(actor, "other", deps)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.claim).toHaveBeenCalledTimes(1);
  });
});
