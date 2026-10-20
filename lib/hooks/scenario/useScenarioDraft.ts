"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { ApiError } from "@/lib/api/client";
import { getScenarioPage, saveScenarioContent } from "@/lib/api/scenario";
import { SCENARIO_AUTOSAVE_MS } from "@/lib/constants/scenario";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { ScenarioContent, ScenarioPage } from "@/types/scenario";

export type DraftState = "saved" | "dirty" | "saving" | "error" | "conflict";

type DraftRef = { content: ScenarioContent; version: number; dirty: boolean; conflict: boolean; inFlight: Promise<void> | null; timer: ReturnType<typeof setTimeout> | null };

export function useScenarioDraft(campaignId: string, page: ScenarioPage) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const [content, setLocal] = useState(page.content);

  const [state, setState] = useState<DraftState>("saved");

  const ref = useRef<DraftRef>({ content: page.content, version: page.version, dirty: false, conflict: false, inFlight: null, timer: null });

  const save = useCallback(async () => {
    const r = ref.current;

    r.dirty = false;
    setState("saving");

    const sent = r.content;

    try {
      const { version } = await saveScenarioContent(campaignId, page.id, { expectedVersion: r.version, content: sent });

      r.version = version;
      queryClient.setQueryData<ScenarioPage>(scenarioKeys.page(campaignId, page.id), (old) => old && { ...old, content: sent, version });
      setState(r.dirty ? "dirty" : "saved");
    } catch (error) {
      r.dirty = true;

      if (error instanceof ApiError && error.status === 409) {
        // stop saving until reload: every further PUT would 409 and pop another dialog
        r.conflict = true;
        setState("conflict");
        notify("Сторінку змінено в іншій вкладці. Ваші правки лишились тут — перезавантажте сторінку, щоб побачити нову версію.");
      } else {
        setState("error");
      }
    }
  }, [campaignId, page.id, queryClient, notify]);

  // resolves only when everything typed so far is saved (or failed) — callers await it before leaving edit mode
  const flush = useCallback(async (): Promise<void> => {
    const r = ref.current;

    if (r.timer) clearTimeout(r.timer);

    r.timer = null;

    while (r.inFlight) await r.inFlight;

    if (!r.dirty || r.conflict) return;

    r.inFlight = save().finally(() => {
      r.inFlight = null;
    });
    await r.inFlight;
  }, [save]);

  const setContent = useCallback(
    (fn: (c: ScenarioContent) => ScenarioContent) => {
      const r = ref.current;

      r.content = fn(r.content);
      r.dirty = true;
      setLocal(r.content);

      if (r.conflict) return;

      setState("dirty");

      if (r.timer) clearTimeout(r.timer);

      r.timer = setTimeout(() => void flush(), SCENARIO_AUTOSAVE_MS);
    },
    [flush],
  );

  const reload = useCallback(async () => {
    const fresh = await getScenarioPage(campaignId, page.id);

    queryClient.setQueryData(scenarioKeys.page(campaignId, page.id), fresh);
    ref.current = { ...ref.current, content: fresh.content, version: fresh.version, dirty: false, conflict: false };
    setLocal(fresh.content);
    setState("saved");
  }, [campaignId, page.id, queryClient]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (ref.current.dirty || ref.current.inFlight) e.preventDefault();
    };

    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
      void flush();
    };
  }, [flush]);

  return { content, setContent, state, flush, reload };
}
