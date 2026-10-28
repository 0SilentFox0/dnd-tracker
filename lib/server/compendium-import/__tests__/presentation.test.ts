import { expect, it, vi } from "vitest";
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
