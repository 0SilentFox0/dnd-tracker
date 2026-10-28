// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
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
