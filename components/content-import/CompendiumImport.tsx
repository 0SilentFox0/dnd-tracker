"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { CompendiumReport } from "./CompendiumReport";

import { Button } from "@/components/ui/button";
import type { JsonRecord } from "@/lib/constants/compendium-import";
import type { CompendiumReport as Report, ImportInput } from "@/lib/server/compendium-import/service";
import type { TargetKind } from "@/lib/server/compendium-import/types";
import { readCompendiumFile } from "@/lib/utils/compendium-import/file";
import { CATEGORY_LABELS, categoryInventory, excludeBlocked, projectInput } from "@/lib/utils/compendium-import/flow";

type GraphRow = { key: string; name: string; kind: TargetKind; inputPath?: string; refs: Array<{ key: string; kind: string; name: string; source: string; edition: string }>; summary?: unknown };
type Preview = { token: string; report: Report; graph: GraphRow[]; rulesDiff?: unknown };
type Target = { kind: TargetKind; id: string; name: string };
type Options = { local: Target[]; templates: Array<{ id: string; name: string; edition: "one"; rows: Target[] }> };

const REF_KINDS: Record<string, TargetKind> = { spell: "spells", feat: "feats", class: "classes", race: "races", monster: "units", background: "backgrounds", item: "artifacts", spellSchool: "spell-groups" };

const ERROR_TEXT: Record<string, string> = { PREVIEW_SECRET_REQUIRED: "Серверний ключ COMPENDIUM_PREVIEW_SECRET не налаштований (щонайменше 32 символи). Імпорт недоступний.", PREVIEW_STALE: "Кампанія або термін preview змінилися. Повторіть перевірку.", PREVIEW_INVALID: "Підпис preview недійсний. Повторіть перевірку.", REQUEST_SIZE: "Вибраний набір завеликий. Виберіть менше категорій або розділів.", FORBIDDEN: "Доступ має лише ДМ кампанії через сесію.", IMPORT_FAILED: "Не вдалося виконати імпорт. Жоден частковий запис не підтверджено; спробуйте повторити з тим самим ключем." };

async function request<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: body ? "POST" : "GET", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal });

  const result = await response.json();

  if (!response.ok) throw new Error(ERROR_TEXT[result.code] ?? `${result.code ?? "HTTP_ERROR"}: перевірте вибір і повторіть preview`);

  return result as T;
}

