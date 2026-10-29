"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { compendiumKeys } from "./keys";
import { useCompendiumMedia } from "./useCompendiumMedia";

import { confirmCompendium, getCompendiumOptions, getCompendiumRunReport, previewCompendium } from "@/lib/api/compendium";
import type { JsonRecord } from "@/lib/constants/compendium-import";
import { useTranslator } from "@/lib/i18n/use-translator";
import { readCompendiumFile } from "@/lib/utils/compendium-import/file";
import { categoryInventory, compendiumErrorMessage, excludeAllBlocked, projectInput } from "@/lib/utils/compendium-import/flow";
import { reportMediaProgress } from "@/lib/utils/compendium-import/media-loop";
import type { CompendiumOptions, CompendiumPreview, CompendiumReport, CompendiumRun, CompendiumTargets, ImportInput } from "@/types/compendium-import";

const NO_TARGETS: CompendiumTargets = { local: [], templates: [] };

export type CompendiumPhase = "idle" | "reading" | "previewing" | "confirming" | "media" | "opening";

export function useCompendiumImport(campaignId: string, initialFile?: File) {
  const queryClient = useQueryClient();

  const t = useTranslator("compendium");

  const [root, setRoot] = useState<JsonRecord | null>(null), [categories, setCategories] = useState<string[]>([]), [excludedChapters, setExcludedChapters] = useState<string[]>([]);

  const [options, setOptions] = useState<CompendiumOptions>({});

  const [preview, setPreview] = useState<CompendiumPreview | null>(null), [input, setInput] = useState<ImportInput | null>(null), [result, setResult] = useState<CompendiumReport | null>(null);

  const [rights, setRights] = useState(false), [reading, setReading] = useState(false), [failure, setFailure] = useState<{ error?: unknown; key: string } | null>(null);

  const key = useRef(""), controller = useRef<AbortController | null>(null);

  const previewMutation = useMutation({ mutationFn: ({ next, signal }: { next: ImportInput; signal: AbortSignal }) => previewCompendium(campaignId, next, signal) });

  const confirmMutation = useMutation({ mutationFn: ({ body, signal }: { body: Parameters<typeof confirmCompendium>[1]; signal: AbortSignal }) => confirmCompendium(campaignId, body, signal) });

  const openRunMutation = useMutation({ mutationFn: (runId: string) => getCompendiumRunReport(campaignId, runId) });

  const media = useCompendiumMedia(campaignId);

  const targetsQuery = useQuery({ queryKey: compendiumKeys.options(campaignId), queryFn: ({ signal }) => getCompendiumOptions(campaignId, signal), enabled: !!preview, staleTime: 0 });

  const busy = reading || previewMutation.isPending || confirmMutation.isPending || openRunMutation.isPending;

  useEffect(() => () => controller.current?.abort(), []);

  const invalidate = useCallback(() => { setPreview(null); setInput(null); setResult(null); setRights(false); key.current = ""; }, []);

  const startRequest = () => {
    controller.current?.abort();

    const abort = new AbortController();

    controller.current = abort;

    return abort;
  };

  const changeOptions = (value: CompendiumOptions) => { setOptions(value); invalidate(); };

  const selectFile = useCallback(async (file: File) => {
    const abort = startRequest();

    setReading(true); setFailure(null); setRoot(null); invalidate(); setOptions({}); setExcludedChapters([]);
    try {
      const parsed = await readCompendiumFile(file, abort.signal);

      if (abort.signal.aborted) return;

      setRoot(parsed); setCategories(categoryInventory(parsed).filter(row => row.selected).map(row => row.kind));
    } catch (e) { if (!abort.signal.aborted) setFailure({ error: e, key: "errors.readFailed" }); }
    finally { if (!abort.signal.aborted) setReading(false); }
  }, [invalidate]);

  useEffect(() => { if (initialFile) void selectFile(initialFile); }, [initialFile, selectFile]);

  async function runPreview(nextOptions = options) {
    if (!root) return;

    setFailure(null); invalidate();

    const abort = startRequest();

    try {
      const next = projectInput(root, categories, nextOptions, excludedChapters);

      const data = await previewMutation.mutateAsync({ next, signal: abort.signal });

      if (abort.signal.aborted) return;

      setPreview(data); setInput(next); key.current = crypto.randomUUID();
    } catch (e) { if (!abort.signal.aborted) setFailure({ error: e, key: "errors.previewFailed" }); }
  }

  async function confirm() {
    if (!preview || !input || !rights || busy) return;

    setFailure(null);

    const abort = startRequest();

    try {
      const report = await confirmMutation.mutateAsync({ body: { input, token: preview.token, idempotencyKey: key.current, rightsConfirmed: rights }, signal: abort.signal });

      if (abort.signal.aborted) return;

      setResult(report); setPreview(null); setInput(null); setRoot(null); setOptions({});

      const queued = reportMediaProgress(report);

      if (queued && queued.pending > 0) media.start(queued);

      void queryClient.invalidateQueries({ queryKey: compendiumKeys.all(campaignId) });
    } catch (e) { if (!abort.signal.aborted) setFailure({ error: e, key: "errors.confirmFailed" }); }
  }

  function applyExclusion(next: CompendiumOptions) {
    setOptions(next);
    void runPreview(next);
  }

  const excludeBlockedRows = () => { if (preview) applyExclusion(excludeAllBlocked(options, preview.graph, preview.report.nextActions)); };

  const excludeRow = (rowKey: string) => applyExclusion({ ...options, excludedKeys: [...(options.excludedKeys ?? []), rowKey] });

  const toggleCategory = (kind: string, on: boolean) => { setCategories(on ? [...categories, kind] : categories.filter(item => item !== kind)); invalidate(); };

  const selectCategories = (kinds: string[]) => { setCategories(kinds); invalidate(); };

  const setChapterExclusions = (paths: string[]) => { setExcludedChapters(paths); invalidate(); };

  const toggleChapter = (path: string, on: boolean) => { setExcludedChapters(on ? excludedChapters.filter(item => item !== path) : [...excludedChapters, path]); invalidate(); };

  const showReport = (report: CompendiumReport) => {
    setResult(report);

    const loaded = reportMediaProgress(report);

    if (loaded) media.load(loaded);
  };

  const openRun = async (run: CompendiumRun) => {
    invalidate(); setRoot(null); media.stop();

    if (run.report) return showReport(run.report);

    setFailure(null);
    try {
      const data = await openRunMutation.mutateAsync(run.id);

      if (data.runs[0]) showReport(data.runs[0].report); else setFailure({ key: "errors.reportUnavailable" });
    } catch { setFailure({ key: "errors.reportLoadFailed" }); }
  };

  const close = () => { controller.current?.abort(); media.stop(); setReading(false); setRoot(null); setCategories([]); setOptions({}); invalidate(); };

  const phase: CompendiumPhase = reading ? "reading" : previewMutation.isPending ? "previewing" : confirmMutation.isPending ? "confirming" : media.running ? "media" : openRunMutation.isPending ? "opening" : "idle";

  const targets = targetsQuery.data ?? NO_TARGETS;

  const shownError = failure ? compendiumErrorMessage(t, failure.error, failure.key) : targetsQuery.isError && preview ? t("errors.optionsLoadFailed") : "";

  return {
    state: { root, categories, excludedChapters, options, preview, input, result, rights, targets, busy, phase, media: media.progress, mediaPaused: media.paused, error: shownError },
    actions: { selectFile, changeOptions, applyOptions: applyExclusion, setOptions, toggleCategory, selectCategories, toggleChapter, setChapterExclusions, setRights, runPreview, confirm, excludeBlockedRows, excludeRow, openRun, close, media: { resume: media.resume, retryFailed: media.retryFailed, stop: media.stop } },
  };
}

export type CompendiumImportController = ReturnType<typeof useCompendiumImport>;
