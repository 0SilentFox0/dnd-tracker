// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { CompendiumReport } from "../CompendiumReport";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { CompendiumReport as Report } from "@/lib/server/compendium-import/service";

vi.unmock("next-intl");
afterEach(cleanup);

const render = (ui: React.ReactElement, locale: "uk" | "en" = "uk") => renderWithIntl(ui, { locale, namespaces: ["common", "validation", "compendium"] });

it("links raw source-path manual actions to the saved native editor", async () => {
  const issue = { code: "MANUAL_SPELL", severity: "warning" as const, path: "spell[0]", action: "Налаштуйте механіку" };

  const report: Report = { adapterVersion: "1", counts: { created: 1, updated: 0, unchanged: 0, errors: 0 }, rows: [{ canonicalKey: "source-aware-key", kind: "spells", targetId: "s1", status: "create", coverage: "manual", issues: [issue] }], sources: [], editionSummary: {}, countsByCategory: {}, issueCounts: {}, omittedIssues: 0, nextActions: [issue], readyToImport: true, readyToPlay: false };

  await render(<CompendiumReport campaignId="c" report={report} committed />);
  expect(screen.getByRole("link", { name: "Перейти до дії" }).getAttribute("href")).toBe("/campaigns/c/dm/spells/s1");
});

it("groups skipped categories into one info line and hides raw keys and source JSON", async () => {
  const key = JSON.stringify([1, "feat", "obojimatallgrass", "classic", "cloud hopper", []]);

  const info = { code: "UNSUPPORTED_CATEGORY", severity: "warning" as const, path: "foundrySpell", action: "Перенесіть вручну" };

  const owned = { code: "MANUAL_FEAT", severity: "warning" as const, path: `${key}.x`, action: "Налаштуйте" };

  const report: Report = { adapterVersion: "1", counts: { created: 1, updated: 0, unchanged: 0, errors: 0 }, rows: [{ canonicalKey: key, kind: "feats", targetId: "f1", status: "create", coverage: "partial", issues: [owned] }], sources: [{ json: "obojima", full: "Obojima", _meta: { raw: true } }], editionSummary: { classic: 1 }, countsByCategory: {}, issueCounts: {}, omittedIssues: 0, nextActions: [info, owned], readyToImport: true, readyToPlay: true };

  const { container } = await render(<CompendiumReport campaignId="c" report={report} />);

  expect(container.textContent).not.toContain("[1,");
  expect(container.textContent).not.toContain("_meta");
  expect(container.textContent).toContain("Риса «cloud hopper»");
  expect(container.textContent).toContain("Пропущено непідтримувані категорії: foundrySpell");
  expect(screen.queryByText(/Ручна перевірка · UNSUPPORTED_CATEGORY/)).toBeNull();
  expect(screen.getAllByText(/Ручна перевірка · MANUAL_FEAT/)).toHaveLength(1);
});