export function CompendiumImport({ campaignId, initialFile }: { campaignId: string; initialFile?: File }) {
  const base = `/api/campaigns/${encodeURIComponent(campaignId)}/compendium`;

  const [root, setRoot] = useState<JsonRecord | null>(null), [categories, setCategories] = useState<string[]>([]);

  const [options, setOptions] = useState<Omit<ImportInput, "json" | "categories">>({});

  const [preview, setPreview] = useState<Preview | null>(null), [input, setInput] = useState<ImportInput | null>(null), [result, setResult] = useState<Report | null>(null);

  const [rights, setRights] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");

  const [runs, setRuns] = useState<Array<{ id: string; report?: Report }>>([]), [runOffset, setRunOffset] = useState(0), [moreRuns, setMoreRuns] = useState(false);

  const [targets, setTargets] = useState<Options>({ local: [], templates: [] });

  const [page, setPage] = useState(0);

  const [excludedChapters, setExcludedChapters] = useState<string[]>([]);

  const key = useRef<string>(""), controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();

    void request<{ runs: typeof runs; hasMore: boolean }>(`${base}/reports?offset=${runOffset}`, undefined, abort.signal).then(data => { setRuns(data.runs); setMoreRuns(data.hasMore); }).catch(() => { if (!abort.signal.aborted) setError("Не вдалося завантажити збережені звіти"); });

    return () => abort.abort();
  }, [base, runOffset]);
  useEffect(() => () => controller.current?.abort(), []);

  const invalidate = useCallback(() => { setPreview(null); setInput(null); setResult(null); setRights(false); key.current = ""; }, []);

  const changeOptions = (value: typeof options) => { setOptions(value); invalidate(); };

  const selectFile = useCallback(async (file: File) => {
    controller.current?.abort();

    const abort = new AbortController();

    controller.current = abort;
    setBusy(true); setError(""); setRoot(null); invalidate(); setOptions({}); setExcludedChapters([]);
    try {
      const parsed = await readCompendiumFile(file, abort.signal);

      if (abort.signal.aborted) return;

      setRoot(parsed); setCategories(categoryInventory(parsed).filter(row => row.selected).map(row => row.kind));
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Не вдалося прочитати JSON"); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }, [invalidate]);

  useEffect(() => { if (initialFile) void selectFile(initialFile); }, [initialFile, selectFile]);

  async function runPreview(nextOptions = options) {
    if (!root) return;

    setBusy(true); setError(""); setPreview(null); setInput(null); setRights(false); setResult(null);

    const abort = new AbortController();

    controller.current = abort;
    try {
      const nextInput = projectInput(root, categories, nextOptions, excludedChapters);

      const data = await request<Preview>(`${base}/preview`, { input: nextInput }, abort.signal);

      setPreview(data); setInput(nextInput); key.current = crypto.randomUUID(); setPage(0);
      void request<Options>(`${base}/options`, undefined, abort.signal).then(setTargets).catch(() => { if (!abort.signal.aborted) setError("Не вдалося завантажити варіанти залежностей; повторіть preview"); });
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Помилка preview"); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }

  async function confirm() {
    if (!preview || !input || !rights || busy) return;

    setBusy(true); setError("");

    const abort = new AbortController();

    controller.current = abort;
    try {
      const report = await request<Report>(`${base}/confirm`, { input, token: preview.token, idempotencyKey: key.current, rightsConfirmed: rights }, abort.signal);

      setResult(report); setPreview(null); setInput(null); setRoot(null); setOptions({}); setRuns(previous => [{ id: report.runId!, report }, ...previous]);
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Помилка confirm"); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }

  function excludeAllBlocked() {
    if (!preview) return;

    const blocked = new Set(preview.graph.filter(row => preview.report.nextActions.some(issue => issue.severity === "error" && issue.path.startsWith(row.key))).map(row => row.key));

    let changed = true;

    while (changed) { changed = false; for (const row of preview.graph) if (!blocked.has(row.key) && row.refs.some(ref => blocked.has(ref.key))) { blocked.add(row.key); changed = true; } }

    const next = { ...options, excludedKeys: [...new Set([...(options.excludedKeys ?? []), ...blocked])], excludedPaths: [...new Set([...(options.excludedPaths ?? []), ...excludeBlocked(preview.report.nextActions)])] };

    setOptions(next); void runPreview(next);
  }

  return <div className="mx-auto max-w-5xl space-y-5 p-4">
    <h1 className="text-xl">Імпорт JSON-компендіуму</h1>
    <p>Один файл → перевірка → підтвердження. До підтвердження кампанія не змінюється. JSON UTF-8 до 3 MiB; до 2000 обраних записів за один атомарний імпорт.</p>
    <p>CSV/TSV та простий JSON таблиці доступні кнопкою «Імпорт» у відповідній бібліотеці.</p>
    <label className="block">JSON-компендіум<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0];

 if (file) void selectFile(file); }} /></label>
    {busy && <p role="status">Обробка…</p>}
    {error && <p role="alert">{error}</p>}
    {root && <>
      <fieldset disabled={busy} className="space-y-2"><legend>Категорії · матеріали ДМ оберіть явно</legend>
        {categoryInventory(root).map(row => <label className="block" key={row.kind}><input type="checkbox" checked={categories.includes(row.kind)} disabled={!row.supported} onChange={e => { setCategories(e.target.checked ? [...categories, row.kind] : categories.filter(kind => kind !== row.kind)); invalidate(); }} /> {CATEGORY_LABELS[row.kind] ?? row.kind} ({row.count}){!row.supported && " — не підтримується; пропущено, зображення/Foundry не завантажуються"}</label>)}
      </fieldset>
      {categories.some(kind => ["bookData", "adventureData"].includes(kind)) && <details><summary>Обрати розділи матеріалів ДМ</summary>{categories.filter(kind => ["bookData", "adventureData"].includes(kind)).flatMap(kind => (root[kind] as Array<{ id?: string; name?: string; data?: Array<{ name?: string }> }>).map((book, index) => <div key={`${kind}:${index}`}><p>{book.name ?? book.id ?? kind}</p>{(book.data ?? []).map((chapter, chapterIndex) => <label className="block" key={chapterIndex}><input type="checkbox" checked={!excludedChapters.includes(`${kind}[${index}].data[${chapterIndex}]`)} disabled={busy} onChange={e => { const path = `${kind}[${index}].data[${chapterIndex}]`;

 setExcludedChapters(e.target.checked ? excludedChapters.filter(p => p !== path) : [...excludedChapters, path]); invalidate(); }} /> {chapter.name ?? `Розділ ${chapterIndex + 1}`}</label>)}</div>))}</details>}
      <details><summary>Джерела та явні зіставлення source</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(root._meta ?? {}, null, 2)}</pre>
        {categories.flatMap(kind => (Array.isArray(root[kind]) ? root[kind] as Array<{ source?: string; name?: string }> : []).map((row, index) => !row.source && <label className="block" key={`${kind}:${index}`}>{row.name ?? `${kind}[${index}]`} → source JSON id<input className="ml-2 border bg-transparent" value={options.sourceBindings?.[`${kind}[${index}]`] ?? ""} placeholder="Джерело для запису без source" onChange={e => { const bindings = { ...options.sourceBindings };

 const path = `${kind}[${index}]`;

 if (e.target.value) bindings[path] = e.target.value; else delete bindings[path];

 changeOptions({ ...options, sourceBindings: bindings }); }} /></label>))}
      </details>
      <label className="block"><input type="checkbox" checked={options.allowMixedEdition ?? false} disabled={busy} onChange={e => changeOptions({ ...options, allowMixedEdition: e.target.checked })} /> Дозволяю явне змішування classic / one (без конвертації правил)</label>
      <label className="block"><input type="checkbox" checked={!!options.rulesPatch} disabled={busy} onChange={e => changeOptions({ ...options, rulesPatch: e.target.checked ? { classes: { enabled: true } } : undefined })} /> Увімкнути класи 5e в правилах кампанії</label>
      <p>Зміни правил: {options.rulesPatch ? JSON.stringify(options.rulesPatch) : "немає"}. Інші налаштування — в редакторі правил.</p>
      <Button disabled={busy || !categories.length} onClick={() => void runPreview()}>Перевірити JSON</Button>
    </>}
    {preview && <>
      <CompendiumReport campaignId={campaignId} report={preview.report} />
      <details open><summary>Посилання, залежності й конфлікти</summary>
        {preview.graph.slice(page * 30, (page + 1) * 30).map(row => <div className="my-3 break-words" key={row.key}><strong>{row.name} · {row.kind}</strong>
          {row.summary !== undefined && <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(row.summary, null, 2)}</pre>}
          {row.refs.map(ref => <div key={ref.key}><p>Залежність: {ref.name} · {ref.source} · {ref.edition}</p><select aria-label={`Зіставлення ${ref.name}`} value="" disabled={busy} className="max-w-full bg-background" onChange={e => {
            if (!e.target.value) return;

            const [location, templateIndex, targetIndex] = e.target.value.split(":");

            const target = location === "local" ? targets.local[Number(targetIndex)] : targets.templates[Number(templateIndex)].rows[Number(targetIndex)];

            const bindings = { ...options.bindings };

 delete bindings[ref.key];

            const dependencies = (options.dependencies ?? []).filter(choice => choice.refKey !== ref.key);

            if (location === "local") bindings[ref.key] = { kind: target.kind, id: target.id };
            else { const template = targets.templates[Number(templateIndex)];

 dependencies.push({ refKey: ref.key, templateId: template.id, kind: target.kind, localId: target.id, edition: template.edition }); }

            changeOptions({ ...options, bindings, dependencies });
          }}><option value="">Оберіть запис кампанії або залежність SRD…</option>{targets.local.map((target, i) => target.kind === REF_KINDS[ref.kind] && <option key={`l${i}`} value={`local:0:${i}`}>Кампанія: {target.name}</option>)}{targets.templates.flatMap((template, ti) => template.rows.map((target, i) => target.kind === REF_KINDS[ref.kind] && <option key={`${ti}:${i}`} value={`template:${ti}:${i}`}>{template.name}: {target.name} ({template.edition})</option>))}</select></div>)}
          {row.refs.length === 0 && <p>Механічних залежностей немає</p>}
          <label className="block"><input type="checkbox" checked={options.overwriteKeys?.includes(row.key) ?? false} onChange={e => changeOptions({ ...options, overwriteKeys: e.target.checked ? [...(options.overwriteKeys ?? []), row.key] : options.overwriteKeys?.filter(key => key !== row.key) })} /> Перезаписати локальні зміни (типово зберігаються)</label>
          <button className="underline" onClick={() => { const next = { ...options, excludedKeys: [...(options.excludedKeys ?? []), row.key] };

 setOptions(next); void runPreview(next); }}>Виключити запис</button>
        </div>)}
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>Попередні залежності</button>{" · "}<button disabled={(page + 1) * 30 >= preview.graph.length} onClick={() => setPage(page + 1)}>Наступні залежності</button>
      </details>
      {!preview.report.readyToImport && <Button disabled={busy} onClick={excludeAllBlocked}>Виключити заблоковані та залежні й перевірити решту</Button>}
      <label className="block"><input type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} /> Маю право використати цей файл у цій кампанії</label>
      <p>Preview чинний 15 хвилин. Після змін кампанії або вибору потрібна нова перевірка.</p>
      <Button disabled={busy || !rights || !preview.report.readyToImport} onClick={() => void confirm()}>Імпортувати</Button>
    </>}
    {result && <><p>Імпорт збережено: {result.runId}</p><CompendiumReport key={result.runId} campaignId={campaignId} report={result} committed /></>}
    <details open><summary>Збережені звіти</summary>{runs.map(run => <button className="m-2 underline" key={run.id} onClick={() => { invalidate(); setRoot(null);

 if (run.report) setResult(run.report); else { setBusy(true); void request<{ runs: Array<{ report: Report }> }>(`${base}/reports?runId=${encodeURIComponent(run.id)}`).then(data => { if (data.runs[0]) setResult(data.runs[0].report); else setError("Звіт більше недоступний"); }).catch(() => setError("Не вдалося завантажити звіт")).finally(() => setBusy(false)); } }}>Звіт {run.id}</button>)}<button disabled={!runOffset} onClick={() => setRunOffset(Math.max(0, runOffset - 20))}>Попередні звіти</button>{" · "}<button disabled={!moreRuns} onClick={() => setRunOffset(runOffset + 20)}>Наступні звіти</button></details>
    <Button variant="outline" disabled={busy && !!input} onClick={() => { controller.current?.abort(); setBusy(false); setRoot(null); setCategories([]); setOptions({}); invalidate(); }}>Очистити файл і закрити майстер</Button>
    <a className="ml-3 underline" href={`/campaigns/${campaignId}`}>До кампанії</a>
  </div>;
}
