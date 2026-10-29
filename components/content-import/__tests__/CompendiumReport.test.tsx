// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

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
  expect(container.textContent).toContain("Риса «cloud hopper»");
  expect(container.textContent).toContain("Пропущено непідтримувані категорії: foundrySpell");
  expect(screen.queryByText(/Ручна перевірка · UNSUPPORTED_CATEGORY/)).toBeNull();
  expect(screen.getAllByText("Механіку рис налаштувати вручну")).toHaveLength(1);
});

const base = { adapterVersion: "1", counts: { created: 0, updated: 0, unchanged: 3, errors: 0 }, sources: [], editionSummary: {}, countsByCategory: {}, issueCounts: {}, omittedIssues: 0, nextActions: [], readyToImport: true, readyToPlay: true };

const row = (name: string, status: string, issues: Report["rows"][number]["issues"] = []): Report["rows"][number] => ({ canonicalKey: JSON.stringify([1, "spell", "s", "classic", name, []]), kind: "spells", targetId: name, status, coverage: "native", issues });

it("shows changed rows by default, hides unchanged behind a toggle and filters by manual actions", () => {
  const manual = { code: "MANUAL_EQUIPMENT", severity: "warning" as const, path: "x", action: "Видайте" };

  const report: Report = { ...base, rows: [row("Alpha", "create"), row("Beta", "unchanged"), row("Gamma", "unchanged", [manual])] };

  render(<CompendiumReport campaignId="c" report={report} />);
  expect(screen.queryByText(/Beta/)).toBeNull();
  expect(screen.getByText(/Alpha/)).toBeTruthy();
  expect(screen.getByText(/Gamma/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "З ручними діями (1)" }));
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
