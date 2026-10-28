"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hashKey, useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { ApiError } from "@/lib/api/client";
import { getScenarioPage, saveScenarioContent } from "@/lib/api/scenario";
import { SCENARIO_AUTOSAVE_MS } from "@/lib/constants/scenario";
import { registerAssistantBeforeApply } from "@/lib/hooks/ai/useAssistantEffects";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { ScenarioContent, ScenarioPage } from "@/types/scenario";

export type DraftState = "saved" | "dirty" | "saving" | "error" | "conflict";

export type DraftError = { message: string; retryable: boolean };

type DraftRef = { content: ScenarioContent; version: number; dirty: boolean; conflict: boolean; inFlight: Promise<void> | null; timer: ReturnType<typeof setTimeout> | null };

export function useScenarioDraft(campaignId: string, page: ScenarioPage) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const [content, setLocal] = useState(page.content);

  const [state, setState] = useState<DraftState>("saved");

  const [error, setError] = useState<DraftError | null>(null);

  const ref = useRef<DraftRef>({ content: page.content, version: page.version, dirty: false, conflict: false, inFlight: null, timer: null });

  const save = useCallback(async () => {
    const r = ref.current;

    r.dirty = false;
    setError(null);
    setState("saving");

    const sent = r.content;

    try {
      const { version } = await saveScenarioContent(campaignId, page.id, { expectedVersion: r.version, content: sent });

      const current = queryClient.getQueryData<ScenarioPage>(scenarioKeys.page(campaignId, page.id));

      if (current && current.version > version) {
        r.conflict = true; r.dirty = true; setState("conflict");

        return;
      }

      r.version = version;
      queryClient.setQueryData<ScenarioPage>(scenarioKeys.page(campaignId, page.id), (old) => old && { ...old, content: sent, version });
      setState(r.dirty ? "dirty" : "saved");
    } catch (e) {
      r.dirty = true;

      if (e instanceof ApiError && e.status === 409) {
        // stop saving until reload: every further PUT would 409 and pop another dialog
        r.conflict = true;
        setState("conflict");
        notify("Сторінку змінено в іншій вкладці. Ваші правки лишились тут — перезавантажте сторінку, щоб побачити нову версію.");
      } else {
        const rejected = e instanceof ApiError && (e.status === 400 || e.status === 413);

        setError(rejected ? { message: e.message, retryable: false } : { message: "Не збережено", retryable: true });
        setState("error");
      }
    }
  }, [campaignId, page.id, queryClient, notify]);

  const flush = useCallback(async (): Promise<boolean> => {
    const r = ref.current;

    if (r.timer) clearTimeout(r.timer);

    r.timer = null;

    while (r.inFlight) await r.inFlight;

    if (r.dirty && !r.conflict) {
      r.inFlight = save().finally(() => {
        r.inFlight = null;
      });
      await r.inFlight;
    }

    return !r.dirty && !r.conflict;
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
    const current = ref.current;

    if (current.timer) clearTimeout(current.timer);

    current.timer = null;
    while (current.inFlight) await current.inFlight;

    let fresh: ScenarioPage;

    try { fresh = await getScenarioPage(campaignId, page.id); }
    catch { setError({ message: "Не вдалося завантажити свіжу версію. Локальні правки лишаються у редакторі.", retryable: false });

 return; }

    queryClient.setQueryData(scenarioKeys.page(campaignId, page.id), fresh);
    ref.current = { ...ref.current, content: fresh.content, version: fresh.version, dirty: false, conflict: false };
    setLocal(fresh.content);
    setError(null);
    setState("saved");
  }, [campaignId, page.id, queryClient]);

  const hasUnsavedChanges = useCallback(() => ref.current.dirty || !!ref.current.inFlight || ref.current.conflict, []);

  const retainLocal = useCallback(() => { setError({ message: "Локальна чернетка лишається у відкритому редакторі. Автозбереження зупинено до явного перезавантаження.", retryable: false }); }, []);

  useEffect(() => registerAssistantBeforeApply({ campaignId, domain: "scenario", id: page.id }, flush), [campaignId, page.id, flush]);
  useEffect(() => {
    const sync = () => {
      const fresh = queryClient.getQueryData<ScenarioPage>(scenarioKeys.page(campaignId, page.id));

      const r = ref.current;

      if (!fresh || fresh.version <= r.version) return;

      if (r.dirty || r.inFlight || r.conflict) {
        r.conflict = true;

        if (r.timer) clearTimeout(r.timer);

        r.timer = null;
        setState("conflict");
      } else {
        r.version = fresh.version; r.content = fresh.content;
        setLocal(fresh.content); setState("saved");
      }
    };

    sync();

    const pageHash = hashKey(scenarioKeys.page(campaignId, page.id));

    return queryClient.getQueryCache().subscribe(event => {
      if (event.query.queryHash === pageHash) sync();
    });
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

  return { content, setContent, state, error, flush, reload, retainLocal, hasUnsavedChanges };
}
