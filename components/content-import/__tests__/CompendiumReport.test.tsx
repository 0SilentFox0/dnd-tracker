// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { CompendiumReport } from "../CompendiumReport";

import type { CompendiumReport as Report } from "@/lib/server/compendium-import/service";

afterEach(cleanup);
it("links raw source-path manual actions to the saved native editor", () => {
  const issue = { code: "MANUAL_SPELL", severity: "warning" as const, path: "spell[0]", action: "Налаштуйте механіку" };

  const report: Report = { adapterVersion: "1", counts: { created: 1, updated: 0, unchanged: 0, errors: 0 }, rows: [{ canonicalKey: "source-aware-key", kind: "spells", targetId: "s1", status: "create", coverage: "manual", issues: [issue] }], sources: [], editionSummary: {}, countsByCategory: {}, issueCounts: {}, omittedIssues: 0, nextActions: [issue], readyToImport: true, readyToPlay: false };

  render(<CompendiumReport campaignId="c" report={report} committed />);
  expect(screen.getByRole("link", { name: "Перейти до дії" }).getAttribute("href")).toBe("/campaigns/c/dm/spells/s1");
});

it("groups skipped categories into one info line and hides raw keys and source JSON", () => {
  const key = JSON.stringify([1, "feat", "obojimatallgrass", "classic", "cloud hopper", []]);

  const info = { code: "UNSUPPORTED_CATEGORY", severity: "warning" as const, path: "foundrySpell", action: "Перенесіть вручну" };

  const owned = { code: "MANUAL_FEAT", severity: "warning" as const, path: `${key}.x`, action: "Налаштуйте" };

  const report: Report = { adapterVersion: "1", counts: { created: 1, updated: 0, unchanged: 0, errors: 0 }, rows: [{ canonicalKey: key, kind: "feats", targetId: "f1", status: "create", coverage: "partial", issues: [owned] }], sources: [{ json: "obojima", full: "Obojima", _meta: { raw: true } }], editionSummary: { classic: 1 }, countsByCategory: {}, issueCounts: {}, omittedIssues: 0, nextActions: [info, owned], readyToImport: true, readyToPlay: true };

  const { container } = render(<CompendiumReport campaignId="c" report={report} />);

  expect(container.textContent).not.toContain("[1,");
  expect(container.textContent).not.toContain("_meta");
  expect(container.textContent).toContain("Риса");
  expect(container.textContent).toContain("«cloud hopper»");
  expect(container.textContent).toContain("Пропущено непідтримувані категорії: foundrySpell");
  expect(screen.queryByText(/Ручна перевірка · UNSUPPORTED_CATEGORY/)).toBeNull();
  expect(screen.getAllByText("Механіку рис налаштувати вручну")).toHaveLength(1);
});

const base = { adapterVersion: "1", counts: { created: 0, updated: 0, unchanged: 3, errors: 0 }, sources: [], editionSummary: {}, countsByCategory: {}, issueCounts: {}, omittedIssues: 0, nextActions: [], readyToImport: true, readyToPlay: true };

const row = (name: string, status: string, issues: Report["rows"][number]["issues"] = []): Report["rows"][number] => ({ canonicalKey: JSON.stringify([1, "spell", "s", "classic", name, []]), kind: "spells", targetId: name, status, coverage: "native", issues });

