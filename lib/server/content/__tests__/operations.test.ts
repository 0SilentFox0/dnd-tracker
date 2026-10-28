import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";

const routeFile = (path: string) => `app/api/campaigns/[id]${path.replace(/\{(\w+)\}/g, "[$1]")}/route.ts`;

describe("CONTENT_OPERATIONS", () => {
  const ops = Object.entries(CONTENT_OPERATIONS);

  it("пара метод+шлях унікальна", () => {
    const pairs = ops.map(([, op]) => `${op.method} ${op.path}`);

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it.each(ops)("%s: route.ts бере опис з реєстру", (key, op) => {
    expect(readFileSync(routeFile(op.path), "utf8")).toContain(`CONTENT_OPERATIONS["${key}"]`);
  });
});
