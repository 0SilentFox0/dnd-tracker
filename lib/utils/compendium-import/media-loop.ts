import type { CompendiumReport, MediaProgress } from "@/types/compendium-import";

export const MEDIA_RETRY_DELAY_MS = 2000;

export const MEDIA_MAX_RETRIES = 3;

export type MediaLoopEnd = "done" | "paused" | "aborted";

export interface MediaLoopOptions {
  initial: MediaProgress;
  retryFailed?: boolean;
  signal: AbortSignal;
  onProgress: (progress: MediaProgress) => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  isRetryable?: (error: unknown) => boolean;
}

export const abortableSleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve();

  const timer = setTimeout(done, ms);

  function done() { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); }

  signal.addEventListener("abort", done);
});

export async function runMediaLoop(step: (retryFailed: boolean) => Promise<MediaProgress>, options: MediaLoopOptions): Promise<MediaLoopEnd> {
  const { signal, onProgress, sleep = abortableSleep, isRetryable = () => true } = options;

  let progress = options.initial, retry = !!options.retryFailed && progress.retryable > 0, failures = 0;

  while ((progress.pending > 0 || retry) && !signal.aborted) {
    try {
      const next = await step(retry);

      if (signal.aborted) return "aborted";

      progress = next; retry = false; failures = 0;
      onProgress(next);
    } catch (error) {
      if (signal.aborted) return "aborted";

      failures += 1;

      if (failures > MEDIA_MAX_RETRIES || !isRetryable(error)) return "paused";

      await sleep(MEDIA_RETRY_DELAY_MS, signal);
    }
  }

  return signal.aborted ? "aborted" : "done";
}

export function reportMediaProgress(report: CompendiumReport): MediaProgress | null {
  const media = report.media as Partial<MediaProgress> | undefined;

  return media && typeof media.pending === "number" && typeof media.runId === "string" ? (media as MediaProgress) : null;
}
