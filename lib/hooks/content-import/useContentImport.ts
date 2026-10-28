"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { contentImportKeys, importInvalidateKeys } from "./keys";

import { contentExampleUrl, getImportAiAvailability, importContentRows, suggestImportMapping } from "@/lib/api/content-import";
import { downloadText } from "@/lib/utils/common/download-text";
import { errorMessage } from "@/lib/utils/common/error-message";
import { applyMapping, autoMap, chunkRows, IMPORT_LIMITS, IMPORT_SPECS, ImportFileError, missingRequired, parseTable } from "@/lib/utils/content/import";
import { aiSample, loadStoredMapping, mergeReports, readImportFile, reportToCsv, saveStoredMapping } from "@/lib/utils/content/import/wizard";
import type { ImportKind, ImportMapping, ImportMode, ImportRecord, ImportReport, ParsedTable } from "@/types/content-import";

export type ImportStep = "file" | "columns" | "preview" | "result";

type Part = { offset: number; report: ImportReport };

export function useContentImport(campaignId: string, kind: ImportKind) {
  const spec = IMPORT_SPECS[kind];

  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>("file");

  const [file, setFile] = useState<{ name: string | null; table: ParsedTable | null }>({ name: null, table: null });

  const [mapping, setMapping] = useState<ImportMapping>({});

  const [mode, setMode] = useState<ImportMode>("create");

  const [preview, setPreview] = useState<ImportReport | null>(null);

  const [result, setResult] = useState<ImportReport | null>(null);

  const [busy, setBusy] = useState(false);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [aiBusy, setAiBusy] = useState(false);

  const [aiNotes, setAiNotes] = useState<string[]>([]);

  const ai = useQuery({ queryKey: contentImportKeys.aiAvailability(campaignId, kind), queryFn: () => getImportAiAvailability(campaignId, kind), staleTime: 5 * 60_000, enabled: step === "columns" });

  const records = (table: ParsedTable): ImportRecord[] => table.rows.map((row) => applyMapping(row, mapping, spec.fields).value);

  async function postChunks(chunks: ImportRecord[][], body: { mode: ImportMode; dryRun: boolean }, parts: Part[], onPart?: (done: number) => void) {
    let offset = 0;

    for (const rows of chunks) {
      parts.push({ offset, report: await importContentRows(campaignId, kind, { rows, ...body }) });
      offset += rows.length;
      onPart?.(parts.length);
    }
  }

  async function selectFile(next: File) {
    setError(null);

    try {
      const table = parseTable(await readImportFile(next), next.name);

      setFile({ name: next.name, table });
      setMapping({ ...autoMap(table.headers, spec.fields), ...loadStoredMapping(kind, table.headers, spec.fields) });
      setPreview(null);
      setResult(null);
      setAiNotes([]);
      setStep("columns");
    } catch (e) {
      setError(e instanceof ImportFileError ? e.message : errorMessage(e, "Не вдалося прочитати файл"));
    }
  }

  async function dryRun(nextMode: ImportMode) {
    const { table } = file;

    if (!table) return;

    setBusy(true);
    setError(null);

    try {
      saveStoredMapping(kind, table.headers, mapping);

      const parts: Part[] = [];

      await postChunks(chunkRows(records(table), IMPORT_LIMITS.rowsPerRequest, IMPORT_LIMITS.chunkBytes), { mode: nextMode, dryRun: true }, parts);

      setPreview(mergeReports(parts, true));
      setStep("preview");
    } catch (e) {
      setError(errorMessage(e, "Перевірка не вдалася"));
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    const { table } = file;

    if (!table) return;

    const chunks = chunkRows(records(table), IMPORT_LIMITS.writeChunkRows, IMPORT_LIMITS.chunkBytes);

    const parts: Part[] = [];

    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: chunks.length });

    try {
      await postChunks(chunks, { mode, dryRun: false }, parts, (done) => setProgress({ done, total: chunks.length }));
    } catch (e) {
      setError(`${errorMessage(e, "Імпорт перервано")}. Записано частин: ${parts.length} з ${chunks.length}`);
    }

    const merged = mergeReports(parts, false);

    setResult(merged);
    setStep("result");
    setBusy(false);
    setProgress(null);

    if (merged.counts.created + merged.counts.updated > 0) await Promise.all(importInvalidateKeys(campaignId, kind).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }

  async function suggestAi() {
    const { table } = file;

    if (!table) return;

    setAiBusy(true);
    setError(null);

    try {
      const res = await suggestImportMapping(campaignId, kind, { headers: table.headers.slice(0, IMPORT_LIMITS.aiHeaders), sample: aiSample(table) });

      setMapping((current) => ({ ...current, ...Object.fromEntries(Object.entries(res.mapping).filter(([header, key]) => key !== null && Object.hasOwn(current, header))) }));
      setAiNotes(res.notes);
    } catch (e) {
      setError(errorMessage(e, "AI не зміг підказати мапінг"));
    } finally {
      setAiBusy(false);
    }
  }

  function reset() {
    setStep("file");
    setFile({ name: null, table: null });
    setMapping({});
    setMode("create");
    setPreview(null);
    setResult(null);
    setBusy(false);
    setProgress(null);
    setError(null);
    setAiNotes([]);
  }

  function downloadErrors() {
    const report = result ?? preview;

    if (file.table && report) downloadText(`${kind}-errors.csv`, reportToCsv(file.table, report), "text/csv");
  }

  return {
    spec,
    step,
    file,
    mapping: {
      value: mapping,
      set: (header: string, key: string | null) => {
        setMapping((current) => ({ ...current, [header]: key }));
        setPreview(null);
      },
      missing: missingRequired(spec.fields, mapping),
    },
    ai: { available: ai.data?.available ?? false, busy: aiBusy, notes: aiNotes, suggest: suggestAi },
    mode: {
      value: mode,
      set: (next: ImportMode) => {
        setMode(next);
        void dryRun(next);
      },
    },
    preview,
    result,
    status: { busy, progress, error },
    actions: {
      selectFile,
      runPreview: () => dryRun(mode),
      runImport,
      back: () => {
        setError(null);
        setStep((s) => (s === "preview" ? "columns" : "file"));
      },
      reset,
      downloadErrors,
    },
    urls: { example: contentExampleUrl(campaignId, kind) },
  };
}

export type ContentImportState = ReturnType<typeof useContentImport>;
