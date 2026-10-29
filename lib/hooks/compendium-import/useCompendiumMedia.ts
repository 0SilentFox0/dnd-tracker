"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { compendiumKeys } from "./keys";

import { ApiError } from "@/lib/api/client";
import { processCompendiumMedia } from "@/lib/api/compendium";
import { runMediaLoop } from "@/lib/utils/compendium-import/media-loop";
import type { MediaProgress } from "@/types/compendium-import";

const isRetryable = (error: unknown) => !(error instanceof ApiError) || error.status === 409 || error.status === 429 || error.status >= 500;

export function useCompendiumMedia(campaignId: string) {
  const queryClient = useQueryClient();

  const [progress, setProgress] = useState<MediaProgress | null>(null), [running, setRunning] = useState(false), [paused, setPaused] = useState(false);

  const abort = useRef<AbortController | null>(null), current = useRef<MediaProgress | null>(null);

  const stop = useCallback(() => { abort.current?.abort(); abort.current = null; setRunning(false); }, []);

  useEffect(() => stop, [stop]);

  const update = useCallback((next: MediaProgress) => { current.current = next; setProgress(next); }, []);

  const run = useCallback(async (initial: MediaProgress, retryFailed: boolean) => {
    abort.current?.abort();

    const controller = new AbortController();

    abort.current = controller;
    update(initial); setPaused(false); setRunning(true);

    const end = await runMediaLoop(
      (retry) => processCompendiumMedia(campaignId, { runId: initial.runId, retryFailed: retry }, controller.signal),
      { initial, retryFailed, signal: controller.signal, onProgress: update, isRetryable },
    );

    if (end === "aborted") return;

    abort.current = null;
    setRunning(false); setPaused(end === "paused");
    void queryClient.invalidateQueries({ queryKey: compendiumKeys.all(campaignId) });
  }, [campaignId, queryClient, update]);

  const start = useCallback((initial: MediaProgress) => { void run(initial, false); }, [run]);

  const load = useCallback((initial: MediaProgress) => { stop(); update(initial); setPaused(initial.pending > 0); }, [stop, update]);

  const resume = useCallback(() => { if (current.current) void run(current.current, false); }, [run]);

  const retryFailed = useCallback(() => { if (current.current) void run(current.current, true); }, [run]);

  return { progress, running, paused, start, load, resume, retryFailed, stop };
}

export type CompendiumMediaController = ReturnType<typeof useCompendiumMedia>;
