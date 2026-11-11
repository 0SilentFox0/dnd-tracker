import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../../..");

const WFRP_ENTRY = "systems/wfrp/index.ts";

const VALUE_IMPORT = /^(?:import|export)\s+(?!type\b)(?:[^;]*?from\s+)?"([^"]+)"/gm;

function resolve(spec: string, from: string): string | null {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(path.join(ROOT, from)), spec) : null;

  if (!base) return null;

  const hit = [".ts", ".tsx", "/index.ts"].map((ext) => base + ext).find(existsSync);

  return hit ? path.relative(ROOT, hit) : null;
}

function reaches(start: string, target: string): string[] | null {
  const seen = new Set<string>();

  const walk = (file: string, trail: string[]): string[] | null => {
    for (const m of readFileSync(path.join(ROOT, file), "utf8").matchAll(VALUE_IMPORT)) {
      const next = resolve(m[1], file);

      if (!next) continue;

      if (next === target) return [...trail, next];

      if (seen.has(next)) continue;

      seen.add(next);

      const found = walk(next, [...trail, next]);

      if (found) return found;
    }

    return null;
  };

  return walk(start, [start]);
}

function reachesPackage(start: string, pkg: string): string | null {
  const seen = new Set<string>([start]);

  const queue = [start];

  while (queue.length > 0) {
    const file = queue.shift() as string;

    for (const m of readFileSync(path.join(ROOT, file), "utf8").matchAll(VALUE_IMPORT)) {
      if (m[1] === pkg) return file;

      const next = resolve(m[1], file);

      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return null;
}

describe("wfrp rule system value-import graph", () => {
  it("never leads back to its own entry (TDZ at load time)", () => {
    expect(reaches(WFRP_ENTRY, WFRP_ENTRY)).toBeNull();
  });

  it("the logic registry stays zod-free (client graph)", () => {
    expect(reachesPackage("lib/utils/rules/systems/registry.ts", "zod")).toBeNull();
  });

  it.each(["zod", "server-only", "@prisma/client"])("the UI registry and the meta root stay free of %s (client graph)", (pkg) => {
    expect(reachesPackage("components/systems/registry.ts", pkg)).toBeNull();
    expect(reachesPackage("lib/utils/rules/systems/meta.ts", pkg)).toBeNull();
  });

  it("the meta root does not reach the logic registry", () => {
    expect(reaches("lib/utils/rules/systems/meta.ts", "lib/utils/rules/systems/registry.ts")).toBeNull();
  });
});
