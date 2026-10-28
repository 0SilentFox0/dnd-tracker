// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api/content-import";
import { useContentImport } from "@/lib/hooks/content-import";
import type { ImportReport } from "@/types/content-import";

vi.mock("@/lib/api/content-import", () => ({
  importContentRows: vi.fn(),
  getImportAiAvailability: vi.fn(async () => ({ available: true })),
  suggestImportMapping: vi.fn(),
  contentExampleUrl: (c: string, k: string) => `/api/campaigns/${c}/content-import/${k}/example.csv`,
}));
vi.mock("@/lib/utils/common/download-text", () => ({ downloadText: vi.fn() }));

const rep = (n: number, status: "created" | "error" = "created", dryRun = false): ImportReport => ({
  dryRun,
  results: Array.from({ length: n }, (_, i) => ({ row: i + 1, status, issues: [] })),
  counts: { created: status === "created" ? n : 0, updated: 0, skipped: 0, error: status === "error" ? n : 0 },
});

const csvFile = (rows: number, name = "u.csv") => new File([["Назва;ХП;Зайве", ...Array.from({ length: rows }, (_, i) => `Юніт ${i + 1};${i + 1};x`)].join("\n")], name);

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const invalidate = vi.spyOn(qc, "invalidateQueries");

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { invalidate, ...renderHook(() => useContentImport("c1", "units"), { wrapper }) };
}

describe("useContentImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it("CSV → автомапінг і крок колонок", async () => {
    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(1)));

    expect(result.current.step).toBe("columns");
    expect(result.current.mapping.value).toEqual({ Назва: "name", ХП: "maxHp", Зайве: null });
    expect(result.current.mapping.missing).toEqual([]);
  });

  it("XLSX — помилка з підказкою, крок не змінюється", async () => {
    const { result } = setup();

    await act(() => result.current.actions.selectFile(new File(["x"], "u.xlsx")));

    expect(result.current.step).toBe("file");
    expect(result.current.status.error).toContain("CSV (UTF-8)");
  });

  it("перевірка шле сирі клітинки з dryRun і відкриває перегляд; зміна режиму перевіряє знову", async () => {
    vi.mocked(api.importContentRows).mockResolvedValue(rep(1, "created", true));

    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(1)));
    await act(() => result.current.actions.runPreview());

    expect(api.importContentRows).toHaveBeenCalledWith("c1", "units", { rows: [{ name: "Юніт 1", maxHp: "1" }], mode: "create", dryRun: true });
    expect(result.current.step).toBe("preview");

    await act(async () => result.current.mode.set("update"));

    expect(vi.mocked(api.importContentRows).mock.calls.at(-1)?.[2]).toMatchObject({ mode: "update", dryRun: true });
    expect(result.current.mode.value).toBe("update");
  });

  it("ручний мапінг запам'ятовується для того самого набору заголовків", async () => {
    vi.mocked(api.importContentRows).mockResolvedValue(rep(1, "created", true));

    const first = setup();

    await act(() => first.result.current.actions.selectFile(csvFile(1)));
    act(() => first.result.current.mapping.set("Зайве", "immunities"));
    await act(() => first.result.current.actions.runPreview());
    first.unmount();

    const second = setup();

    await act(() => second.result.current.actions.selectFile(csvFile(2)));

    expect(second.result.current.mapping.value["Зайве"]).toBe("immunities");
  });

  it("запис частинами по 100; обрив на другій частині — підсумок записаного й помилка", async () => {
    vi.mocked(api.importContentRows).mockResolvedValueOnce(rep(100)).mockRejectedValueOnce(new Error("Мережа недоступна"));

    const { result, invalidate } = setup();

    await act(() => result.current.actions.selectFile(csvFile(150)));
    await act(() => result.current.actions.runImport());

    expect(vi.mocked(api.importContentRows).mock.calls.map((c) => c[2].rows.length)).toEqual([100, 50]);
    expect(result.current.step).toBe("result");
    expect(result.current.result?.counts.created).toBe(100);
    expect(result.current.status.error).toBe("Мережа недоступна. Записано частин: 1 з 2");
    expect(result.current.status.busy).toBe(false);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["units", "c1"] });
  });

  it("номери рядків другої частини зсуваються на розмір першої", async () => {
    vi.mocked(api.importContentRows).mockResolvedValueOnce(rep(100)).mockResolvedValueOnce(rep(1, "error"));

    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(101)));
    await act(() => result.current.actions.runImport());

    expect(result.current.result?.results.at(-1)).toMatchObject({ row: 101, status: "error" });
    expect(result.current.status.error).toBeNull();
  });

  it("AI: заповнює лише відомі колонки з ненульовим полем, ручний вибір не затирає null", async () => {
    vi.mocked(api.suggestImportMapping).mockResolvedValue({ mapping: { Назва: "name", Зайве: "morale", ХП: null, Інше: "level" }, notes: ["Порада"] });

    const { result } = setup();

    await act(() => result.current.actions.selectFile(csvFile(1)));
    await act(() => result.current.ai.suggest());

    expect(result.current.mapping.value).toEqual({ Назва: "name", ХП: "maxHp", Зайве: "morale" });
    expect(result.current.ai.notes).toEqual(["Порада"]);
    expect(vi.mocked(api.suggestImportMapping).mock.calls[0][2]).toEqual({ headers: ["Назва", "ХП", "Зайве"], sample: [{ Назва: "Юніт 1", ХП: "1", Зайве: "x" }] });
  });
});
