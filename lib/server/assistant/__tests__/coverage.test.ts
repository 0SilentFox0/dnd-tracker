import { readdirSync,readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { ASSISTANT_ROUTE_COVERAGE, auditRouteCoverage, exportedHttpMethods } from "@/lib/server/assistant/__tests__/helpers/coverage";

describe("assistant route coverage", () => {
  it("discovers explicit handlers, aliases and collection factory destructuring", () => {
    expect(exportedHttpMethods('export const { GET, POST, DELETE } = collectionRoutes(resource);')).toEqual(["DELETE", "GET", "POST"]);
    expect(exportedHttpMethods('export async function PATCH() {}\nexport const GET = operationRoute(op, run);')).toEqual(["GET", "PATCH"]);
    expect(exportedHttpMethods('export { handle as GET, mutate as POST };')).toEqual(["GET", "POST"]);
  });

  it("detects an unmapped method and duplicate ownership instead of silently accepting gaps", () => {
    const entry = { route: "campaigns/[id]", methods: ["GET"] as const, task: 7, state: "planned" as const, adapter: "campaign" };

    expect(auditRouteCoverage([{ route: "campaigns/[id]", methods: ["GET", "DELETE"] }], [entry])).toContain("unmapped: DELETE campaigns/[id]");
    expect(auditRouteCoverage([{ route: "campaigns/[id]", methods: ["GET"] }], [entry, entry])).toContain("duplicate: GET campaigns/[id]");
  });

  it("all current campaign, template and credential endpoints have an explicit owner", () => {
    function scan(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? scan(join(dir, e.name)) : e.name === "route.ts" ? [join(dir, e.name)] : []);
    }

    const routes = ["app/api/campaigns", "app/api/templates", "app/api/ai/credentials"].flatMap(scan).map((file) => ({
      route: relative("app/api", file).replace(/\/route\.ts$/, ""), methods: exportedHttpMethods(readFileSync(file, "utf8")),
    }));

    expect(auditRouteCoverage(routes, ASSISTANT_ROUTE_COVERAGE)).toEqual([]);
  });
});
