// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render as rtlRender, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const fixture = { _meta: { sources: [{ json: "s", full: "Synthetic" }] }, spell: [{ name: "Light", source: "s" }], background: [], bookData: [{ id: "b", data: [] }] };

vi.mock("@/lib/utils/compendium-import/file", () => ({ readCompendiumFile: vi.fn(async () => fixture) }));
import { CompendiumImport } from "../CompendiumImport";

const render = (ui: ReactElement) => rtlRender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const report = { adapterVersion: "1", counts: { created: 1, updated: 0, unchanged: 0, errors: 0 }, rows: [{ canonicalKey: "k", kind: "spells", targetId: "s1", status: "create", coverage: "manual", issues: [] }], sources: [{ json: "s", full: "Synthetic" }], editionSummary: { unknown: 1 }, countsByCategory: { spell: { present: 1, mapped: 1, partial: 1, skipped: 0 } }, issueCounts: {}, omittedIssues: 0, nextActions: [{ code: "MANUAL", severity: "warning", path: "k", action: "Налаштуйте цілі" }], readyToImport: true, readyToPlay: false };

describe("CompendiumImport", () => {
 it("selects categories, previews without mutation and confirms only with rights; reloads reports", async () => {
  const calls: Array<{ url: string; body?: Record<string, unknown> }> = [];

  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });

    return new Response(JSON.stringify(url.endsWith("preview") ? { token: "signed", report, graph: [] } : url.endsWith("confirm") ? { ...report, runId: "run" } : url.includes("options") ? { local: [], templates: [] } : { runs: [{ id: "old", report: { ...report, runId: "old" } }], hasMore: false }));
  }));
  render(<CompendiumImport campaignId="c" />);
  await screen.findByText("Звіт old");
  fireEvent.change(screen.getByLabelText("JSON-компендіум"), { target: { files: [new File(["{}"], "synthetic.json")] } });
  await screen.findByLabelText("Заклинання (1)");
  expect((screen.getByLabelText("Заклинання (1)") as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText("Сторінки книг (1)") as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Перевірити JSON" }));
  await screen.findByText("Можна імпортувати");
  expect(screen.getByText("Потрібні ручні дії до гри")).toBeTruthy();
  expect(calls.filter(x => x.url.endsWith("confirm"))).toHaveLength(0);
  expect((screen.getByRole("button", { name: "Імпортувати" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByLabelText("Маю право використати цей файл у цій кампанії"));
  fireEvent.click(screen.getByRole("button", { name: "Імпортувати" }));
  await screen.findByText("Імпорт збережено: run");
  expect(calls.find(x => x.url.endsWith("confirm"))?.body).toMatchObject({ token: "signed", rightsConfirmed: true });
  expect(calls.find(x => x.url.endsWith("preview"))?.body).toMatchObject({ input: { categories: ["spell", "background"] } });
 });
 it("shows saved report on refresh without file selection", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ runs: [{ id: "old", report }], hasMore: false }))));
  render(<CompendiumImport campaignId="c" />);
  fireEvent.click(await screen.findByRole("button", { name: "Звіт old" }));
  await screen.findByText("Налаштуйте цілі");
  expect(screen.queryByRole("button", { name: "Імпортувати" })).toBeNull();
 });
 it("shows the ERROR_TEXT message for a coded preview failure", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("preview") ? new Response(JSON.stringify({ code: "PREVIEW_STALE" }), { status: 409 }) : new Response(JSON.stringify({ runs: [], hasMore: false }))));
  render(<CompendiumImport campaignId="c" />);
  fireEvent.change(screen.getByLabelText("JSON-компендіум"), { target: { files: [new File(["{}"], "synthetic.json")] } });
  fireEvent.click(await screen.findByRole("button", { name: "Перевірити JSON" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Кампанія або термін preview змінилися. Повторіть перевірку.");
 });
});
