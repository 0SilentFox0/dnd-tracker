import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

import { CompendiumReport } from "@/components/content-import/CompendiumReport";
import type { CompendiumReport as Report } from "@/lib/server/compendium-import/service";
import { publicToolData } from "@/lib/utils/common/public-tool-data";
vi.mock("../repository", () => ({ kindTable: {}, prismaImportRepository: {} }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/server/templates/bundle", () => ({ BUNDLE_TABLES: [], delegateOf: vi.fn() }));
import { previewPresentation } from "../presentation";
it("exposes source-aware references and structured background coverage without descriptions", () => {
 const result = previewPresentation({ json: JSON.stringify({ background: [{ name: "Synthetic", source: "Test", entries: ["Private text"], feats: [{ "Gift|Test": true }] }] }) });

 expect(result.graph[0]).toMatchObject({ name: "Synthetic", kind: "backgrounds", summary: { equipment: "manual", currency: "manual" } });
 expect(result.graph[0].refs[0]).toMatchObject({ kind: "feat", name: "Gift" });
 expect(JSON.stringify(result.graph)).not.toContain("Private text");
});

it("renders imported HTML and unsafe source URLs as inert report text", () => {
  const attack = '<img src=x onerror="alert(1)"><script>alert(1)</script>';

  const report: Report = { adapterVersion: "1", counts: { created: 0, updated: 0, unchanged: 0, errors: 0 }, rows: [], nextActions: [{ code: "MANUAL", severity: "warning", path: attack, action: attack }], readyToImport: true, readyToPlay: false, sources: [{ full: attack, url: "javascript:alert(1)" }, { url: "data:text/html,<script>alert(1)</script>" }], editionSummary: {}, countsByCategory: {}, issueCounts: {}, omittedIssues: 0 };

  const html = renderToStaticMarkup(createElement(CompendiumReport, { campaignId: "synthetic", report }));

  expect(html).toContain("&lt;img");
  expect(html).toContain("javascript:alert(1)");
  expect(html).not.toMatch(/<script|<img|onerror="|href="(?:javascript:|data:)/i);
});

it("redacts credential-bearing URLs at the existing tool projection boundary", () => {
  const output = publicToolData({ sources: ["https://example.test/?token=private", "https://user:private@example.test/file", "https://example.test/storage/v1/object/sign/file", "https://example.test/public"] });

  expect(output).toEqual({ sources: ["[hidden link]", "[hidden link]", "[hidden link]", "https://example.test/public"] });
});
