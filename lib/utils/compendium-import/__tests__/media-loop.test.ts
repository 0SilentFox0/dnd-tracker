import { describe, expect, it, vi } from "vitest";

import { MEDIA_MAX_RETRIES, reportMediaProgress, runMediaLoop } from "../media-loop";

import type { CompendiumReport, MediaProgress } from "@/types/compendium-import";

const progress = (saved: number, total = 5, extra: Partial<MediaProgress> = {}): MediaProgress => ({ runId: "r", total, saved, failed: 0, skipped: 0, pending: total - saved, retryable: 0, failures: [], ...extra });

const sleep = vi.fn(async () => {});

describe("runMediaLoop", () => {
  it("finishes after N steps with monotonic progress", async () => {
    let saved = 0;

    const seen: number[] = [];

    const step = vi.fn(async () => progress((saved += 2)));

    const end = await runMediaLoop(step, { initial: progress(0), signal: new AbortController().signal, onProgress: (p) => seen.push(p.saved), sleep });

    expect(end).toBe("done");
    expect(step).toHaveBeenCalledTimes(3);
    expect(seen).toEqual([2, 4, 6]);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });

  it("pauses after more than 3 consecutive failures and sleeps between", async () => {
    sleep.mockClear();

    const step = vi.fn(async () => { throw new Error("net"); });

    const end = await runMediaLoop(step, { initial: progress(0), signal: new AbortController().signal, onProgress: vi.fn(), sleep });

    expect(end).toBe("paused");
    expect(step).toHaveBeenCalledTimes(MEDIA_MAX_RETRIES + 1);
    expect(sleep).toHaveBeenCalledTimes(MEDIA_MAX_RETRIES);
    expect(sleep).toHaveBeenCalledWith(2000, expect.anything());
  });

  it("resets the failure counter after a success", async () => {
    let calls = 0;

    const step = vi.fn(async () => {
      calls += 1;

      if (calls % 3 !== 0) throw new Error("net");

      return progress(calls / 3);
    });

    const end = await runMediaLoop(step, { initial: progress(0, 3), signal: new AbortController().signal, onProgress: vi.fn(), sleep });

    expect(end).toBe("done");
  });

  it("pauses at once on a non-retryable error", async () => {
    const step = vi.fn(async () => { throw new Error("403"); });

    expect(await runMediaLoop(step, { initial: progress(0), signal: new AbortController().signal, onProgress: vi.fn(), sleep, isRetryable: () => false })).toBe("paused");
    expect(step).toHaveBeenCalledTimes(1);
  });

  it("stops on abort", async () => {
    const abort = new AbortController();

    const step = vi.fn(async () => { abort.abort();

 return progress(1); });

    const onProgress = vi.fn();

    expect(await runMediaLoop(step, { initial: progress(0), signal: abort.signal, onProgress, sleep })).toBe("aborted");
    expect(step).toHaveBeenCalledTimes(1);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("does nothing when nothing is pending, runs one retry pass for failed items", async () => {
    const step = vi.fn(async () => progress(5));

    const signal = new AbortController().signal;

    await runMediaLoop(step, { initial: progress(5), signal, onProgress: vi.fn(), sleep });
    expect(step).not.toHaveBeenCalled();

    await runMediaLoop(step, { initial: progress(4, 5, { pending: 0, failed: 1, retryable: 1 }), retryFailed: true, signal, onProgress: vi.fn(), sleep });
    expect(step).toHaveBeenCalledWith(true);
    expect(step).toHaveBeenCalledTimes(1);
  });
});

describe("reportMediaProgress", () => {
  it("accepts progress-shaped media only", () => {
    expect(reportMediaProgress({ media: progress(1) } as unknown as CompendiumReport)?.pending).toBe(4);
    expect(reportMediaProgress({ media: { queued: 2, skipped: {} } } as unknown as CompendiumReport)).toBeNull();
    expect(reportMediaProgress({} as CompendiumReport)).toBeNull();
  });
});
