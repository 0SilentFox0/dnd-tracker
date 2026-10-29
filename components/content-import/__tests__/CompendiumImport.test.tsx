// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

const fixture = { _meta: { sources: [{ json: "s", full: "Synthetic" }] }, spell: [{ name: "Light", source: "s" }], background: [], bookData: [{ id: "b", data: [] }] };

vi.mock("@/lib/utils/compendium-import/file", () => ({ readCompendiumFile: vi.fn(async () => fixture) }));
import { CompendiumImport } from "../CompendiumImport";

const render = (ui: ReactElement) => renderWithIntl(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>, { locale: "uk", namespaces: ["common", "validation", "compendium"] });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const report = { adapterVersion: "1", counts: { created: 1, updated: 0, unchanged: 0, errors: 0 }, rows: [{ canonicalKey: "k", kind: "spells", targetId: "s1", status: "create", coverage: "manual", issues: [] }], sources: [{ json: "s", full: "Synthetic" }], editionSummary: { unknown: 1 }, countsByCategory: { spell: { present: 1, mapped: 1, partial: 1, skipped: 0 } }, issueCounts: {}, omittedIssues: 0, nextActions: [{ code: "MANUAL", severity: "warning", path: "k", action: "Налаштуйте цілі" }], readyToImport: true, readyToPlay: false };

describe("CompendiumImport", () => {
 it("selects categories, previews without mutation and confirms only with rights; reloads reports", async () => {
  const calls: Array<{ url: string; body?: Record<string, unknown> }> = [];

  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });

    return new Response(JSON.stringify(url.endsWith("preview") ? { token: "signed", report, graph: [] } : url.endsWith("confirm") ? { ...report, runId: "run" } : url.includes("options") ? { local: [], templates: [] } : { runs: [{ id: "old", report: { ...report, runId: "old" } }], hasMore: false }));
  }));
  await render(<CompendiumImport campaignId="c" />);
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
  fireEvent.click(screen.getByLabelText("Маю право використати цей файл і його зображення в цій кампанії"));
  fireEvent.click(screen.getByRole("button", { name: "Імпортувати" }));
  await screen.findByText("Імпорт збережено: run");
  expect(calls.find(x => x.url.endsWith("confirm"))?.body).toMatchObject({ token: "signed", rightsConfirmed: true });
  expect(calls.find(x => x.url.endsWith("preview"))?.body).toMatchObject({ input: { categories: ["spell", "background"] } });
 });
 it("offers the recommended classes-mode patch after preview and re-checks with it applied", async () => {
  const bodies: Array<Record<string, unknown>> = [];

  const patch = { classes: { enabled: true } };

  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("preview")) bodies.push(JSON.parse(String(init?.body)));

    const withOffer = url.endsWith("preview") && !(bodies[bodies.length - 1].input as { rulesPatch?: unknown }).rulesPatch;

    return new Response(JSON.stringify(url.endsWith("preview") ? { token: `t${bodies.length}`, report: { ...report, ...(withOffer && { recommendedRulesPatch: patch }) }, graph: [] } : url.includes("options") ? { local: [], templates: [] } : { runs: [], hasMore: false }));
  }));
  await render(<CompendiumImport campaignId="c" />);
  fireEvent.change(screen.getByLabelText("JSON-компендіум"), { target: { files: [new File(["{}"], "synthetic.json")] } });
  await screen.findByLabelText("Заклинання (1)");
  fireEvent.click(screen.getByRole("button", { name: "Перевірити JSON" }));

  const offer = await screen.findByLabelText(/Застосувати з імпортом: увімкнути режим класів 5e/);

  expect(document.body.textContent).not.toContain('{"classes"');
  fireEvent.click(offer);
  await vi.waitFor(() => expect(bodies).toHaveLength(2));
  expect(bodies[1].input).toMatchObject({ rulesPatch: patch });
  await vi.waitFor(() => expect(screen.queryByLabelText(/Застосувати з імпортом/)).toBeNull());
 });
 it("renders inside HudPage with a header and campaign link", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ runs: [], hasMore: false }))));

  const { container } = await render(<CompendiumImport campaignId="c" />);

  expect(container.querySelector(".hud-page")).not.toBeNull();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Імпорт JSON-компендіуму");
  expect(screen.getByRole("link", { name: "До кампанії" }).getAttribute("href")).toBe("/campaigns/c");
  await screen.findByText("Збережені звіти");
 });
 it("shows saved report on refresh without file selection", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ runs: [{ id: "old", report }], hasMore: false }))));
  await render(<CompendiumImport campaignId="c" />);
  fireEvent.click(await screen.findByRole("button", { name: "Звіт old" }));
  await screen.findByText("Налаштуйте цілі");
  expect(screen.queryByRole("button", { name: "Імпортувати" })).toBeNull();
 });
 it("shows the translated message for a coded preview failure", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("preview") ? new Response(JSON.stringify({ code: "PREVIEW_STALE" }), { status: 409 }) : new Response(JSON.stringify({ runs: [], hasMore: false }))));
  await render(<CompendiumImport campaignId="c" />);
  fireEvent.change(screen.getByLabelText("JSON-компендіум"), { target: { files: [new File(["{}"], "synthetic.json")] } });
  fireEvent.click(await screen.findByRole("button", { name: "Перевірити JSON" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Кампанія або термін preview змінилися. Повторіть перевірку.");
 });
 it("groups categories, offers Усе/Нічого/Рекомендоване and shows the selection summary", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ runs: [], hasMore: false }))));
  await render(<CompendiumImport campaignId="c" />);
  fireEvent.change(screen.getByLabelText("JSON-компендіум"), { target: { files: [new File(["{}"], "synthetic.json")] } });
  await screen.findByLabelText("Заклинання (1)");
  expect(screen.getByTestId("import-summary").textContent).toBe("Обрано 2 категорій, ≈1 записів");
  fireEvent.click(screen.getByRole("button", { name: "Нічого" }));
  expect(screen.getByTestId("import-summary").textContent).toBe("Обрано 0 категорій, ≈0 записів");
  expect((screen.getByRole("button", { name: "Перевірити JSON" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Усе" }));
  expect((screen.getByLabelText("Сторінки книг (1)") as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Рекомендоване" }));
  expect((screen.getByLabelText("Сторінки книг (1)") as HTMLInputElement).checked).toBe(false);
  expect(screen.getByText("Класи та персонажі")).toBeTruthy();
  expect(screen.getByText("Матеріали ДМ")).toBeTruthy();
 });
});
