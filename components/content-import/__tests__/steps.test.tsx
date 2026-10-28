// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColumnsStep } from "../steps/ColumnsStep";
import { PreviewStep } from "../steps/PreviewStep";
import { ResultStep } from "../steps/ResultStep";

import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_SPECS } from "@/lib/utils/content/import";
import type { ImportReport } from "@/types/content-import";

afterEach(cleanup);

const REPORT = (n: number, dryRun: boolean): ImportReport => ({
  dryRun,
  results: Array.from({ length: n }, (_, i) => (i === 0 ? { row: 1, status: "error" as const, name: "Біс", issues: [{ field: "maxHp", level: "error" as const, message: "ХП: Очікується ціле число" }] } : { row: i + 1, status: "created" as const, name: `Юніт ${i + 1}`, issues: [] })),
  counts: { created: n - 1, updated: 0, skipped: 0, error: 1 },
});

function wizard(over: Partial<ContentImportState> = {}): ContentImportState {
  return {
    spec: IMPORT_SPECS.units,
    step: "columns",
    file: { name: "u.csv", table: { format: "csv", headers: ["Назва", "Хто"], rows: [{ Назва: "Біс", Хто: "Демони" }] } },
    mapping: { value: { Назва: null, Хто: "raceId" }, set: vi.fn(), missing: [IMPORT_SPECS.units.fields[0]] },
    ai: { available: false, busy: false, notes: [], suggest: vi.fn(async () => {}) },
    mode: { value: "create", set: vi.fn() },
    preview: null,
    result: null,
    status: { busy: false, progress: null, error: null },
    actions: { selectFile: vi.fn(), runPreview: vi.fn(), runImport: vi.fn(), back: vi.fn(), reset: vi.fn(), downloadErrors: vi.fn() },
    urls: { example: "/api/campaigns/c1/content-import/units/example.csv" },
    ...over,
  } as unknown as ContentImportState;
}

describe("ColumnsStep", () => {
  it("підсвічує незіставлені обов'язкові поля, показує приклад значення", () => {
    render(<ColumnsStep wizard={wizard()} />);

    expect(screen.getByRole("alert").textContent).toBe("Не зіставлено обов'язкові поля: Назва");
    expect(screen.getByText("Демони")).toBeTruthy();
  });

  it("попереджає, коли кілька колонок ведуть в одне поле, що не з'єднується", () => {
    const w = wizard({ mapping: { value: { Назва: "name", Хто: "maxHp", Ще: "maxHp", А: "abilities", Б: "abilities" }, set: vi.fn(), missing: [] } as unknown as ContentImportState["mapping"] });

    render(<ColumnsStep wizard={w} />);

    expect(screen.getByRole("status").textContent).toBe("Кілька колонок → одне поле, використано першу: ХП");
  });

  it("кнопка AI — лише коли ключ є", () => {
    render(<ColumnsStep wizard={wizard()} />);

    expect(screen.queryByRole("button", { name: "Підказати AI" })).toBeNull();
    cleanup();

    const w = wizard({ ai: { available: true, busy: false, notes: ["Перевірте ХП"], suggest: vi.fn(async () => {}) } });

    render(<ColumnsStep wizard={w} />);
    fireEvent.click(screen.getByRole("button", { name: "Підказати AI" }));

    expect(w.ai.suggest).toHaveBeenCalled();
    expect(screen.getByText("Перевірте ХП")).toBeTruthy();
  });
});

describe("PreviewStep", () => {
  it("лічильники, помилки рядків, перші 50 рядків, звіт помилок", () => {
    const w = wizard({ step: "preview", preview: REPORT(60, true) });

    render(<PreviewStep wizard={w} />);

    expect(screen.getByText("Буде створено: 59")).toBeTruthy();
    expect(screen.getByText("ХП: Очікується ціле число")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(51);
    expect(screen.getByText("Показано перші 50 з 60")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Завантажити звіт помилок CSV" }));

    expect(w.actions.downloadErrors).toHaveBeenCalled();
  });
});

describe("ResultStep", () => {
  it("підсумок і помилка часткового запису", () => {
    render(<ResultStep wizard={wizard({ step: "result", result: REPORT(3, false), status: { busy: false, progress: null, error: "Мережа. Записано частин: 1 з 2" } })} />);

    expect(screen.getByText("Створено: 2")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Мережа. Записано частин: 1 з 2");
  });
});