it("shows only created/updated/error rows by default and keeps manual-action rows in their own filter", () => {
  const manual = { code: "MANUAL_EQUIPMENT", severity: "warning" as const, path: "x", action: "Видайте" };

  const report: Report = { ...base, rows: [row("Alpha", "create"), row("Beta", "unchanged"), row("Gamma", "unchanged", [manual])] };

  render(<CompendiumReport campaignId="c" report={report} />);
  expect(screen.queryByText(/Beta/)).toBeNull();
  expect(screen.getByText(/Alpha/)).toBeTruthy();
  expect(screen.queryByText(/Gamma/)).toBeNull();
  expect(screen.getByRole("button", { name: "Змінені (1)" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "З ручними діями (1)" }));
  expect(screen.getByText(/Gamma/)).toBeTruthy();
  expect(screen.queryByText(/Alpha/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Усі (3)" }));
  expect(screen.getByText(/Beta/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /без змін — показати/ })).toBeNull();
});

it("offers to reveal hidden unchanged rows", () => {
  render(<CompendiumReport campaignId="c" report={{ ...base, rows: [row("Alpha", "create"), row("Beta", "unchanged")] }} />);
  fireEvent.click(screen.getByRole("button", { name: "1 без змін — показати" }));
  expect(screen.getByText(/Beta/)).toBeTruthy();
});

it("groups manual actions by code with one action text and lifts blockers above", () => {
  const mk = (path: string) => ({ code: "MANUAL_EQUIPMENT", severity: "warning" as const, path, action: "Видайте спорядження" });

  const blocker = { code: "UNRESOLVED_REF", severity: "error" as const, path: "spell[2]", action: "Зіставте залежність" };

  render(<CompendiumReport campaignId="c" report={{ ...base, readyToImport: false, nextActions: [mk("spell[0]"), mk("spell[1]"), blocker], rows: [] }} />);
  expect(screen.getByText("Спорядження видати вручну")).toBeTruthy();
  expect(screen.getAllByText("Видайте спорядження")).toHaveLength(1);
  expect(screen.getByRole("alert").textContent).toContain("Зіставте залежність");
  expect(screen.getByRole("alert").textContent).toContain("Заклинання №3 у файлі");
});

it("omits the blockers block and empty categories when there is nothing to show", () => {
  render(<CompendiumReport campaignId="c" report={{ ...base, rows: [], countsByCategory: { spell: { present: 0, mapped: 0, partial: 0, skipped: 0 }, feat: { present: 2, mapped: 2, partial: 0, skipped: 0 } } }} />);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Риси")).toBeTruthy();
  expect(screen.queryByText("Заклинання")).toBeNull();
});

it("starts on the manual-actions filter when nothing changed", () => {
  const manual = { code: "MANUAL", severity: "warning" as const, path: "x", action: "Зробіть" };

  render(<CompendiumReport campaignId="c" report={{ ...base, rows: [row("Beta", "unchanged"), row("Gamma", "unchanged", [manual])] }} />);
  expect(screen.getByText(/Gamma/)).toBeTruthy();
  expect(screen.queryByText(/Beta/)).toBeNull();
});

it("groups blockers by code with one explanation, five chips first and the mixed-edition action", () => {
  const key = (n: number) => JSON.stringify([1, "feat", "obojimatallgrass", "classic", `feat ${n}`, []]);

  const blockers = Array.from({ length: 8 }, (_, n) => ({ code: "MIXED_EDITION_CONFIRMATION_REQUIRED", severity: "error" as const, path: key(n), action: "Підтвердьте змішування редакцій" }));

  const allow = vi.fn();

  render(<CompendiumReport campaignId="c" report={{ ...base, readyToImport: false, nextActions: blockers, rows: [] }} blockerActions={{ allowMixedEdition: allow }} />);

  const alert = screen.getByRole("alert");

  expect(alert.textContent).toContain("Блокери (8)");
  expect(alert.textContent).toContain("8 записів");
  expect(screen.getAllByText("Підтвердьте змішування редакцій")).toHaveLength(1);
  expect(alert.querySelectorAll("li li")).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "Показати ще (3)" }));
  expect(alert.querySelectorAll("li li")).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "Дозволити змішування classic / one і перевірити знову" }));
  expect(allow).toHaveBeenCalledOnce();
});

it("collapses technical categories and aligns the main table cells", () => {
  const countsByCategory = { feat: { present: 2, mapped: 1, partial: 1, skipped: 0 }, foundryFeat: { present: 5, mapped: 0, partial: 0, skipped: 5 } };

  const { container } = render(<CompendiumReport campaignId="c" report={{ ...base, rows: [], countsByCategory }} />);

  expect(screen.getByText(/Технічні категорії \(1\)/)).toBeTruthy();
  expect(container.querySelectorAll("[role=row]")).toHaveLength(2);
  expect(screen.getByText(/Технічні категорії/).closest("details")?.textContent).toContain("foundryFeat");
});