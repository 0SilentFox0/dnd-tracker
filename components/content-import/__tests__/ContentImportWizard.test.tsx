// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContentImportWizard } from "../ContentImportWizard";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { IMPORT_SPECS } from "@/lib/utils/content/import";

const state = vi.hoisted(() => ({ wizard: null as unknown }));

vi.unmock("next-intl");
vi.mock("@/lib/hooks/content-import", () => ({ useContentImport: () => state.wizard }));

const actions = { selectFile: vi.fn(), runPreview: vi.fn(), runImport: vi.fn(), back: vi.fn(), reset: vi.fn(), downloadErrors: vi.fn() };

const base = {
  spec: IMPORT_SPECS.units,
  file: { name: "u.csv", table: { format: "csv", headers: ["Назва"], rows: [{ Назва: "Біс" }] } },
  mapping: { value: { Назва: "name" }, set: vi.fn(), missing: [] },
  ai: { available: false, busy: false, notes: [], suggest: vi.fn() },
  mode: { value: "create", set: vi.fn() },
  preview: null,
  result: null,
  status: { busy: false, progress: null, error: null },
  actions,
  urls: { example: "/x.csv" },
};

const show = (over: Record<string, unknown>, locale: "uk" | "en" = "uk") => {
  state.wizard = { ...base, ...over } as unknown as ContentImportState;

  return renderWithIntl(<ContentImportWizard campaignId="c1" kind="units" open onOpenChange={vi.fn()} />, { locale, namespaces: ["common", "validation", "contentImport"] });
};

describe("ContentImportWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(cleanup);

  it("крок файлу: посилання на приклад CSV", async () => {
    await show({ step: "file", file: { name: null, table: null } });

    expect(screen.getByRole("link", { name: "Завантажити приклад CSV" }).getAttribute("href")).toBe("/x.csv");
  });

  it("English: dialog title and step hint without raw keys", async () => {
    await show({ step: "file", file: { name: null, table: null } }, "en");

    expect(screen.getByText("Import: Units")).toBeTruthy();
    expect(screen.getByText("Step 1 of 4 · file")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/contentImport\./);
  });

  it("крок колонок: «Перевірити» вимкнена без обов'язкових полів", async () => {
    await show({ step: "columns", mapping: { value: { Назва: null }, set: vi.fn(), missing: [IMPORT_SPECS.units.fields[0]] } });

    expect((screen.getByRole("button", { name: "Перевірити" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("крок перегляду: «Імпортувати N» рахує створення й оновлення", async () => {
    await show({ step: "preview", preview: { dryRun: true, results: [], counts: { created: 2, updated: 1, skipped: 4, error: 1 } } });

    fireEvent.click(screen.getByRole("button", { name: "Імпортувати 3" }));

    expect(actions.runImport).toHaveBeenCalled();
  });

  it("під час запису кнопка показує прогрес частин", async () => {
    await show({ step: "preview", preview: { dryRun: true, results: [], counts: { created: 2, updated: 0, skipped: 0, error: 0 } }, status: { busy: true, progress: { done: 1, total: 3 }, error: null } });

    expect(screen.getByRole("button", { name: "Імпорт… 1/3" })).toBeTruthy();
  });
});
